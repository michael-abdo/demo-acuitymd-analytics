# Adding a New Entity (CRUD Feature)

This guide walks you through adding a new entity to the VVG Template. We'll use "Tasks" as an example, but you can replace "Task" with any entity name (Notes, Projects, etc.).

## Overview

The template uses a 3-layer architecture:

```
Database (SQL) → Repository (data access) → Service (business logic) → API Routes (HTTP)
```

You'll create files in each layer, working from bottom to top.

---

## How Hard Is This? (TL;DR)

The security patterns work for **ANY data type**. Creating a new secure entity is:

| Task | Effort |
|------|--------|
| Security (auth, CSRF, rate limiting) | **Zero** - automatic via `withApiAuth` |
| Repository + Service + Routes | **Copy & rename** (~30 min) |
| Define your fields | **Your only real work** |

### Quick Start (5 steps)

1. Copy `documents` table → rename to `projects` (or your entity)
2. Copy `document.repository.ts` → `project.repository.ts` (find/replace)
3. Copy `document.service.ts` → `project.service.ts` (find/replace)
4. Copy `api/documents/route.ts` → `api/projects/route.ts` (find/replace)
5. Register in `withApiAuth` ServiceContainer

### The Ownership Pattern (Always the Same)

```
Database:  user_id VARCHAR(255) NOT NULL
Service:   if (entity.user_id !== userId) throw AuthorizationError
Route:     withApiAuth handles the rest
```

Every entity follows this exact pattern. The only thing that changes is your field names.

---

## Quick Checklist

- [ ] Step 1: Add database table
- [ ] Step 2: Create repository interface
- [ ] Step 3: Create repository implementation
- [ ] Step 4: Create service
- [ ] Step 5: Register service in withAuth
- [ ] Step 6: Create API routes
- [ ] Step 7: Create frontend page
- [ ] Step 8: Test everything

---

## Step 1: Add Database Table

**File:** `database/schema.sql`

Add your table definition after the existing tables:

```sql
-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Run the migration:**
```bash
npm run db:setup
```

---

## Step 2: Create Repository Interface

**File:** `src/lib/repositories/interfaces/task.repository.interface.ts` (NEW)

```typescript
/**
 * Task Repository Interface
 * Defines the data access contract for tasks
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  user_id: string;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  user_id: string;
  status?: TaskStatus;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface TaskQueryOptions {
  status?: TaskStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedTasksResult {
  tasks: TaskRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ITaskRepository {
  createTask(data: CreateTaskData): Promise<{ insertId: number }>;
  getTaskById(id: number): Promise<TaskRow | null>;
  getUserTasks(userId: string): Promise<TaskRow[]>;
  getUserTasksWithFilters(userId: string, options: TaskQueryOptions): Promise<PaginatedTasksResult>;
  updateTask(id: number, updates: UpdateTaskData): Promise<void>;
  deleteTask(id: number): Promise<void>;
}
```

---

## Step 3: Create Repository Implementation

**File:** `src/lib/repositories/task.repository.ts` (NEW)

```typescript
/**
 * Task Repository Implementation
 * Handles all database operations for tasks
 */

import { executeQuery } from '../database/connection';
import {
  ITaskRepository,
  CreateTaskData,
  UpdateTaskData,
  TaskRow,
  TaskQueryOptions,
  PaginatedTasksResult
} from './interfaces/task.repository.interface';

export class TaskRepository implements ITaskRepository {

  async createTask(data: CreateTaskData): Promise<{ insertId: number }> {
    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO tasks (title, description, user_id, status, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [data.title, data.description || null, data.user_id, data.status || 'pending']
    );
    return result;
  }

