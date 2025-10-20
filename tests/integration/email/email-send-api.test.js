const path = require('path');
const fs = require('fs');
const ts = require('typescript');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '../../..');
const moduleCache = new Map();
const moduleOverrides = new Map();

function registerOverride(relativePath, exports) {
  const fullPath = path.resolve(projectRoot, relativePath);
  moduleOverrides.set(fullPath, exports);
  const withoutExt = fullPath.replace(/\.(ts|tsx)$/, '');
  moduleOverrides.set(withoutExt, exports);
}

function resolveModulePath(specifier, parentDir) {
  if (specifier.startsWith('@/')) {
    return path.resolve(projectRoot, 'src', specifier.slice(2));
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return path.resolve(parentDir, specifier);
  }
  return specifier;
}

function getOverride(resolvedPath) {
  if (moduleOverrides.has(resolvedPath)) {
    return moduleOverrides.get(resolvedPath);
  }
  if (!resolvedPath.endsWith('.ts') && moduleOverrides.has(`${resolvedPath}.ts`)) {
    return moduleOverrides.get(`${resolvedPath}.ts`);
  }
  if (!resolvedPath.endsWith('.tsx') && moduleOverrides.has(`${resolvedPath}.tsx`)) {
    return moduleOverrides.get(`${resolvedPath}.tsx`);
  }
  return null;
}

function loadTsModule(requestedPath) {
  const override = getOverride(requestedPath);
  if (override) {
    return override;
  }

  let filePath = requestedPath;
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(`${requestedPath}.ts`)) {
      filePath = `${requestedPath}.ts`;
    } else if (fs.existsSync(`${requestedPath}.tsx`)) {
      filePath = `${requestedPath}.tsx`;
    } else if (fs.existsSync(path.join(requestedPath, 'index.ts'))) {
      filePath = path.join(requestedPath, 'index.ts');
    } else if (fs.existsSync(path.join(requestedPath, 'index.tsx'))) {
      filePath = path.join(requestedPath, 'index.tsx');
    } else {
      return require(requestedPath);
    }
  }

  const cached = moduleCache.get(filePath);
  if (cached) {
    return cached.exports;
  }

  const fileOverride = getOverride(filePath);
  if (fileOverride) {
    return fileOverride;
  }

  if (fs.statSync(filePath).isDirectory()) {
    const indexTs = path.join(filePath, 'index.ts');
    const indexTsx = path.join(filePath, 'index.tsx');
    if (fs.existsSync(indexTs)) {
      return loadTsModule(indexTs);
    }
    if (fs.existsSync(indexTsx)) {
      return loadTsModule(indexTsx);
    }
    return require(filePath);
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  moduleCache.set(filePath, module);

  const dirname = path.dirname(filePath);
  const localRequire = (specifier) => {
    const resolved = resolveModulePath(specifier, dirname);
    const overrideModule = getOverride(resolved);
    if (overrideModule) {
      return overrideModule;
    }
    if (resolved.startsWith(projectRoot)) {
      return loadTsModule(resolved);
    }
    return require(resolved);
  };

  const wrapped = new Function(
    'require',
    'module',
    'exports',
    '__filename',
    '__dirname',
    outputText
  );
  wrapped(localRequire, module, module.exports, filePath, dirname);
  return module.exports;
}

// ---------------------------------------------------------------------------
// Stub configuration
// ---------------------------------------------------------------------------

process.env.ENABLE_EMAIL = 'true';
process.env.ENABLE_EMAIL_IN_DEV = 'true';
process.env.SES_FROM_EMAIL = 'noreply@example.com';
process.env.AWS_SES_SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
process.env.AWS_SES_SMTP_USERNAME = 'stub-user';
process.env.AWS_SES_SMTP_PASSWORD = 'stub-pass';

const sessionStub = {
  user: {
    email: 'tester@example.com',
    name: 'Template Tester',
  },
};

