/**
 * Documents CRUD Integration Test (Service Layer)
 *
 * This test exercises the DocumentService using an in-memory repository
 * so that we can validate create/list/update/delete flows without requiring
 * a live database connection.
 */

const path = require('path');
const fs = require('fs');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '../../..');
const documentServicePath = path.resolve(
  projectRoot,
  'src/lib/services/document.service.ts'
);

const moduleCache = new Map();
const moduleOverrides = new Map();

class InMemoryDocumentRepository {
  constructor() {
    this.documents = [];
    this.sequence = 1;
  }

  async createDocument(data) {
    const id = this.sequence++;
    const createdAt = new Date();
    const document = {
      id,
      filename: data.filename,
      file_path: data.file_path,
      file_size: data.file_size,
      user_id: data.user_id,
      status: data.status ?? 'uploaded',
      created_at: createdAt,
      updated_at: createdAt
    };
    this.documents.push(document);
    return { insertId: id };
  }

  async getUserDocuments(userId) {
    return this.documents.filter((doc) => doc.user_id === userId);
  }

  async getDocumentById(id) {
    return this.documents.find((doc) => doc.id === id) ?? null;
  }

  async updateDocument(id, updates) {
    const index = this.documents.findIndex((doc) => doc.id === id);
    if (index === -1) {
      return { affectedRows: 0 };
    }
    this.documents[index] = {
      ...this.documents[index],
      ...updates,
      updated_at: new Date()
    };
    return { affectedRows: 1 };
  }

  async deleteDocument(id) {
    const index = this.documents.findIndex((doc) => doc.id === id);
    if (index === -1) {
      return { affectedRows: 0 };
    }
    this.documents.splice(index, 1);
    return { affectedRows: 1 };
  }

  async getUserDocumentsWithFilters(userId, options) {
    const {
      status,
      search,
      page = 1,
      pageSize = 25,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    let filtered = this.documents.filter((doc) => doc.user_id === userId);

    if (status) {
      filtered = filtered.filter((doc) => doc.status === status);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.filename.toLowerCase().includes(term) ||
          doc.file_path.toLowerCase().includes(term)
      );
    }

    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortBy === 'filename') {
        return a.filename.localeCompare(b.filename) * sortMultiplier;
      }
      return (a.created_at.getTime() - b.created_at.getTime()) * sortMultiplier;
    });

    const total = filtered.length;
    const safePage = page > 0 ? page : 1;
    const safePageSize = pageSize > 0 ? pageSize : 25;
    const start = (safePage - 1) * safePageSize;
    const documents = filtered.slice(start, start + safePageSize);

    return {
      documents,
      total,
      page: safePage,
      pageSize: safePageSize
    };
  }
}

const overrideRepositoryExports = {
  DocumentRepository: InMemoryDocumentRepository,
  documentRepository: new InMemoryDocumentRepository()
};

const overrideRepositoryPath = path.resolve(
  projectRoot,
  'src/lib/repositories/document.repository.ts'
);
const overrideRepositoryBarePath = path.resolve(
  projectRoot,
  'src/lib/repositories/document.repository'
);
moduleOverrides.set(overrideRepositoryPath, overrideRepositoryExports);
moduleOverrides.set(overrideRepositoryBarePath, overrideRepositoryExports);

const overrideConnectionExports = {
  executeQuery: async () => {
    throw new Error('executeQuery should not be called in in-memory tests');
  },
  default: {}
};
const overrideConnectionPath = path.resolve(
  projectRoot,
  'src/lib/database/connection.ts'
);
const overrideConnectionBarePath = path.resolve(
  projectRoot,
  'src/lib/database/connection'
);
moduleOverrides.set(overrideConnectionPath, overrideConnectionExports);
moduleOverrides.set(overrideConnectionBarePath, overrideConnectionExports);

function resolveModulePath(specifier, parentDir) {
  if (specifier.startsWith('@/')) {
    return path.resolve(projectRoot, 'src', specifier.slice(2));
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return path.resolve(parentDir, specifier);
  }

  return specifier;
}

function loadTsModule(requestedPath) {
  const isExternal = !requestedPath.startsWith(projectRoot);
  if (isExternal) {
    const externalModule = require(requestedPath);
    moduleCache.set(requestedPath, { exports: externalModule });
    return externalModule;
  }

  const override = moduleOverrides.get(requestedPath);
  if (override) {
    moduleCache.set(requestedPath, { exports: override });
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
    } else {
      throw new Error(`Module not found: ${requestedPath}`);
    }
  }

  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath).exports;
  }

  if (moduleCache.has(requestedPath)) {
    return moduleCache.get(requestedPath).exports;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false
    },
    fileName: filePath
  });

  if (filePath === documentServicePath) {
    outputText = outputText
      .replace(/exports\.documentService\s*=\s*new DocumentService\([^;]*;\s*/g, '')
      .replace(/exports\.default\s*=\s*exports\.documentService;\s*/g, '');
  }

  const module = { exports: {} };
  moduleCache.set(requestedPath, module);
  moduleCache.set(filePath, module);

  const dirname = path.dirname(filePath);
  const localRequire = (specifier) => {
    const resolved = resolveModulePath(specifier, dirname);
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

async function run() {
  console.log('🧪 Running DocumentService CRUD integration test (in-memory)...');

  const { DocumentService } = loadTsModule(
    path.resolve(projectRoot, 'src/lib/services/document.service.ts')
  );
  const { ValidationError, NotFoundError } = loadTsModule(
    path.resolve(projectRoot, 'src/lib/services/errors/service-errors.ts')
  );

  const repository = new InMemoryDocumentRepository();
  const service = new DocumentService(repository);

  const userId = 'test-user@example.com';

  // CREATE
  const created = await service.createDocument(
    {
      filename: 'template.pdf',
      file_path: '/documents/template.pdf',
      file_size: 512000
    },
    userId
  );

  if (!created || !created.id) {
    throw new Error('Create document failed');
  }

  // LIST
  const listResult = await service.getUserDocuments(userId, { page: 1, pageSize: 10 });
  if (
    !Array.isArray(listResult.documents) ||
    listResult.documents.length !== 1 ||
    listResult.pagination.total !== 1
  ) {
    throw new Error('List documents returned unexpected results');
  }

  // UPDATE
  const updated = await service.updateDocument(
    created.id,
    { filename: 'template-updated.pdf', status: 'completed' },
    userId
  );

  if (updated.filename !== 'template-updated.pdf' || updated.status !== 'completed') {
    throw new Error('Update document failed');
  }

  // VALIDATION (missing fields)
  let validationErrorCaught = false;
  try {
    await service.createDocument({ filename: '', file_path: '', file_size: 0 }, userId);
  } catch (error) {
    validationErrorCaught = error instanceof ValidationError;
  }
  if (!validationErrorCaught) {
    throw new Error('Expected validation error for invalid create input');
  }

  // DELETE
  await service.deleteDocument(created.id, userId);

  let notFoundThrown = false;
  try {
    await service.getDocumentById(created.id, userId);
  } catch (error) {
    notFoundThrown = error instanceof NotFoundError;
  }

  if (!notFoundThrown) {
    throw new Error('Expected not found error after deletion');
  }

  console.log('✅ DocumentService CRUD integration test passed');
}

if (require.main === module) {
  run().catch((error) => {
    console.error('❌ DocumentService CRUD integration test failed');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { run };
