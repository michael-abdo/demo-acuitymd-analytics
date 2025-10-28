const path = require('path');
const fs = require('fs');
const ts = require('typescript');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '../../..');
const moduleCache = new Map();

function loadTsModule(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);

  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath);
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: absolutePath,
  });

  const module = { exports: {} };
  const fn = new Function('require', 'module', 'exports', transpiled.outputText);

  fn((specifier) => {
    if (specifier.startsWith('@/')) {
      const [, ...segments] = specifier.split('/');
      return loadTsModule(path.join('src', ...segments));
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolved = path.resolve(path.dirname(absolutePath), specifier);
      if (fs.existsSync(resolved)) {
        return loadTsModule(path.relative(projectRoot, resolved));
      }
      if (fs.existsSync(`${resolved}.ts`)) {
        return loadTsModule(path.relative(projectRoot, `${resolved}.ts`));
      }
    }

    return require(specifier);
  }, module, module.exports);

  moduleCache.set(absolutePath, module.exports);
  return module.exports;
}

(async function run() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  Skipping DB queue integration test - DATABASE_URL not set');
    return;
  }

  if (!process.env.QUEUE_RETRY_DELAY_SECONDS) {
    process.env.QUEUE_RETRY_DELAY_SECONDS = '0';
  }

  const { executeQuery } = loadTsModule('src/lib/database/connection.ts');
  const { queueJobRepository } = loadTsModule('src/lib/repositories/job.repository.ts');
  const { jobService } = loadTsModule('src/lib/services/job.service.ts');

  await executeQuery('DELETE FROM queue_jobs');

  // Happy path: job completes
  let completedPayload = null;
  jobService.registerHandler('integration-complete', async (job) => {
    completedPayload = job.payload;
  });

  const jobId = await queueJobRepository.enqueueJob({
    jobType: 'integration-complete',
    payload: { hello: 'world' },
  });

  const result = await jobService.processNext();
  assert.ok(result.processed, 'Expected job to be processed');
  assert.ok(!result.failed, 'Job should complete successfully');
  assert.deepStrictEqual(completedPayload, { hello: 'world' }, 'Handler should receive payload');

  const completedRow = await executeQuery(
    'SELECT status, attempts FROM queue_jobs WHERE id = ?',
    [jobId]
  );
  assert.strictEqual(completedRow[0].status, 'completed', 'Job status should be completed');
  assert.strictEqual(Number(completedRow[0].attempts), 1, 'Attempts should increment to 1');

  // Retry logic: fails once, succeeds on second attempt
  let retryAttempts = 0;
  jobService.registerHandler('integration-retry', async () => {
    retryAttempts += 1;
    if (retryAttempts === 1) {
      throw new Error('first attempt fails');
    }
  });

  const retryJobId = await queueJobRepository.enqueueJob({
    jobType: 'integration-retry',
    payload: {},
    maxAttempts: 3,
  });

  const firstAttempt = await jobService.processNext();
  assert.ok(firstAttempt.processed, 'Job should be claimed for processing');
  assert.ok(firstAttempt.failed, 'First attempt should fail');
  assert.strictEqual(retryAttempts, 1, 'Handler should run once');

  const secondAttempt = await jobService.processNext();
  assert.ok(secondAttempt.processed, 'Job should process again after retry');
  assert.strictEqual(retryAttempts, 2, 'Handler should run twice');

  const retryRow = await executeQuery(
    'SELECT status, attempts FROM queue_jobs WHERE id = ?',
    [retryJobId]
  );
  assert.strictEqual(retryRow[0].status, 'completed', 'Retry job should eventually complete');
  assert.strictEqual(Number(retryRow[0].attempts), 2, 'Attempts should reflect retries');

  // Final failure: max attempts reached
  jobService.registerHandler('integration-fail', async () => {
    throw new Error('always fails');
  });

  const failingJobId = await queueJobRepository.enqueueJob({
    jobType: 'integration-fail',
    payload: {},
    maxAttempts: 1,
  });

  const failAttempt = await jobService.processNext();
  assert.ok(failAttempt.processed, 'Failing job should be processed');
  assert.ok(failAttempt.failed, 'Failing job should be marked as failed');
  assert.ok(failAttempt.finalFailure, 'Failing job should reach final failure');

  const failedRow = await executeQuery(
    'SELECT status, attempts, last_error FROM queue_jobs WHERE id = ?',
    [failingJobId]
  );
  assert.strictEqual(failedRow[0].status, 'failed', 'Job should be marked failed');
  assert.strictEqual(Number(failedRow[0].attempts), 1, 'Attempts should equal max attempts');
  assert.ok(
    (failedRow[0].last_error || '').includes('always fails'),
    'Last error should capture failure message'
  );

  console.log('✅ DB queue integration tests passed');
})().catch((error) => {
  console.error('❌ DB queue integration test failed');
  console.error(error);
  process.exit(1);
});