registerOverride('src/lib/auth/session-validator.ts', {
  requireAuth: async () => sessionStub,
  validateSession: () => true,
});

const documentServiceStub = {
  getUserDocuments: async () => ({
    documents: [
      {
        id: 42,
        filename: 'sample-document.pdf',
        file_path: '/documents/sample-document.pdf',
        file_size: 1024,
        user_id: 'owner@example.com',
        status: 'completed',
        created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
        updated_at: new Date('2024-01-01T00:00:00Z').toISOString(),
        formatted_size: '1 KB',
        download_url: '/api/documents/42/download',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    },
  }),
};

registerOverride('src/lib/services/document.service.simple.ts', {
  SimpleDocumentService: class {},
  simpleDocumentService: documentServiceStub,
});

const emailServiceStub = {
  async sendEmail() {
    throw new Error('sendEmail stub not configured');
  },
};

class EmailFeatureDisabledError extends Error {}
class EmailTransportUnavailableError extends Error {}
class EmailRecipientError extends Error {}

registerOverride('src/lib/services/email.service.ts', {
  EmailService: class {},
  emailService: emailServiceStub,
  EmailFeatureDisabledError,
  EmailTransportUnavailableError,
  EmailRecipientError,
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const { POST } = loadTsModule(
  path.resolve(projectRoot, 'src/app/api/email/send/route.ts')
);

async function executePost(body) {
  const request = new Request('http://localhost/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const response = await POST(request);
  const json = await response.json();
  return { status: response.status, body: json };
}

async function runSuccessScenario() {
  let capturedPayload = null;
  emailServiceStub.sendEmail = async (payload) => {
    capturedPayload = payload;
    return {
      success: true,
      messageId: 'MSG-123',
      accepted: ['recipient@example.com'],
      rejected: [],
      envelope: { from: 'noreply@example.com' },
      previewUrl: 'https://email-preview.local/MSG-123',
    };
  };

  const { status, body } = await executePost({
    recipients: [{ email: 'recipient@example.com' }],
    documentIds: [42],
    message: 'Document review is complete.',
    subject: 'Document Notification',
    includeAdmin: false,
    includeTestRecipient: false,
  });

  assert.strictEqual(status, 202, 'Expected 202 Accepted for successful email send');
  assert.strictEqual(body.success, true, 'Response should indicate success');
  assert.strictEqual(body.data.messageId, 'MSG-123', 'Response should include message id');
  assert.ok(Array.isArray(body.data.accepted), 'Response should include accepted list');
  assert.ok(capturedPayload, 'Email payload should be captured');
  assert.strictEqual(
    capturedPayload.actor.email,
    'tester@example.com',
    'Actor email should match authenticated user'
  );
  assert.strictEqual(
    capturedPayload.documents?.[0]?.id,
    42,
    'Document context should include selected document id'
  );
  console.log('✅ /api/email/send success scenario verified');
}

async function runTransportFailureScenario() {
  emailServiceStub.sendEmail = async () => {
    throw new EmailTransportUnavailableError('SMTP transport unavailable');
  };

  const { status, body } = await executePost({
    recipients: [{ email: 'recipient@example.com' }],
    message: 'Test failure scenario',
  });

  assert.strictEqual(status, 503, 'Expected 503 when transport is unavailable');
  assert.strictEqual(body.success, false, 'Response should indicate failure');
  assert.strictEqual(
    body.error.code,
    'EMAIL_TRANSPORT_UNAVAILABLE',
    'Error code should reflect transport failure'
  );
  console.log('✅ /api/email/send transport failure scenario verified');
}

(async function main() {
  try {
    await runSuccessScenario();
    await runTransportFailureScenario();
    console.log('🎉 Email send API integration tests completed successfully.');
  } catch (error) {
    console.error('❌ Email send API integration test failed');
    console.error(error);
    process.exit(1);
  }
})();
