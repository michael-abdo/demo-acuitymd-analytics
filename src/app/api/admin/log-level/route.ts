export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { setLogLevel, logConfig } from '@/lib/pino-logger';
import { ResponseBuilder, ApiErrors } from '@/lib/utils';

// Define allowed log levels
const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof ALLOWED_LEVELS[number];

// Admin email check - you should customize this for your organization
const isAdmin = (email: string): boolean => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email);
};

export const GET = withAuth(async (_request: NextRequest, userEmail: string) => {
  // Check if user is admin
  if (!isAdmin(userEmail)) {
    return ApiErrors.forbidden('Admin access required');
  }

  // Return current log configuration
  return ResponseBuilder.success({
    data: {
      currentLevel: logConfig.level,
      features: logConfig.features,
      allowedLevels: ALLOWED_LEVELS
    }
  });
});

export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  // Check if user is admin
  if (!isAdmin(userEmail)) {
    return ApiErrors.forbidden('Admin access required');
  }

  try {
    const body = await request.json();
    const { level } = body;

    // Validate log level
    if (!level || !ALLOWED_LEVELS.includes(level as LogLevel)) {
      return ApiErrors.badRequest(`Invalid log level. Allowed levels: ${ALLOWED_LEVELS.join(', ')}`);
    }

    // Update log level
    setLogLevel(level);

    // Log the change
    console.log(`[ADMIN] Log level changed to ${level} by ${userEmail}`);

    return ResponseBuilder.success({
      data: {
        message: 'Log level updated successfully',
        newLevel: level,
        previousLevel: logConfig.level
      }
    });
  } catch (error) {
    return ApiErrors.badRequest('Invalid request body');
  }
});

export const PUT = withAuth(async (request: NextRequest, userEmail: string) => {
  // Check if user is admin
  if (!isAdmin(userEmail)) {
    return ApiErrors.forbidden('Admin access required');
  }

  try {
    const body = await request.json();
    const { features } = body;

    // Update feature flags
    if (features) {
      // Update environment variables (these will persist until restart)
      if (typeof features.dbQueries === 'boolean') {
        process.env.LOG_DB_QUERIES = features.dbQueries.toString();
      }
      if (typeof features.chatDetails === 'boolean') {
        process.env.LOG_CHAT_DETAILS = features.chatDetails.toString();
      }
      if (typeof features.apiSteps === 'boolean') {
        process.env.LOG_API_STEPS = features.apiSteps.toString();
      }
      if (typeof features.startup === 'boolean') {
        process.env.LOG_STARTUP = features.startup.toString();
      }

      // Log the change
      console.log(`[ADMIN] Log features updated by ${userEmail}:`, features);

      return ResponseBuilder.success({
        data: {
          message: 'Log features updated successfully',
          features: {
            dbQueries: process.env.LOG_DB_QUERIES === 'true',
            chatDetails: process.env.LOG_CHAT_DETAILS === 'true',
            apiSteps: process.env.LOG_API_STEPS === 'true',
            startup: process.env.LOG_STARTUP === 'true'
          }
        }
      });
    }

    return ApiErrors.badRequest('No features provided');
  } catch (error) {
    return ApiErrors.badRequest('Invalid request body');
  }
});