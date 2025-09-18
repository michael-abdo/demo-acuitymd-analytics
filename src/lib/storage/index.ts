// Simple storage abstraction
export const storageProvider = {
  upload: async (_file: File, path: string) => {
    // Mock implementation - replace with actual S3/storage logic
    return `https://mock-storage.com/${path}`;
  }
};

export type StorageProvider = typeof storageProvider;