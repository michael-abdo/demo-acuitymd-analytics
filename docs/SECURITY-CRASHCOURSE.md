# Security Crash Course for Beginners

This guide explains **why** security matters and **what attacks look like**. If you understand these concepts, you'll never accidentally create a vulnerability.

---

## Table of Contents

1. [The 3 Attacks You Must Prevent](#the-3-attacks-you-must-prevent)
2. [Attack #1: CSRF (Cross-Site Request Forgery)](#attack-1-csrf-cross-site-request-forgery)
3. [Attack #2: SQL Injection](#attack-2-sql-injection)
4. [Attack #3: Authorization Bypass](#attack-3-authorization-bypass)
5. [Common Mistakes (WRONG vs RIGHT)](#common-mistakes-wrong-vs-right)
6. [Security Testing Checklist](#security-testing-checklist)
7. [Quick Reference Card](#quick-reference-card)

---

## The 3 Attacks You Must Prevent

Every web app must defend against these three attacks. Our template handles all of them automatically, but you need to understand them to avoid accidentally breaking the protection.

| Attack | What It Does | Our Protection |
|--------|--------------|----------------|
| **CSRF** | Tricks your browser into making requests you didn't intend | `x-csrf-token` header |
| **SQL Injection** | Tricks the database into running malicious commands | Prepared statements (`?` placeholders) |
| **Authorization Bypass** | Access data belonging to other users | `user_id` ownership checks |

---

## Attack #1: CSRF (Cross-Site Request Forgery)

### What Is It?

CSRF tricks your browser into making a request to a site where you're logged in, without your knowledge.

### The Attack (Step by Step)

```
1. You're logged into your-app.com (your session cookie is stored)

2. You visit evil-site.com (maybe clicked a link in an email)

3. Evil site has hidden code:
   <img src="https://your-app.com/api/documents/123" hidden>
   <form action="https://your-app.com/api/documents" method="POST">
     <input name="action" value="delete-all">
   </form>
   <script>document.forms[0].submit()</script>

4. Your browser automatically sends your session cookie with the request

5. WITHOUT CSRF PROTECTION: Server thinks it's a legitimate request from you
   → Your documents get deleted!

6. WITH CSRF PROTECTION: Server checks for x-csrf-token header
   → Evil site can't get this token (same-origin policy)
   → Request fails with 403 Forbidden
   → You are protected!
```

### Visual: CSRF Attack Flow

```
  YOU (logged in)              EVIL SITE                    YOUR APP
       |                           |                            |
       |   Visit evil-site.com     |                            |
       |-------------------------->|                            |
       |                           |                            |
       |   Evil page loads with    |                            |
       |   hidden form targeting   |                            |
       |   your-app.com            |                            |
       |                           |                            |
       |   Browser auto-submits    |    POST /api/documents     |
       |   form with YOUR cookies  |--------------------------->|
       |                           |                            |
       |                           |    WITHOUT CSRF: Success!  |
       |                           |    (Data deleted)          |
       |                           |                            |
       |                           |    WITH CSRF: 403 Forbidden|
       |                           |    (No valid token)        |
```

### How Our Code Protects You

**In `src/lib/api/with-auth.ts`:**
```typescript
// Server checks for CSRF token on every mutation
const csrfToken = request.headers.get('x-csrf-token');
if (!csrfToken || !validateCsrfToken(csrfToken)) {
  return ApiResponseUtil.forbidden('CSRF validation failed');
}
```

**In your frontend:**
```typescript
// You must include the token (evil sites can't get it)
const response = await fetch('/api/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': await getCsrfToken(),  // THIS IS THE KEY
  },
  body: JSON.stringify(data),
});
```

---

## Attack #2: SQL Injection

### What Is It?

SQL Injection tricks your database into running commands the attacker wants, instead of your intended query.

### The Attack (Step by Step)

```
1. Your app has a search feature:
   GET /api/documents?search=report

2. VULNERABLE code builds SQL by concatenation:
   const query = `SELECT * FROM documents WHERE filename LIKE '%${search}%'`;
   // With search="report", this becomes:
   // SELECT * FROM documents WHERE filename LIKE '%report%'
   // This works fine...

3. Attacker sends malicious input:
   GET /api/documents?search=' OR '1'='1' --

4. VULNERABLE code becomes:
   SELECT * FROM documents WHERE filename LIKE '%' OR '1'='1' -- %'

   Breaking this down:
   - '%' OR '1'='1'  → This is ALWAYS true
   - --              → This comments out the rest

   Result: Returns ALL documents from ALL users!

5. Even worse attack:
   GET /api/documents?search='; DROP TABLE documents; --

   Could delete your entire database!
```

### Visual: SQL Injection

```
  NORMAL INPUT                      MALICIOUS INPUT
  search = "report"                 search = "' OR '1'='1' --"
       |                                  |
       v                                  v
  ┌─────────────────────┐          ┌─────────────────────────────────┐
  │ SELECT * FROM docs  │          │ SELECT * FROM docs              │
  │ WHERE filename      │          │ WHERE filename LIKE '%'         │
  │ LIKE '%report%'     │          │ OR '1'='1' -- %'                │
  └─────────────────────┘          └─────────────────────────────────┘
       |                                  |
       v                                  v
  Returns: User's docs             Returns: ALL docs (every user!)
  that match "report"              '1'='1' is always true!
```

### How Our Code Protects You

**WRONG - Vulnerable to SQL Injection:**
```typescript
// NEVER DO THIS - String concatenation
const query = `SELECT * FROM documents WHERE id = ${id}`;
const query = `SELECT * FROM documents WHERE filename LIKE '%${search}%'`;
```

**RIGHT - Our code uses prepared statements:**
```typescript
// ALWAYS DO THIS - Parameterized queries
const results = await executeQuery(
  'SELECT * FROM documents WHERE id = ?',
  [id]  // Parameters are safely escaped
);

const results = await executeQuery(
  'SELECT * FROM documents WHERE filename LIKE ?',
  [`%${search}%`]  // Still safe - the ? is the key
);
```

**Why `?` placeholders are safe:**
- The database treats parameters as DATA, not as SQL commands
- Special characters like `'` and `--` are automatically escaped
- The attacker's input can never "break out" of the parameter

---

## Attack #3: Authorization Bypass

### What Is It?

Authorization Bypass happens when a user can access data they shouldn't have permission to see or modify.

### The Attack (Step by Step)

```
1. User A creates a document (id=100, user_id="userA@email.com")
2. User B logs in and sees their documents at /api/documents
3. User B notices the URL pattern and tries:
   GET /api/documents/100

4. VULNERABLE code (no ownership check):
   async getDocument(id: number) {
     return this.repository.getDocumentById(id);  // No user check!
   }
   → User B reads User A's private document!

5. Even worse:
   DELETE /api/documents/100
   → User B deletes User A's document!
```

### Visual: Authorization Bypass

```
  USER A's DATA                    USER B (attacker)
  ┌──────────────────┐                   |
  │ Document #100    │                   |
  │ user_id: "userA" │                   |
  │ content: SECRET  │                   |
  └──────────────────┘                   |
                                         |
         WITHOUT AUTH CHECK:             |
         GET /api/documents/100  ←───────┘
         Returns User A's data!

         WITH AUTH CHECK:
         GET /api/documents/100  ←───────┘
         → Checks: doc.user_id !== "userB"
         → Returns: 403 Forbidden
```

### How Our Code Protects You

**WRONG - No ownership check:**
```typescript
async getDocument(id: number) {
  // VULNERABLE: Anyone can read any document!
  const doc = await this.repository.getDocumentById(id);
  return doc;
}
```

**RIGHT - Our code always checks ownership:**
```typescript
async getDocument(id: number, userId: string) {
  const doc = await this.repository.getDocumentById(id);

  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  // THE KEY LINE - Authorization check
  if (doc.user_id !== userId) {
    throw new AuthorizationError('Access denied');
  }

  return doc;
}
```

**The Pattern (memorize this):**
```typescript
// 1. Fetch the resource
const resource = await repository.getById(id);

// 2. Check it exists
if (!resource) throw new NotFoundError();

// 3. Check ownership (THE SECURITY LINE)
if (resource.user_id !== userId) throw new AuthorizationError();

// 4. Now safe to return/modify
return resource;
```

---

## Common Mistakes (WRONG vs RIGHT)

### Mistake #1: Forgetting CSRF Token

```typescript
// WRONG - Will get 403 Forbidden
const response = await fetch('/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// RIGHT - Include CSRF token
const response = await fetch('/api/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': await getCsrfToken(),  // ADD THIS
  },
  body: JSON.stringify(data),
});
```

### Mistake #2: String Concatenation in SQL

```typescript
// WRONG - SQL Injection vulnerability
const query = `SELECT * FROM users WHERE email = '${email}'`;
await executeQuery(query);

// RIGHT - Prepared statement
await executeQuery(
  'SELECT * FROM users WHERE email = ?',
  [email]
);
```

### Mistake #3: Forgetting Ownership Check

```typescript
// WRONG - Authorization bypass
async deleteDocument(id: number) {
  await this.repository.deleteDocument(id);  // Anyone can delete anything!
}

// RIGHT - Check ownership first
async deleteDocument(id: number, userId: string) {
  const doc = await this.repository.getDocumentById(id);
  if (!doc) throw new NotFoundError();
  if (doc.user_id !== userId) throw new AuthorizationError();  // ADD THIS
  await this.repository.deleteDocument(id);
}
```

### Mistake #4: Validating Only on Frontend

```typescript
// WRONG - Frontend validation only (can be bypassed with curl)
// Frontend: if (file.size > 10MB) showError();
// Backend: just saves the file

// RIGHT - Always validate on server
export const POST = withApiAuth(async (request, { userEmail }) => {
  const file = formData.get('file');

  // Server-side validation (can't be bypassed)
  if (file.size > 10 * 1024 * 1024) {
    return ApiResponseUtil.validationError('File too large (max 10MB)');
  }

  // Now safe to process
});
```

### Mistake #5: Exposing Sensitive Data in Errors

```typescript
// WRONG - Leaks database structure
catch (error) {
  return Response.json({
    error: error.message,  // "Column 'password_hash' doesn't exist"
    stack: error.stack     // Full stack trace with file paths
  });
}

// RIGHT - Generic error, log details server-side
catch (error) {
  console.error('Database error:', error);  // Logged, not exposed
  return ApiResponseUtil.internalError('An error occurred');
}
```

### Mistake #6: Trusting URL Parameters for Sorting

```typescript
// WRONG - SQL Injection via ORDER BY
const sortBy = request.query.sortBy;  // User sends: "id; DROP TABLE users"
const query = `SELECT * FROM documents ORDER BY ${sortBy}`;

// RIGHT - Whitelist allowed values
const ALLOWED_SORT = new Set(['created_at', 'filename']);
const sortBy = ALLOWED_SORT.has(params.sortBy) ? params.sortBy : 'created_at';
const query = `SELECT * FROM documents ORDER BY ${sortBy}`;  // Safe now
```

### Mistake #7: Using Development Bypasses in Production

```bash
# WRONG - .env.production
DISABLE_CSRF=true           # NEVER in production!
DISABLE_MIDDLEWARE=true     # NEVER in production!
TEST_AUTH_SECRET=anything   # NEVER in production!

# RIGHT - .env.production
# These variables should NOT EXIST in production
# Or explicitly set to false:
DISABLE_CSRF=false
```

### Mistake #8: Weak Secrets

```bash
# WRONG
NEXTAUTH_SECRET=secret
NEXTAUTH_SECRET=12345678
NEXTAUTH_SECRET=my-app-secret

# RIGHT - Generate with:
# openssl rand -base64 32
NEXTAUTH_SECRET=K7gN3xR9mP2qL5vB8wY1zA4cF6hJ0tD3nS7uE9iO2pM=
```

---

## Security Testing Checklist

Before deploying any new feature, verify each item:

### Authentication
- [ ] Route is wrapped in `withApiAuth`?
- [ ] Unauthenticated request returns 401?
- [ ] Test: `curl /api/your-endpoint` without auth → 401

### CSRF Protection
- [ ] POST/PUT/DELETE requests require CSRF token?
- [ ] Frontend includes `x-csrf-token` header?
- [ ] Test: Request without token → 403
- [ ] Test: Request with invalid token → 403

### Authorization (Ownership)
- [ ] Every service method checks `user_id`?
- [ ] Test: Access another user's resource → 403
- [ ] Test: Modify another user's resource → 403
- [ ] Test: Delete another user's resource → 403

### SQL Injection Prevention
- [ ] All queries use `?` placeholders?
- [ ] No string concatenation in SQL?
- [ ] Test: Send `' OR '1'='1` in search → No extra data returned

### Input Validation
- [ ] Numeric IDs validated as positive integers?
- [ ] String lengths have limits?
- [ ] File uploads validated (type, size)?
- [ ] Test: Invalid input → 400 (not 500)

### Rate Limiting
- [ ] Rate limiting enabled?
- [ ] Test: 100+ rapid requests → 429 on excess

### Error Handling
- [ ] Errors don't expose database details?
- [ ] Stack traces not sent to client?
- [ ] Test: Cause an error → Generic message only

### Production Environment
- [ ] `npm run security:check` passes?
- [ ] No `DISABLE_*` flags in production?
- [ ] `NEXTAUTH_SECRET` is 32+ random characters?
- [ ] HTTPS enabled?

---

## Quick Reference Card

Print this and keep it visible while coding:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY QUICK REFERENCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CSRF PROTECTION                                                │
│  ────────────────                                               │
│  Frontend: headers: { 'x-csrf-token': await getCsrfToken() }    │
│  Backend:  withApiAuth handles it automatically                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SQL INJECTION PREVENTION                                       │
│  ────────────────────────                                       │
│  NEVER:  `SELECT * FROM x WHERE id = ${id}`                     │
│  ALWAYS: executeQuery('SELECT * FROM x WHERE id = ?', [id])     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUTHORIZATION (every service method)                           │
│  ────────────────────────────────────                           │
│  1. const item = await repo.getById(id);                        │
│  2. if (!item) throw NotFoundError;                             │
│  3. if (item.user_id !== userId) throw AuthorizationError; ←KEY │
│  4. // Now safe to proceed                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT VALIDATION                                               │
│  ────────────────                                               │
│  - Validate on SERVER (frontend can be bypassed)                │
│  - Whitelist allowed values for enums/sort columns              │
│  - Check numeric ranges (positive integers, max values)         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ERROR HANDLING                                                 │
│  ──────────────                                                 │
│  - Log details server-side: console.error(error)                │
│  - Return generic message: "An error occurred"                  │
│  - Never expose: stack traces, SQL errors, file paths           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Read [SECURITY.md](SECURITY.md) for implementation details
2. Read [ADDING-NEW-ENTITY.md](ADDING-NEW-ENTITY.md) for step-by-step guide
3. Run `npm run security:check` to validate your setup
4. When in doubt, check the existing `document.service.ts` for patterns

---

## Remember

> **Security is not optional.** Every line of code that touches user data must follow these patterns. If you're unsure, ask - don't guess.

The template handles most security automatically through `withApiAuth`. Your job is to:
1. Never bypass the protections
2. Always check ownership in services
3. Always use prepared statements
4. Always validate input on the server