  async getTaskById(id: number): Promise<TaskRow | null> {
    const results = await executeQuery<TaskRow[]>(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  async getUserTasks(userId: string): Promise<TaskRow[]> {
    return executeQuery<TaskRow[]>(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  async getUserTasksWithFilters(
    userId: string,
    options: TaskQueryOptions
  ): Promise<PaginatedTasksResult> {
    const {
      status,
      search,
      page = 1,
      pageSize = 25,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    // Build WHERE conditions
    const conditions: string[] = ['user_id = ?'];
    const args: unknown[] = [userId];

    if (status) {
      conditions.push('status = ?');
      args.push(status);
    }

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const likeQuery = `%${search}%`;
      args.push(likeQuery, likeQuery);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Sanitize pagination
    const MAX_PAGE_SIZE = 100;
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || 25)));
    const offset = (safePage - 1) * safePageSize;

    // Sanitize sorting
    const allowedSortColumns = new Set(['created_at', 'title']);
    const orderColumn = allowedSortColumns.has(sortBy ?? '') ? sortBy : 'created_at';
    const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Execute queries
    const tasks = await executeQuery<TaskRow[]>(
      `SELECT * FROM tasks ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT ${safePageSize} OFFSET ${offset}`,
      args
    );

    const countResult = await executeQuery<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM tasks ${whereClause}`,
      args
    );

    return {
      tasks,
      total: countResult?.[0]?.total ?? 0,
      page: safePage,
      pageSize: safePageSize
    };
  }

  async updateTask(id: number, updates: UpdateTaskData): Promise<void> {
    const allowedColumns = new Set(['title', 'description', 'status']);
    const safeUpdates = Object.entries(updates).filter(([key]) => allowedColumns.has(key));

    if (safeUpdates.length === 0) {
      throw new Error(
        'No valid update fields provided.\n' +
        'Allowed fields: title, description, status'
      );
    }

    const setClause = safeUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = [...safeUpdates.map(([, value]) => value), id];

    await executeQuery(
      `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  async deleteTask(id: number): Promise<void> {
    await executeQuery('DELETE FROM tasks WHERE id = ?', [id]);
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();
```

---

## Step 4: Create Service

**File:** `src/lib/services/task.service.ts` (NEW)

```typescript
/**
 * Task Service
 * Business logic for task operations
 */

import { taskRepository, TaskRepository } from '../repositories/task.repository';
import {
  TaskRow,
  TaskQueryOptions,
  CreateTaskData,
  UpdateTaskData
} from '../repositories/interfaces/task.repository.interface';

// Response types for API
export interface TaskResponse {
  id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class TaskService {
  constructor(private repository: TaskRepository = taskRepository) {}

  async getUserTasks(userId: string, options: TaskQueryOptions = {}): Promise<TaskListResponse> {
    if (!userId?.trim()) {
      throw new Error('Valid userId is required');
    }

    const { tasks, total, page, pageSize } = await this.repository.getUserTasksWithFilters(
      userId,
      options
    );

    return {
      tasks: tasks.map(this.transformTask),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0
      }
    };
  }

  async getTaskById(id: number, userId: string): Promise<TaskResponse> {
    if (!id || id < 1) {
      throw new Error('Valid task ID is required');
    }

    const task = await this.repository.getTaskById(id);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.user_id !== userId) {
      throw new Error('Access denied');
    }

    return this.transformTask(task);
  }

  async createTask(data: CreateTaskData, userId: string): Promise<TaskResponse> {
    if (!data?.title?.trim()) {
      throw new Error(
        'Missing required field: title.\n' +
        'Example: { "title": "My Task", "description": "Optional description" }'
      );
    }

    const result = await this.repository.createTask({
      ...data,
      user_id: userId
    });

    const created = await this.repository.getTaskById(result.insertId);
    if (!created) {
      throw new Error('Failed to retrieve created task');
    }

    return this.transformTask(created);
  }

  async updateTask(id: number, updates: UpdateTaskData, userId: string): Promise<TaskResponse> {
    const existing = await this.repository.getTaskById(id);

    if (!existing) {
      throw new Error('Task not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.updateTask(id, updates);

    const updated = await this.repository.getTaskById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated task');
    }

    return this.transformTask(updated);
  }

  async deleteTask(id: number, userId: string): Promise<void> {
    const existing = await this.repository.getTaskById(id);

    if (!existing) {
      throw new Error('Task not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.deleteTask(id);
  }

  private transformTask(task: TaskRow): TaskResponse {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString()
    };
  }
}

// Export singleton instance
export const taskService = new TaskService();
```

---

## Step 5: Register Service in withAuth

**File:** `src/lib/api/with-auth.ts`

Add the task service to the ServiceContainer:

```typescript
// At the top, add import:
import { TaskService, taskService } from '@/lib/services/task.service';

// Update ServiceContainer interface (around line 22):
export interface ServiceContainer {
  documentService: IDocumentService;
  emailService: EmailService;
  taskService: TaskService;  // ADD THIS
}

// Update defaultServices (around line 107):
const defaultServices: ServiceContainer = {
  documentService,
  emailService,
  taskService,  // ADD THIS
};
```

---

## Step 6: Create API Routes

**File:** `src/app/api/tasks/route.ts` (NEW)

```typescript
export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

// GET /api/tasks - List user's tasks
export const GET = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const params = request.nextUrl.searchParams;

    const options = {
      status: params.get('status') as 'pending' | 'in_progress' | 'completed' | undefined,
      search: params.get('search') ?? undefined,
      page: Number(params.get('page')) || 1,
      pageSize: Number(params.get('pageSize')) || 25,
    };

    const result = await services.taskService.getUserTasks(userEmail, options);

    return ApiResponseUtil.success(result);
  } catch (error) {
    console.error('API Error in GET /api/tasks:', error);
    return ApiResponseUtil.error(
      { code: 'TASK_FETCH_FAILED', message: (error as Error).message },
      500
    );
  }
});

// POST /api/tasks - Create a task
export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const body = await request.json();

    const task = await services.taskService.createTask(
      { title: body.title, description: body.description, status: body.status },
      userEmail
    );

    return ApiResponseUtil.success(task, undefined, 201);
  } catch (error) {
    console.error('API Error in POST /api/tasks:', error);

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError(
        'Invalid JSON in request body. Example: {"title": "My Task"}'
      );
    }

    return ApiResponseUtil.error(
      { code: 'TASK_CREATE_FAILED', message: (error as Error).message },
      400
    );
  }
});
```

**File:** `src/app/api/tasks/[id]/route.ts` (NEW)

```typescript
export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

