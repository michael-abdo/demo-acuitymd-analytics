/**
 * Token Validator Utility
 * 
 * Provides validation utilities for various token types
 */

import { config } from '@/lib/config';

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Token Validator Class
 */
export class TokenValidator {
  /**
   * Validate system token
   */
  static validateSystemToken(token: string | undefined): TokenValidationResult {
    if (!token) {
      return {
        valid: false,
        error: 'Token is required'
      };
    }
    
    if (token !== config.QUEUE_SYSTEM_TOKEN) {
      return {
        valid: false,
        error: 'Invalid system token'
      };
    }
    
    return {
      valid: true,
      metadata: {
        type: 'system',
        validatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Validate API key
   */
  static validateApiKey(apiKey: string | undefined): TokenValidationResult {
    if (!apiKey) {
      return {
        valid: false,
        error: 'API key is required'
      };
    }
    
    // Basic format validation
    if (apiKey.length < 10) {
      return {
        valid: false,
        error: 'API key too short'
      };
    }
    
    return {
      valid: true,
      metadata: {
        type: 'api_key',
        validatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Validate bearer token
   */
  static validateBearerToken(authHeader: string | undefined): TokenValidationResult {
    if (!authHeader) {
      return {
        valid: false,
        error: 'Authorization header is required'
      };
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Invalid authorization header format'
      };
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return {
        valid: false,
        error: 'Bearer token is empty'
      };
    }
    
    return {
      valid: true,
      metadata: {
        type: 'bearer',
        token: token,
        validatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Validate development bypass token
   */
  static validateDevBypassToken(token: string | undefined): TokenValidationResult {
    if (!config.IS_DEVELOPMENT) {
      return {
        valid: false,
        error: 'Development bypass not available in production'
      };
    }
    
    if (!config.FEATURES.DEV_BYPASS) {
      return {
        valid: false,
        error: 'Development bypass is disabled'
      };
    }
    
    // In development, allow any non-empty token
    if (!token || token.trim().length === 0) {
      return {
        valid: false,
        error: 'Development bypass token is required'
      };
    }
    
    return {
      valid: true,
      metadata: {
        type: 'dev_bypass',
        validatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Extract token from various sources
   */
  static extractToken(headers: Headers): {
    systemToken?: string;
    apiKey?: string;
    bearerToken?: string;
    devBypass?: string;
  } {
    return {
      systemToken: headers.get('X-System-Token') || undefined,
      apiKey: headers.get('X-API-Key') || undefined,
      bearerToken: headers.get('Authorization') || undefined,
      devBypass: headers.get('X-Dev-Bypass') || undefined
    };
  }
}

/**
 * Token validator instance
 */
export const tokenValidator = TokenValidator;