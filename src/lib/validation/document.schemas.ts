/**
 * Document Validation Schemas
 * Validation utilities for document-related operations
 */

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Document creation input validation
export interface CreateDocumentInput {
  filename: string;
  file_path: string;
  file_size: number;
}

export function validateCreateDocumentInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate filename
  if (!input.filename) {
    errors.push({
      field: 'filename',
      message: 'Filename is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (typeof input.filename !== 'string') {
    errors.push({
      field: 'filename',
      message: 'Filename must be a string',
      code: 'INVALID_FORMAT'
    });
  } else if (input.filename.trim().length === 0) {
    errors.push({
      field: 'filename',
      message: 'Filename cannot be empty',
      code: 'INVALID_VALUE'
    });
  } else if (input.filename.length > 255) {
    errors.push({
      field: 'filename',
      message: 'Filename cannot exceed 255 characters',
      code: 'INVALID_VALUE'
    });
  }

  // Validate file_path
  if (!input.file_path) {
    errors.push({
      field: 'file_path',
      message: 'File path is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (typeof input.file_path !== 'string') {
    errors.push({
      field: 'file_path',
      message: 'File path must be a string',
      code: 'INVALID_FORMAT'
    });
  } else if (input.file_path.trim().length === 0) {
    errors.push({
      field: 'file_path',
      message: 'File path cannot be empty',
      code: 'INVALID_VALUE'
    });
  }

  // Validate file_size
  if (input.file_size === undefined || input.file_size === null) {
    errors.push({
      field: 'file_size',
      message: 'File size is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (typeof input.file_size !== 'number') {
    errors.push({
      field: 'file_size',
      message: 'File size must be a number',
      code: 'INVALID_FORMAT'
    });
  } else if (input.file_size <= 0) {
    errors.push({
      field: 'file_size',
      message: 'File size must be greater than 0',
      code: 'INVALID_VALUE'
    });
  } else if (input.file_size > 100 * 1024 * 1024) { // 100MB limit
    errors.push({
      field: 'file_size',
      message: 'File size cannot exceed 100MB',
      code: 'INVALID_VALUE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Document update input validation
export interface UpdateDocumentInput {
  filename?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export function validateUpdateDocumentInput(input: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if at least one field is provided
  if (!input || Object.keys(input).length === 0) {
    errors.push({
      field: 'root',
      message: 'At least one field must be provided for update',
      code: 'REQUIRED_FIELD'
    });
    return { isValid: false, errors };
  }

  // Validate filename if provided
  if (input.filename !== undefined) {
    if (typeof input.filename !== 'string') {
      errors.push({
        field: 'filename',
        message: 'Filename must be a string',
        code: 'INVALID_FORMAT'
      });
    } else if (input.filename.trim().length === 0) {
      errors.push({
        field: 'filename',
        message: 'Filename cannot be empty',
        code: 'INVALID_VALUE'
      });
    } else if (input.filename.length > 255) {
      errors.push({
        field: 'filename',
        message: 'Filename cannot exceed 255 characters',
        code: 'INVALID_VALUE'
      });
    }
  }

  // Validate status if provided
  if (input.status !== undefined) {
    const validStatuses = ['uploaded', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(input.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Document ID validation
export function validateDocumentId(id: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (id === undefined || id === null) {
    errors.push({
      field: 'id',
      message: 'Document ID is required',
      code: 'REQUIRED_FIELD'
    });
  } else {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      errors.push({
        field: 'id',
        message: 'Document ID must be a positive integer',
        code: 'INVALID_FORMAT'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}