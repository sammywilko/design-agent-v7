/**
 * Input Validation & Sanitization Service
 *
 * Provides utilities for validating and sanitizing user input
 * to prevent injection attacks and ensure data integrity.
 */

// ============================================
// TEXT SANITIZATION
// ============================================

/**
 * Sanitize text input by removing potentially harmful content
 * while preserving legitimate characters for prompts.
 */
export const sanitizeTextInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize unicode
    .normalize('NFC')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Sanitize prompt specifically - allows more characters but
 * still removes dangerous patterns.
 */
export const sanitizePrompt = (prompt: string): string => {
  if (!prompt || typeof prompt !== 'string') return '';

  return prompt
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize unicode
    .normalize('NFC')
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit to reasonable length (16KB max)
    .slice(0, 16384)
    .trim();
};

/**
 * Sanitize entity names (characters, locations, products)
 */
export const sanitizeEntityName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  return name
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize unicode
    .normalize('NFC')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, 100)
    .trim();
};

// ============================================
// VALIDATION
// ============================================

/**
 * Validate prompt length and content
 */
export const validatePrompt = (prompt: string): { valid: boolean; error?: string } => {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required' };
  }

  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Prompt is too short (minimum 3 characters)' };
  }

  if (trimmed.length > 16384) {
    return { valid: false, error: 'Prompt is too long (maximum 16,384 characters)' };
  }

  return { valid: true };
};

/**
 * Validate image data URL
 */
export const validateImageDataUrl = (dataUrl: string): { valid: boolean; error?: string } => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }

  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:image/')) {
    // Also allow plain base64
    if (!dataUrl.match(/^[A-Za-z0-9+/=]+$/)) {
      return { valid: false, error: 'Invalid image format' };
    }
  }

  // Check supported formats
  const supportedFormats = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/gif', 'data:image/webp'];
  if (dataUrl.startsWith('data:') && !supportedFormats.some(f => dataUrl.startsWith(f))) {
    return { valid: false, error: 'Unsupported image format (use PNG, JPEG, GIF, or WebP)' };
  }

  // Check reasonable size (50MB max for base64)
  if (dataUrl.length > 50 * 1024 * 1024) {
    return { valid: false, error: 'Image is too large (maximum 50MB)' };
  }

  return { valid: true };
};

/**
 * Validate entity name
 */
export const validateEntityName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length < 1) {
    return { valid: false, error: 'Name is too short' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long (maximum 100 characters)' };
  }

  return { valid: true };
};

/**
 * Validate API key format
 */
export const validateApiKeyFormat = (key: string | undefined): boolean => {
  if (!key || typeof key !== 'string') return false;
  // Gemini API keys start with 'AIza' and are 39 characters
  return key.length > 20 && key.startsWith('AIza');
};

// ============================================
// REFERENCE VALIDATION
// ============================================

/**
 * Validate reference count doesn't exceed limits
 */
export const validateReferenceCount = (count: number, max: number = 14): { valid: boolean; error?: string } => {
  if (count > max) {
    return { valid: false, error: `Too many references (maximum ${max})` };
  }
  return { valid: true };
};

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate batch generation config
 */
export const validateBatchConfig = (config: {
  count?: number;
  aspectRatio?: string;
  resolution?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate count
  if (config.count !== undefined) {
    if (config.count < 1 || config.count > 12) {
      errors.push('Batch count must be between 1 and 12');
    }
  }

  // Validate aspect ratio
  const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  if (config.aspectRatio && !validAspectRatios.includes(config.aspectRatio)) {
    errors.push(`Invalid aspect ratio. Use: ${validAspectRatios.join(', ')}`);
  }

  // Validate resolution
  const validResolutions = ['1K', '2K', '4K'];
  if (config.resolution && !validResolutions.includes(config.resolution)) {
    errors.push(`Invalid resolution. Use: ${validResolutions.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================
// EXPORT HELPERS
// ============================================

/**
 * Quick sanitize and validate for common use case
 */
export const sanitizeAndValidatePrompt = (input: string): { sanitized: string; valid: boolean; error?: string } => {
  const sanitized = sanitizePrompt(input);
  const validation = validatePrompt(sanitized);
  return {
    sanitized,
    ...validation
  };
};
