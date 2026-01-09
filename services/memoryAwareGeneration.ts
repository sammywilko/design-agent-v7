/**
 * Memory-Aware Generation Service for Design Agent V9
 *
 * Wraps gemini service calls with automatic memory context injection.
 * Ensures AI never "forgets" project state across sessions.
 */

import { generateImage, generateImageBatch, consultDirectorChat, enhancePrompt } from './gemini';
import { buildContextForPrompt, extractMemoriesFromResponse, saveCorrection } from './projectMemoryService';
import { routeQuery, optimizePromptForModel } from './aiRouter';
import { GeneratedImage, ReferenceAsset, GenerationConfig } from '../types';

// ============================================
// TYPES
// ============================================

export interface MemoryAwareConfig {
  projectId: string;
  injectMemory?: boolean;
  extractLearnings?: boolean;
  entityNames?: string[]; // For memory extraction
}

export interface BatchResult {
  successful: GeneratedImage[];
  failed: Array<{ prompt: string; error: string }>;
  totalRequested: number;
  successRate: number;
}

// ============================================
// MEMORY-AWARE IMAGE GENERATION
// ============================================

/**
 * Generate image with automatic memory context injection
 */
export const generateImageWithMemory = async (
  prompt: string,
  references: ReferenceAsset[],
  config: GenerationConfig,
  memoryConfig: MemoryAwareConfig
): Promise<GeneratedImage> => {
  const { projectId, injectMemory = true } = memoryConfig;

  let enhancedPrompt = prompt;

  // Inject memory context if enabled
  if (injectMemory && projectId) {
    const memoryContext = await buildContextForPrompt(projectId, {
      includeCharacters: true,
      includeLocations: true,
      includeProducts: true,
      includeStyle: true,
      includeCorrections: true
    });

    if (memoryContext) {
      enhancedPrompt = `${memoryContext}\n\n---\n\nGENERATION REQUEST:\n${prompt}`;
      console.log('[MemoryAware] Injected memory context into prompt');
    }
  }

  // Generate with standard gemini service
  const result = await generateImage(enhancedPrompt, references, config);

  return result;
};

/**
 * Batch generation with memory context
 */
export const generateBatchWithMemory = async (
  prompts: string[],
  references: ReferenceAsset[],
  config: GenerationConfig,
  memoryConfig: MemoryAwareConfig,
  onProgress?: (completed: number, total: number, lastResult: 'success' | 'failed') => void
): Promise<BatchResult> => {
  const { projectId, injectMemory = true } = memoryConfig;

  let memoryContext = '';

  // Get memory context once for all prompts
  if (injectMemory && projectId) {
    memoryContext = await buildContextForPrompt(projectId);
  }

  // Enhance each prompt with memory
  const enhancedPrompts = prompts.map(prompt => {
    if (memoryContext) {
      return `${memoryContext}\n\n---\n\nGENERATION REQUEST:\n${prompt}`;
    }
    return prompt;
  });

  // Use batch generation with correct signature
  const batchResult = await generateImageBatch(
    enhancedPrompts,
    references,
    config,
    false, // useGrounding
    onProgress,
    3 // concurrencyLimit
  );

  return {
    successful: batchResult.successful,
    failed: batchResult.failed,
    totalRequested: batchResult.totalRequested,
    successRate: batchResult.successRate
  };
};

// ============================================
// MEMORY-AWARE DIRECTOR CONSULTATION
// ============================================

/**
 * Consult director with project memory context
 * Uses consultDirectorChat which takes a simpler (query, context) signature
 */
