/**
 * Application Initialization and Environment Validation
 * 
 * This module validates all required environment variables at startup
 * Following 2024 industry standards for fail-fast configuration
 */

import { ConfigValidation } from './config';

/**
 * Initialize application and validate environment
 * Called once at application startup
 */
export function initializeApp(): void {
  // Skip validation during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⚙️  [Init] Skipping validation during build phase');
    return;
  }

  console.log('🚀 [Init] Starting application initialization...');
  
  try {
    // Validate all configuration
    ConfigValidation.validateAll();
    
    // Log successful initialization
    console.log('✅ [Init] Application initialized successfully');
    console.log(`📊 [Init] Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 [Init] Base Path: ${process.env.BASE_PATH || '/'}`);
    
  } catch (error) {
    console.error('❌ [Init] Application initialization failed:', error);
    
    // In production, fail fast on configuration errors
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    // In development, show warning but continue
    console.warn('⚠️  [Init] Continuing in development mode despite configuration errors');
  }
}

// Run initialization immediately when this module is imported
if (typeof window === 'undefined') {
  // Server-side only
  initializeApp();
}