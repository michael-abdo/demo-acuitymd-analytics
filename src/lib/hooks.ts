'use client';

import { useState, useEffect } from 'react';
import { pagePath, apiPath, assetPath } from './utils/path-utils';

export interface UseApiDataOptions {
  refreshInterval?: number;
  onError?: (error: any) => void;
  autoLoad?: boolean;
  transform?: (data: any) => any;
  deps?: any[];
}

export function useApiData<T>(url: string, options: UseApiDataOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API URLs are handled automatically by Next.js
  const apiUrl = url;

  // Destructure options to handle dependencies properly
  const { autoLoad = true, transform, onError, deps = [] } = options;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        let result = await response.json();
        if (transform) {
          result = transform(result);
        }
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    if (autoLoad !== false) {
      fetchData();
    }
  }, [apiUrl, autoLoad, transform, onError, deps]);

  const reload = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let result = await response.json();
      if (transform) {
        result = transform(result);
      }
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, reload };
}

export interface UseFileUploadOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export function useFileUpload(endpoint: string, options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);

  // Upload URLs are handled automatically by Next.js
  const uploadUrl = endpoint;

  const upload = async (fileOrFormData: File | FormData, additionalData?: Record<string, any>) => {
    try {
      setUploading(true);
      
      let formData: FormData;
      
      if (fileOrFormData instanceof FormData) {
        formData = fileOrFormData;
      } else {
        formData = new FormData();
        formData.append('file', fileOrFormData);
        
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
          });
        }
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

export interface UseAsyncOperationOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export function useAsyncOperation<T = any>(options: UseAsyncOperationOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (operation: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      options.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { execute, loading, error, data, reset };
}

/**
 * useBasePath hook for client components
 * 
 * Provides path utilities for navigation and API calls in React components
 */
export function useBasePath() {
  return {
    pagePath,
    apiPath,
    assetPath,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''
  };
}

