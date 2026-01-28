# Security Documentation

This document covers the security features implemented in the VVG Template.

## Table of Contents

- [CSRF Protection](#csrf-protection)
- [Authentication](#authentication)
- [Test Authentication (Dev/CI)](#test-authentication-devci)
- [Rate Limiting](#rate-limiting)
- [Environment Variables](#environment-variables)

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is enabled for all state-changing API requests (POST, PUT, DELETE, PATCH).

### How It Works

1. NextAuth automatically sets a `next-auth.csrf-token` cookie on authentication
2. Your frontend must read this token and include it in the `x-csrf-token` header
3. The server validates the token before processing the request

### Frontend Implementation

#### Using `fetch`:

```typescript
import { getCsrfToken } from 'next-auth/react';

async function createDocument(data: DocumentData) {
  const csrfToken = await getCsrfToken();

  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken || '',
    },
    body: JSON.stringify(data),
  });

  return response.json();
}
```

#### Creating a Reusable API Client:

```typescript
// lib/api-client.ts
import { getCsrfToken } from 'next-auth/react';

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const csrfToken = await getCsrfToken();
    return {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken || '',
    };
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async delete(url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  }
}

export const apiClient = new ApiClient();
```

#### Usage with the API Client:

```typescript
import { apiClient } from '@/lib/api-client';

// Create a document
await apiClient.post('/api/documents', {
  filename: 'report.pdf',
  file_path: '/uploads/report.pdf',
  file_size: 1024,
});

// Update a document
await apiClient.put('/api/documents/123', {
  filename: 'updated-report.pdf',
});

// Delete a document
await apiClient.delete('/api/documents/123');
```

### Error Handling

If CSRF validation fails, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "CSRF_INVALID",
    "message": "Missing CSRF token header"
  }
}
```

HTTP Status: `403 Forbidden`

### Disabling CSRF (Development Only)

For local development, you can disable CSRF validation:

```bash
# .env.local
DISABLE_CSRF=true
```

**Warning:** Never disable CSRF in production.

---

## Authentication

Authentication is handled by NextAuth with Azure AD provider.

### Required Environment Variables

```bash
NEXTAUTH_SECRET=your-secret-min-32-chars    # Required, min 32 characters
NEXTAUTH_URL=https://your-domain.com        # Required in production
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

### Session Configuration

- **Strategy:** JWT (stateless)
- **Max Age:** 7 days
- **Cookie:** `httpOnly`, `sameSite: lax`, `secure` in production

### Protected Routes

All routes are protected by default except:
- `/sign-in`
- `/api/auth/*`
- `/api/health`
- `/api/db-health`
- `/api/storage-health`

---

## Test Authentication (Dev/CI)

For development and CI testing, you can bypass authentication using special headers.

### Requirements

All conditions must be met:
1. `NODE_ENV` must NOT be `production`
2. `ALLOW_TEST_AUTH=true` must be set
3. `TEST_AUTH_SECRET` must be set (minimum 32 characters)

### Environment Setup

```bash
# .env.local (development only)
ALLOW_TEST_AUTH=true
TEST_AUTH_SECRET=your-very-long-secret-at-least-32-characters
```

### Usage

```bash
# API request with test auth
curl -X GET http://localhost:3000/api/documents \
  -H "X-Test-Auth: your-very-long-secret-at-least-32-characters" \
  -H "X-Test-User: test@example.com"
```

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Test-Auth` | Yes | Must match `TEST_AUTH_SECRET` exactly |
| `X-Test-User` | No | Email for the test user (default: `test@example.com`) |

### Security Notes

- Test auth is **completely disabled** in production
- All test auth usage is logged with timestamps
- Secret must be at least 32 characters
- Uses timing-safe comparison to prevent timing attacks

---

## Rate Limiting

Global rate limiting is applied to all requests.

### Configuration

| Setting | Value |
|---------|-------|
| Window | 1 minute |
| Max Requests | 100 per IP |

### Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706472000000
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

HTTP Status: `429 Too Many Requests`

---

## Environment Variables

### Security-Critical Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | Yes (prod) | Full URL of the application |
| `AZURE_AD_CLIENT_SECRET` | Yes | Azure AD OAuth secret |

### Development Overrides

| Variable | Default | Description |
|----------|---------|-------------|
| `DISABLE_CSRF` | `false` | Disable CSRF validation |
| `ALLOW_TEST_AUTH` | `false` | Enable test auth headers |
| `TEST_AUTH_SECRET` | - | Secret for test auth (min 32 chars) |
| `FEATURE_DEV_BYPASS` | `false` | Enable X-Dev-Bypass header |
| `DISABLE_MIDDLEWARE` | `false` | Disable auth middleware entirely |

### Security Warnings

The application logs warnings at startup if dev features are enabled:

```
⚠️ [Security] FEATURE_DEV_BYPASS=true - Auth bypass via X-Dev-Bypass header is ENABLED
⚠️ [Security] ALLOW_TEST_AUTH=true - Test auth header bypass is ENABLED
```

---

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` for templates
2. **Rotate secrets regularly** - Especially `NEXTAUTH_SECRET`
3. **Use strong secrets** - Minimum 32 characters, randomly generated
4. **Monitor security logs** - Watch for auth bypass attempts
5. **Keep dependencies updated** - Run `npm audit` regularly

### Generating a Secure Secret

```bash
# Generate a 64-character random secret
openssl rand -base64 48
```
