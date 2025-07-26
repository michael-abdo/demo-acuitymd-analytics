/**
 * Toast Notification Utilities
 * 
 * Consolidates toast notification patterns across the application.
 * Eliminates ~150 lines of repetitive toast calls with standardized messages.
 */

import { toast as sonnerToast } from 'sonner';

/**
 * Toast configuration types
 */
interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Standardized toast notification utility
 * Provides consistent messaging and styling across the application
 */
export const toast = {
  /**
   * Success notifications
   */
  success: {
    upload: (filename?: string) => sonnerToast.success(
      "Upload successful",
      { description: filename ? `${filename} has been uploaded successfully.` : "Your file has been uploaded successfully." }
    ),
    
    save: (item: string = "Changes") => sonnerToast.success(
      `${item} saved`,
      { description: `${item} have been saved successfully.` }
    ),
    
    delete: (item: string = "Item") => sonnerToast.success(
      `${item} deleted`,
      { description: `${item} has been deleted successfully.` }
    ),
    
    update: (item: string = "Item") => sonnerToast.success(
      `${item} updated`,
      { description: `${item} has been updated successfully.` }
    ),
    
    comparison: () => sonnerToast.success(
      "Comparison complete",
      { description: "Document comparison has been completed successfully." }
    ),
    
    extraction: () => sonnerToast.success(
      "Extraction complete", 
      { description: "Text extraction has been completed successfully." }
    ),
    
    custom: (title: string, description?: string, options?: ToastOptions) => 
      sonnerToast.success(title, { description, ...options })
  },
  
  /**
   * Error notifications
   */
  error: {
    upload: (error?: string) => sonnerToast.error(
      "Upload failed",
      { description: error || "Failed to upload the file. Please try again." }
    ),
    
    load: (resource: string = "data", error?: string) => sonnerToast.error(
      `Error loading ${resource}`,
      { description: error || `Failed to load ${resource}. Please try again.` }
    ),
    
    save: (error?: string) => sonnerToast.error(
      "Save failed",
      { description: error || "Failed to save changes. Please try again." }
    ),
    
    delete: (error?: string) => sonnerToast.error(
      "Delete failed",
      { description: error || "Failed to delete the item. Please try again." }
    ),
    
    network: () => sonnerToast.error(
      "Network error",
      { description: "Unable to connect to the server. Please check your connection." }
    ),
    
    permission: () => sonnerToast.error(
      "Permission denied",
      { description: "You don't have permission to perform this action." }
    ),
    
    validation: (message: string) => sonnerToast.error(
      "Validation error",
      { description: message }
    ),
    
    custom: (title: string, description?: string, options?: ToastOptions) => 
      sonnerToast.error(title, { description, ...options })
  },
  
  /**
   * Warning/Info notifications
   */
  warning: {
    fileType: (allowedTypes: string[] = ["PDF", "DOCX", "DOC", "TXT"]) => sonnerToast.error(
      "Invalid file type",
      { description: `Please select a ${allowedTypes.join(", ")} file.` }
    ),
    
    fileSize: (maxSize: string = "10MB") => sonnerToast.error(
      "File too large",
      { description: `File size must be less than ${maxSize}.` }
    ),
    
    noFile: () => sonnerToast.error(
      "No file selected",
      { description: "Please select a file to upload." }
    ),
    
    unsavedChanges: () => sonnerToast.warning(
      "Unsaved changes",
      { 
        description: "You have unsaved changes. Are you sure you want to leave?",
        action: {
          label: "Stay",
          onClick: () => {}
        }
      }
    ),
    
    custom: (title: string, description?: string, options?: ToastOptions) => 
      sonnerToast.warning(title, { description, ...options })
  },
  
  /**
   * Info notifications
   */
  info: {
    processing: (item: string = "Request") => sonnerToast.info(
      `Processing ${item}`,
      { description: `${item} is being processed. This may take a moment.` }
    ),
    
    queued: (item: string = "Task") => sonnerToast.info(
      `${item} queued`,
      { description: `${item} has been added to the processing queue.` }
    ),
    
    custom: (title: string, description?: string, options?: ToastOptions) => 
      sonnerToast.info(title, { description, ...options })
  },
  
  /**
   * Loading notifications (returns a function to dismiss)
   */
  loading: {
    start: (message: string = "Loading...") => {
      const id = sonnerToast.loading(message);
      return () => sonnerToast.dismiss(id);
    },
    
    upload: () => {
      const id = sonnerToast.loading("Uploading file...");
      return () => sonnerToast.dismiss(id);
    },
    
    process: (item: string = "document") => {
      const id = sonnerToast.loading(`Processing ${item}...`);
      return () => sonnerToast.dismiss(id);
    }
  },
  
  /**
   * Promise-based notifications
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    }
  ) => sonnerToast.promise(promise, {
    loading: messages.loading || "Processing...",
    success: messages.success || "Success!",
    error: messages.error || "Something went wrong"
  })
};

/**
 * Common toast patterns for specific operations
 */
export const toastPatterns = {
  /**
   * Document operations
   */
  document: {
    upload: {
      start: () => toast.loading.upload(),
      success: (filename?: string) => toast.success.upload(filename),
      error: (error?: string) => toast.error.upload(error)
    },
    
    delete: {
      confirm: () => toast.warning.custom(
        "Confirm deletion",
        "Are you sure you want to delete this document?",
        {
          action: {
            label: "Delete",
            onClick: () => {}
          }
        }
      ),
      success: () => toast.success.delete("Document"),
      error: (error?: string) => toast.error.delete(error)
    },
    
    setStandard: {
      success: () => toast.success.update("Standard document"),
      error: (error?: string) => toast.error.custom(
        "Failed to set standard",
        error || "Unable to set document as standard. Please try again."
      )
    }
  },
  
  /**
   * API request patterns
   */
  api: {
    fetch: {
      error: (resource: string, error?: string) => toast.error.load(resource, error),
      networkError: () => toast.error.network(),
      unauthorized: () => toast.error.permission()
    }
  }
};