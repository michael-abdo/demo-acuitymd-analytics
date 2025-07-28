import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
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
  }, [url, ...(options.deps || [])]);

  const reload = async () => {
    try {
      setLoading(true);
      const response = await fetch(url);
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

      const response = await fetch(endpoint, {
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