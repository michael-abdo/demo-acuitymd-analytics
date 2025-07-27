/**
 * Configuration Validator Service
 * 
 * Consolidates configuration validation patterns across API endpoints.
 * Eliminates ~8 lines of duplicated validation logic and provides consistent error handling.
 */

import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { ApiErrors, Logger } from '@/lib/auth-utils';

export interface ConfigValidationResult {
  isValid: boolean;
  missing: string[];
  errors: string[];
}

export interface ConfigValidationOptions {
  throwOnError?: boolean;
  loggerKey?: 'api' | 'db' | 'storage';
  operation?: string;
}

/**
 * Configuration validation service with standardized patterns
 */
export const ConfigValidatorService = {
  /**
   * Validate OpenAI API configuration
   * Consolidates the pattern used by compare/route.ts and text-extraction.ts
   */
  validateOpenAI(options: ConfigValidationOptions = {}): ConfigValidationResult {
    const { throwOnError = false, loggerKey = 'api', operation = 'OpenAI operation' } = options;
    const missing: string[] = [];
    const errors: string[] = [];

    if (!config.OPENAI_API_KEY) {
      missing.push('OPENAI_API_KEY');
      errors.push('OpenAI API key not configured');
    }

    const isValid = missing.length === 0;

    if (!isValid) {
      Logger[loggerKey].error(operation, 'OpenAI configuration validation failed', new Error('Missing OPENAI_API_KEY'));
      
      if (throwOnError) {
        throw new Error('OpenAI API key not configured');
      }
    } else {
      Logger[loggerKey].step(operation, 'OpenAI configuration validated');
    }

    return { isValid, missing, errors };
  },

  /**
   * Validate database configuration
   * Checks for required database settings
   */
  validateDatabase(options: ConfigValidationOptions = {}): ConfigValidationResult {
    const { throwOnError = false, loggerKey = 'db', operation = 'Database operation' } = options;
    const missing: string[] = [];
    const errors: string[] = [];

    // Check for database access configuration
    if (config.DB_CREATE_ACCESS === undefined && process.env.NODE_ENV === 'production') {
      missing.push('DB_CREATE_ACCESS');
      errors.push('Database creation access not configured for production');
    }

    const isValid = missing.length === 0;

    if (!isValid) {
      Logger[loggerKey].error(operation, 'Database configuration validation failed', new Error(`Missing: ${missing.join(', ')}`));
      
      if (throwOnError) {
        throw new Error(`Database configuration incomplete: ${missing.join(', ')}`);
      }
    } else {
      Logger[loggerKey].step(operation, 'Database configuration validated');
    }

    return { isValid, missing, errors };
  },

  /**
   * Validate storage configuration
   * Checks for required storage settings
   */
  validateStorage(options: ConfigValidationOptions = {}): ConfigValidationResult {
    const { throwOnError = false, loggerKey = 'storage', operation = 'Storage operation' } = options;
    const missing: string[] = [];
    const errors: string[] = [];

    // For S3 storage, check for required keys
    if (config.S3_ACCESS) {
      if (!config.S3_BUCKET_NAME) {
        missing.push('S3_BUCKET_NAME');
        errors.push('S3 bucket name not configured');
      }
      if (!config.S3_REGION) {
        missing.push('S3_REGION');
        errors.push('S3 region not configured');
      }
      if (!config.S3_ACCESS_KEY_ID) {
        missing.push('S3_ACCESS_KEY_ID');
        errors.push('S3 access key not configured');
      }
      if (!config.S3_SECRET_ACCESS_KEY) {
        missing.push('S3_SECRET_ACCESS_KEY');
        errors.push('S3 secret key not configured');
      }
    }

    const isValid = missing.length === 0;

    if (!isValid) {
      Logger[loggerKey].error(operation, 'Storage configuration validation failed', new Error(`Missing: ${missing.join(', ')}`));
      
      if (throwOnError) {
        throw new Error(`Storage configuration incomplete: ${missing.join(', ')}`);
      }
    } else {
      Logger[loggerKey].step(operation, 'Storage configuration validated');
    }

    return { isValid, missing, errors };
  },

  /**
   * Validate multiple configuration areas at once
   */
  validateMultiple(
    validations: Array<'openai' | 'database' | 'storage'>,
    options: ConfigValidationOptions = {}
  ): ConfigValidationResult {
    const { throwOnError = false, loggerKey = 'api', operation = 'Configuration validation' } = options;
    
    const allMissing: string[] = [];
    const allErrors: string[] = [];

    for (const validation of validations) {
      let result: ConfigValidationResult;
      
      switch (validation) {
        case 'openai':
          result = this.validateOpenAI({ ...options, throwOnError: false });
          break;
        case 'database':
          result = this.validateDatabase({ ...options, throwOnError: false });
          break;
        case 'storage':
          result = this.validateStorage({ ...options, throwOnError: false });
          break;
        default:
          continue;
      }

      allMissing.push(...result.missing);
      allErrors.push(...result.errors);
    }

    const isValid = allMissing.length === 0;

    if (!isValid) {
      Logger[loggerKey].error(operation, 'Multiple configuration validation failed', new Error(`Missing: ${allMissing.join(', ')}`));
      
      if (throwOnError) {
        throw new Error(`Configuration validation failed: ${allErrors.join(', ')}`);
      }
    } else {
      Logger[loggerKey].step(operation, 'All configuration validations passed');
    }

    return { isValid, missing: allMissing, errors: allErrors };
  },

  /**
   * Create standardized API error response for configuration failures
   * Consolidates the pattern used by compare/route.ts
   */
  createConfigurationErrorResponse(validationResult: ConfigValidationResult): NextResponse {
    return ApiErrors.configurationError(validationResult.missing);
  },

  /**
   * Validate OpenAI configuration and return API error if invalid
   * Provides a one-liner replacement for the compare/route.ts pattern
   */
  requireOpenAI(options: ConfigValidationOptions = {}): NextResponse | null {
    const validation = this.validateOpenAI(options);
    if (!validation.isValid) {
      return this.createConfigurationErrorResponse(validation);
    }
    return null;
  },

  /**
   * Validate multiple configurations and return API error if any invalid
   */
  requireConfigurations(
    validations: Array<'openai' | 'database' | 'storage'>,
    options: ConfigValidationOptions = {}
  ): NextResponse | null {
    const validation = this.validateMultiple(validations, options);
    if (!validation.isValid) {
      return this.createConfigurationErrorResponse(validation);
    }
    return null;
  }
};