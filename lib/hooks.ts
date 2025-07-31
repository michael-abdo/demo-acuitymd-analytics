import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/utils/path-utils';

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

  // Ensure API URLs have basePath prefix
  const apiUrl = url.startsWith('/api') ? apiPath(url.replace('/api', '')) : url;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        let result = await response.json();
        if (options.transform) {
          result = options.transform(result);
        }
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        options.onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    if (options.autoLoad !== false) {
      fetchData();
    }
  }, [apiUrl, ...(options.deps || [])]);

  const reload = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let result = await response.json();
      if (options.transform) {
        result = options.transform(result);
      }
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options.onError?.(err);
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

  // Ensure upload endpoints have basePath prefix
  const uploadUrl = endpoint.startsWith('/api') ? apiPath(endpoint.replace('/api', '')) : endpoint;

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

// Export the useBasePath hook
export { useBasePath } from './hooks/use-basepath';