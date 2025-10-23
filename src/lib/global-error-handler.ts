/**
 * Global error handlers for local development.
 * Captures unhandled promise rejections and uncaught exceptions so they surface clearly in the console.
 */

export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Hook in your own logging/alerting here if desired.
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    // Optionally log to an external service and shut down if you prefer fail-fast behaviour.
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