export const consultDirectorWithMemory = async (
  userQuery: string,
  currentContext: string | object,
  memoryConfig: MemoryAwareConfig
): Promise<string> => {
  const { projectId, injectMemory = true, extractLearnings = true, entityNames = [] } = memoryConfig;

  let enhancedContext = typeof currentContext === 'string' ? currentContext : JSON.stringify(currentContext);

  // Inject memory context
  if (injectMemory && projectId) {
    const memoryContext = await buildContextForPrompt(projectId);
    if (memoryContext) {
      enhancedContext = `PROJECT MEMORY:\n${memoryContext}\n\n---\n\nCURRENT CONTEXT:\n${enhancedContext}`;
    }
  }

  // Get director response using the chat variant (returns string)
  const response = await consultDirectorChat(userQuery, enhancedContext);

  // Extract learnings from response (for auto-learning)
  if (extractLearnings && projectId && entityNames.length > 0) {
    try {
      const extractedCount = await extractMemoriesFromResponse(projectId, response, entityNames);
      if (extractedCount > 0) {
        console.log(`[MemoryAware] Extracted ${extractedCount} memories from director response`);
      }
    } catch (error) {
      console.error('[MemoryAware] Failed to extract memories:', error);
    }
  }

  return response;
};

// ============================================
// PROMPT ENHANCEMENT WITH MEMORY
// ============================================

/**
 * Enhance prompt using AI with memory context for better consistency
 */
export const enhancePromptWithMemory = async (
  simplePrompt: string,
  memoryConfig: MemoryAwareConfig
): Promise<string> => {
  const { projectId, injectMemory = true } = memoryConfig;

  let contextualPrompt = simplePrompt;

  // Add memory context to help AI understand style/character consistency
  if (injectMemory && projectId) {
    const memoryContext = await buildContextForPrompt(projectId, {
      includeStyle: true,
      includeCharacters: true,
      includeCorrections: true
    });

    if (memoryContext) {
      contextualPrompt = `Based on this project context:\n${memoryContext}\n\nEnhance this prompt while maintaining consistency: ${simplePrompt}`;
    }
  }

  const enhanced = await enhancePrompt(contextualPrompt);
  return enhanced;
};

// ============================================
// CORRECTION HANDLING
// ============================================

/**
 * Record a user correction for future learning
 */
export const recordCorrection = async (
  projectId: string,
  correctionType: string,
  originalValue: any,
  correctedValue: any
): Promise<void> => {
  await saveCorrection(projectId, correctionType, originalValue, correctedValue);
  console.log(`[MemoryAware] Recorded correction: ${correctionType}`);
};

// ============================================
// SMART ROUTING WITH MEMORY
// ============================================

/**
 * Route query to appropriate AI with memory context
 */
export const smartQuery = async (
  query: string,
  projectId: string,
  options: {
    currentContext?: string;
    entityNames?: string[];
  } = {}
): Promise<{
  response: string;
  model: 'gemini' | 'claude';
  taskType: string;
}> => {
  const { currentContext = '', entityNames = [] } = options;

  // Get routing decision
  const routing = routeQuery(query, currentContext);

  // Build memory-enhanced context
  const memoryContext = await buildContextForPrompt(projectId);
  const fullContext = memoryContext
    ? `${memoryContext}\n\n---\n\n${currentContext}`
    : currentContext;

  // Route to appropriate model
  let response: string;

  if (routing.model === 'claude') {
    // For Claude, use the AI router's optimized prompt
    const optimizedQuery = optimizePromptForModel(query, 'claude');
    // Note: Claude integration would go here
    // For now, fall back to Gemini director chat
    response = await consultDirectorChat(optimizedQuery, fullContext);
  } else {
    // Use Gemini director chat
    response = await consultDirectorChat(query, fullContext);
  }

  // Extract learnings if applicable
  if (entityNames.length > 0) {
    await extractMemoriesFromResponse(projectId, response, entityNames);
  }

  return {
    response,
    model: routing.model,
    taskType: routing.taskType
  };
};

// ============================================
// EXPORTS
// ============================================

export default {
  generateImageWithMemory,
  generateBatchWithMemory,
  consultDirectorWithMemory,
  enhancePromptWithMemory,
  recordCorrection,
  smartQuery
};
