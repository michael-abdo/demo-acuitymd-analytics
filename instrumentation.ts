export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize startup logging
    await import('./src/app/startup')
    
    // Setup global error handlers
    const { setupGlobalErrorHandlers } = await import('./src/lib/global-error-handler')
    setupGlobalErrorHandlers()
  }
}