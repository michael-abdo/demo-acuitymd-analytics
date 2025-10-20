const path = require('path');
const fs = require('fs');
const ts = require('typescript');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '../../..');
const moduleCache = new Map();

function loadTypeScriptModule(relativePath) {
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
      jsx: ts.JsxEmit.React,
    },
    fileName: absolutePath,
  });

  const module = { exports: {} };
  const fn = new Function('require', 'module', 'exports', transpiled.outputText);
  fn((id) => {
    if (id.startsWith('@/')) {
      const [, ...segments] = id.split('/');
      const potentialPath = path.resolve(projectRoot, 'src', ...segments);
      if (fs.existsSync(`${potentialPath}.ts`)) {
        return loadTypeScriptModule(path.relative(projectRoot, `${potentialPath}.ts`));
      }
      if (fs.existsSync(`${potentialPath}.tsx`)) {
        return loadTypeScriptModule(path.relative(projectRoot, `${potentialPath}.tsx`));
      }
      return require(potentialPath);
    }
    if (id.startsWith('./') || id.startsWith('../')) {
      const resolved = path.resolve(path.dirname(absolutePath), id);
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          const indexTs = path.join(resolved, 'index.ts');
          const indexTsx = path.join(resolved, 'index.tsx');
          if (fs.existsSync(indexTs)) {
            return loadTypeScriptModule(path.relative(projectRoot, indexTs));
          }
          if (fs.existsSync(indexTsx)) {
            return loadTypeScriptModule(path.relative(projectRoot, indexTsx));
          }
          return require(resolved);
        }
        return require(resolved);
      }
      if (fs.existsSync(`${resolved}.ts`)) {
        return loadTypeScriptModule(path.relative(projectRoot, `${resolved}.ts`));
      }
      if (fs.existsSync(`${resolved}.tsx`)) {
        return loadTypeScriptModule(path.relative(projectRoot, `${resolved}.tsx`));
      }
    }
    return require(id);
  }, module, module.exports);

  moduleCache.set(absolutePath, module.exports);
  return module.exports;
}

(async function run() {
  process.env.ENABLE_EMAIL = 'true';
  process.env.ENABLE_EMAIL_IN_DEV = 'true';
  process.env.NODE_ENV = 'development';
  process.env.SES_FROM_EMAIL = 'noreply@example.com';
  process.env.AWS_SES_SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
  process.env.AWS_SES_SMTP_USERNAME = 'fake-user';
  process.env.AWS_SES_SMTP_PASSWORD = 'fake-pass';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.SES_TEST_RECIPIENT = 'test@example.com';

  const { EmailRoutingService } = loadTypeScriptModule('src/lib/email/routing-service.ts');
  const service = new EmailRoutingService();

  const result = service.resolveRecipients({
    actorEmail: 'owner@example.com',
    currentUserRecipient: { email: 'owner@example.com', name: 'Owner' },
    requestedRecipients: [
      { email: 'reviewer@example.com', reason: 'Document reviewer' },
      { email: 'owner@example.com' },
    ],
    includeAdmin: true,
    includeTest: true,
  });

  assert.ok(result.all.some((recipient) => recipient.email === 'owner@example.com'));
  assert.ok(result.all.some((recipient) => recipient.email === 'admin@example.com'));
  assert.ok(result.all.some((recipient) => recipient.email === 'test@example.com'));
  assert.strictEqual(result.all.length, new Set(result.all.map((r) => r.email)).size);

  console.log('✅ Email routing resolves recipients with admin/test fallbacks.');
})();