// Helper to extract ID from params
const extractId = async (paramsPromise?: Promise<{ id?: string }>): Promise<number | null> => {
  if (!paramsPromise) return null;
  const params = await paramsPromise;
  const parsed = Number.parseInt(params?.id ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// GET /api/tasks/:id
export const GET = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const taskId = await extractId(routeParams?.params);
    if (!taskId) {
      return ApiResponseUtil.validationError('Invalid task ID. Expected a positive integer.');
    }

    const task = await services.taskService.getTaskById(taskId, userEmail);
    return ApiResponseUtil.success(task);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'Task not found') {
      return ApiResponseUtil.notFound('Task not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this task');
    }

    return ApiResponseUtil.error({ code: 'TASK_FETCH_FAILED', message }, 500);
  }
});

// PUT /api/tasks/:id
export const PUT = withApiAuth(async (request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const taskId = await extractId(routeParams?.params);
    if (!taskId) {
      return ApiResponseUtil.validationError('Invalid task ID. Expected a positive integer.');
    }

    const body = await request.json();
    const task = await services.taskService.updateTask(
      taskId,
      { title: body.title, description: body.description, status: body.status },
      userEmail
    );

    return ApiResponseUtil.success(task);
  } catch (error) {
    const message = (error as Error).message;

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError('Invalid JSON in request body.');
    }
    if (message === 'Task not found') {
      return ApiResponseUtil.notFound('Task not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this task');
    }

    return ApiResponseUtil.error({ code: 'TASK_UPDATE_FAILED', message }, 400);
  }
});

