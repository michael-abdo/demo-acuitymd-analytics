import { logStartup } from '@/lib/logger'

// This file is imported by the instrumentation to log startup information
export function initializeStartupLogging() {
  // Log startup information
  logStartup()
  
  // Log when the application is ready
  if (typeof window === 'undefined') {
    console.log('Server-side initialization complete')
  } else {
    console.log('Client-side initialization complete')
  }
}

// Call this immediately when the module is loaded
if (typeof window === 'undefined') {
  initializeStartupLogging()
}