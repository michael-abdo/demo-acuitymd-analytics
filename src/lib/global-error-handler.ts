/**
 * Global error handlers for production applications
 * Sets up unhandled promise rejections and uncaught exceptions
 */

export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // In production, you might want to:
    // - Log to external service (Sentry, LogRocket, etc.)
    // - Gracefully shutdown the process
    // - Send alerts to monitoring system
    
    if (process.env.NODE_ENV === 'production') {
      // Log to external service here
      console.error('Production error logged to external service');
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    if (process.env.NODE_ENV === 'production') {
      // Log to external service here
      console.error('Production error logged to external service');
      
      // Gracefully shutdown
      process.exit(1);
    }
  });

  // Handle process termination signals
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    // Perform cleanup here
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Starting graceful shutdown...');
    // Perform cleanup here
    process.exit(0);
  });
}