// DELETE /api/tasks/:id
export const DELETE = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const taskId = await extractId(routeParams?.params);
    if (!taskId) {
      return ApiResponseUtil.validationError('Invalid task ID. Expected a positive integer.');
    }

    await services.taskService.deleteTask(taskId, userEmail);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'Task not found') {
      return ApiResponseUtil.notFound('Task not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this task');
    }

    return ApiResponseUtil.error({ code: 'TASK_DELETE_FAILED', message }, 500);
  }
});
```

---

## Step 7: Create Frontend Page

**File:** `src/app/tasks/page.tsx` (NEW)

See `src/app/documents/page.tsx` for a complete example. Key points:

```typescript
'use client';

import { getCsrfToken } from 'next-auth/react';

// IMPORTANT: Always include CSRF token for POST/PUT/DELETE
async function getApiHeaders(): Promise<HeadersInit> {
  const csrfToken = await getCsrfToken();
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  };
}

// Then use it in all mutation requests:
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: await getApiHeaders(),
  body: JSON.stringify({ title: 'My Task' })
});
```

---

## Step 8: Test Everything

1. **Run the dev server:**
   ```bash
   npm run dev
   ```

2. **Test the API with curl:**
   ```bash
   # Create a task (you'll need to be logged in or use test auth)
   curl -X POST http://localhost:3000/api/tasks \
     -H "Content-Type: application/json" \
     -H "x-csrf-token: YOUR_TOKEN" \
     -d '{"title": "Test Task"}'

   # List tasks
   curl http://localhost:3000/api/tasks
   ```

3. **Run security check:**
   ```bash
   npm run security:check
   ```

4. **Run lint:**
   ```bash
   npm run lint
   ```

---

## Common Issues

### "CSRF validation failed"
Make sure you include the `x-csrf-token` header. See [docs/SECURITY.md](SECURITY.md) for details.

### "Access denied"
You can only access your own tasks. The `user_id` is automatically set from your session.

### "Task not found"
The task ID doesn't exist or belongs to another user.

### Database errors
Run `npm run db:setup` to ensure your table exists.

---

---

## Advanced Patterns

Once you have basic CRUD working, you may need these advanced patterns.

### File Uploads

**Route:** `src/app/api/documents/upload/route.ts`

File uploads use `multipart/form-data` instead of JSON:

```typescript
// Frontend: Upload a file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    // SECURITY: CSRF token required, but NOT Content-Type
    // Browser sets Content-Type automatically with boundary
    'x-csrf-token': await getCsrfToken(),
  },
  body: formData,
});
```

```typescript
// Backend: Handle upload (src/app/api/yourEntity/upload/route.ts)
export const POST = withApiAuth(async (request, { userEmail }) => {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return ApiResponseUtil.validationError('No file provided', 'file');
  }

  // SECURITY: Validate file type and size
  const validation = validateFileUpload({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });

  if (!validation.isValid) {
    return ApiResponseUtil.validationError(validation.errors[0].message);
  }

  // Store file
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.upload(`${userEmail}/${file.name}`, buffer);

  return ApiResponseUtil.success({ uploaded: true }, undefined, 201);
});
```

---

### Bulk Operations

**Route:** `src/app/api/documents/bulk/route.ts`

For delete/update many at once:

```typescript
// Frontend: Bulk delete
const response = await fetch('/api/documents/bulk', {
  method: 'POST',
  headers: await getApiHeaders(),
  body: JSON.stringify({
    action: 'delete',
    ids: [1, 2, 3],
  }),
});

// Frontend: Bulk update
const response = await fetch('/api/documents/bulk', {
  method: 'POST',
  headers: await getApiHeaders(),
  body: JSON.stringify({
    action: 'update',
    ids: [1, 2, 3],
    updates: { status: 'completed' },
  }),
});
```

```typescript
// Backend: Handle bulk operations
// SECURITY: All-or-nothing authorization - if ANY id doesn't belong to user, fail entirely
async bulkDeleteDocuments(ids: number[], userId: string) {
  // 1. Validate input
  if (ids.length > 100) {
    throw new ValidationError('Cannot delete more than 100 at once');
  }

  // 2. SECURITY: Verify ALL documents belong to user
  const existingDocs = await this.repository.getDocumentsByIds(ids, userId);
  if (existingDocs.length !== ids.length) {
    // Some docs not found or not owned - reject entire operation
    throw new AuthorizationError('Some documents not found or not owned by you');
  }

  // 3. Perform bulk operation
  return await this.repository.deleteDocumentsByIds(ids, userId);
}
```

---

### Entity Relationships (Many-to-Many)

**Example:** Documents can have Tags

**Database Schema:**
```sql
-- Tags table
CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  UNIQUE KEY unique_tag_per_user (user_id, name)
);

-- Join table (many-to-many)
CREATE TABLE document_tags (
  document_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (document_id, tag_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**Routes:**
- `GET /api/tags` - List user's tags
- `POST /api/tags` - Create a tag
- `GET /api/documents/:id/tags` - Get tags for a document
- `POST /api/documents/:id/tags` - Add tag to document
- `DELETE /api/documents/:id/tags` - Remove tag from document

**Service Pattern:**
```typescript
async addTagToDocument(documentId: number, tagId: number, userId: string) {
  // SECURITY: Verify BOTH document AND tag belong to user
  const document = await documentRepository.getDocumentById(documentId);
  if (!document || document.user_id !== userId) {
    throw new AuthorizationError('Access denied to document');
  }

  const tag = await tagRepository.getTagById(tagId);
  if (!tag || tag.user_id !== userId) {
    throw new AuthorizationError('Access denied to tag');
  }

  // Both verified - create relationship
  await tagRepository.addTagToDocument(documentId, tagId);
}
```

---

### Date Range Filtering

Add date filters to your query options:

```typescript
// Repository interface
interface QueryOptions {
  // ... existing options
  createdAfter?: string;  // ISO 8601: YYYY-MM-DD
  createdBefore?: string;
}

// Repository implementation
if (createdAfter) {
  const date = new Date(createdAfter);
  if (!isNaN(date.getTime())) {
    conditions.push('created_at >= ?');
    args.push(date);
  }
}

if (createdBefore) {
  const date = new Date(createdBefore);
  if (!isNaN(date.getTime())) {
    conditions.push('created_at <= ?');
    args.push(date);
  }
}
```

**Usage:**
```
GET /api/documents?createdAfter=2024-01-01&createdBefore=2024-12-31
```

---

### Adding New Services to withApiAuth

When you create a new service, register it in the ServiceContainer:

**File:** `src/lib/api/with-auth.ts`

```typescript
// 1. Import your service
import { TaskService, taskService } from '@/lib/services/task.service';

// 2. Add to interface
export interface ServiceContainer {
  documentService: IDocumentService;
  emailService: EmailService;
  taskService: TaskService;  // NEW
}

// 3. Add to default services
const defaultServices: ServiceContainer = {
  documentService,
  emailService,
  taskService,  // NEW
};
```

Now your API routes can access it:
```typescript
export const GET = withApiAuth(async (request, { userEmail, services }) => {
  const tasks = await services.taskService.getUserTasks(userEmail);
  return ApiResponseUtil.success(tasks);
});
```

---

## Architecture Notes

### Why 3 Layers?

1. **Repository** - Only talks to the database. Easy to test with a mock database.
2. **Service** - Business rules (authorization, validation). Doesn't know about HTTP.
3. **API Route** - HTTP concerns only. Calls the service, returns JSON.

### Why Interfaces?

Interfaces define the "contract" - what methods exist and what they return. This makes it easy to:
- Swap implementations (e.g., switch from MySQL to PostgreSQL)
- Create mock implementations for testing
- Document what each layer expects

### Why `withApiAuth`?

The `withApiAuth` wrapper:
1. Verifies the user is logged in
2. Validates CSRF token
3. Injects services so you don't have to import them manually
4. Provides `userEmail` so you know who's making the request

---

## Need Help?

- Security issues: [docs/SECURITY.md](SECURITY.md)
- Setup issues: [README.md](../README.md)
- Run `npm run security:check` to validate your configuration
