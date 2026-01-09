/**
 * Hybrid AI Router for Design Agent V9
 *
 * Smart routing between Gemini (fast/cheap) and Claude (deep reasoning)
 * Based on task complexity and query type
 */

// ============================================
// TYPES
// ============================================

export type AIModel = 'gemini' | 'claude';

export type TaskType =
  | 'generate_image'        // → Gemini
  | 'generate_video'        // → Gemini (Veo)
  | 'enhance_prompt'        // → Gemini
  | 'simple_edit'           // → Gemini
  | 'batch_generation'      // → Gemini
  | 'analyze_consistency'   // → Claude
  | 'extract_style_dna'     // → Claude
  | 'suggest_improvements'  // → Claude
  | 'complex_reasoning'     // → Claude
  | 'troubleshoot_issue'    // → Claude
  | 'compare_versions'      // → Claude
  | 'critique_composition'  // → Claude
  | 'explain_decision';     // → Claude

export interface RoutingDecision {
  model: AIModel;
  taskType: TaskType;
  confidence: number; // 0-1
  reason: string;
}

export interface AIRouterConfig {
  defaultModel?: AIModel;
  forceModel?: AIModel; // Override for testing
  verboseLogging?: boolean;
}

// ============================================
// INDICATORS
// ============================================

const CLAUDE_INDICATORS = [
  'analyze', 'consistency', 'why', 'compare',
  'optimize', 'troubleshoot', 'explain', 'review',
  'suggest', 'improve', 'critique', 'evaluate',
  'reason', 'understand', 'diagnose', 'fix',
  'what went wrong', 'help me understand',
  'style dna', 'visual dna', 'extract style'
];

const GEMINI_INDICATORS = [
  'generate', 'create', 'make', 'render',
  'draw', 'paint', 'visualize', 'show',
  'image of', 'picture of', 'video of',
  'batch', 'multiple', 'variations'
];

const TASK_TYPE_MAP: Record<TaskType, AIModel> = {
  'generate_image': 'gemini',
  'generate_video': 'gemini',
  'enhance_prompt': 'gemini',
  'simple_edit': 'gemini',
  'batch_generation': 'gemini',
  'analyze_consistency': 'claude',
  'extract_style_dna': 'claude',
  'suggest_improvements': 'claude',
  'complex_reasoning': 'claude',
  'troubleshoot_issue': 'claude',
  'compare_versions': 'claude',
  'critique_composition': 'claude',
  'explain_decision': 'claude'
};

// ============================================
// CORE ROUTER
// ============================================

let config: AIRouterConfig = {
  defaultModel: 'gemini',
  verboseLogging: false
};

/**
 * Configure the AI Router
 */
export const configureRouter = (newConfig: Partial<AIRouterConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Detect task type from query/context
 */
export const detectTaskType = (query: string, context?: string): TaskType => {
  const lowerQuery = (query + ' ' + (context || '')).toLowerCase();

  // Check for explicit task patterns
  if (lowerQuery.includes('consistency') || lowerQuery.includes('consistent')) {
    return 'analyze_consistency';
  }
  if (lowerQuery.includes('style dna') || lowerQuery.includes('extract style')) {
    return 'extract_style_dna';
  }
  if (lowerQuery.includes('why') || lowerQuery.includes('explain')) {
    return 'explain_decision';
  }
  if (lowerQuery.includes('improve') || lowerQuery.includes('suggest')) {
    return 'suggest_improvements';
  }
  if (lowerQuery.includes('compare') || lowerQuery.includes('difference')) {
    return 'compare_versions';
  }
  if (lowerQuery.includes('troubleshoot') || lowerQuery.includes('fix') || lowerQuery.includes('wrong')) {
    return 'troubleshoot_issue';
  }
  if (lowerQuery.includes('critique') || lowerQuery.includes('evaluate')) {
    return 'critique_composition';
  }
  if (lowerQuery.includes('batch') || lowerQuery.includes('multiple') || lowerQuery.includes('variations')) {
    return 'batch_generation';
  }
  if (lowerQuery.includes('video')) {
    return 'generate_video';
  }
  if (lowerQuery.includes('generate') || lowerQuery.includes('create') || lowerQuery.includes('image')) {
    return 'generate_image';
  }
  if (lowerQuery.includes('enhance') || lowerQuery.includes('prompt')) {
    return 'enhance_prompt';
  }

  // Default to generation
  return 'generate_image';
};

/**
 * Detect query complexity (0-1 scale)
 */
export const detectComplexity = (query: string): number => {
  let score = 0;
  const lowerQuery = query.toLowerCase();

  // Length factor
  if (query.length > 200) score += 0.2;
  if (query.length > 500) score += 0.2;

  // Question words increase complexity
  const questionWords = ['why', 'how', 'what if', 'explain', 'analyze'];
  questionWords.forEach(word => {
    if (lowerQuery.includes(word)) score += 0.15;
  });

  // Claude indicators increase complexity
  CLAUDE_INDICATORS.forEach(indicator => {
    if (lowerQuery.includes(indicator)) score += 0.1;
  });

  // Multiple entities increase complexity
  const entityMentions = (query.match(/@\w+/g) || []).length;
  if (entityMentions > 2) score += 0.15;

  return Math.min(1, score);
};

/**
 * Main routing function - determines which AI model to use
 */
export const routeQuery = (
  query: string,
  context?: string,
  explicitTaskType?: TaskType
): RoutingDecision => {
  // Override if force model is set
  if (config.forceModel) {
    return {
      model: config.forceModel,
      taskType: explicitTaskType || detectTaskType(query, context),
      confidence: 1,
      reason: `Forced to ${config.forceModel} via config`
    };
  }

  // Detect task type
  const taskType = explicitTaskType || detectTaskType(query, context);
  const baseModel = TASK_TYPE_MAP[taskType];

  // Calculate confidence
  const complexity = detectComplexity(query);
  const confidence = baseModel === 'claude'
    ? 0.5 + (complexity * 0.5) // Higher complexity = more confident Claude is right
    : 0.5 + ((1 - complexity) * 0.5); // Lower complexity = more confident Gemini is right

  // Build reason
  let reason = `Task type "${taskType}" → ${baseModel}`;
  if (complexity > 0.6) {
    reason += ` (high complexity: ${(complexity * 100).toFixed(0)}%)`;
  }

  const decision: RoutingDecision = {
    model: baseModel,
    taskType,
    confidence,
    reason
  };

  if (config.verboseLogging) {
    console.log('[AI Router]', decision);
  }

  return decision;
};

/**
 * Quick check if query should use Claude
 */
export const shouldUseClaude = (query: string): boolean => {
  const decision = routeQuery(query);
  return decision.model === 'claude';
};

/**
 * Quick check if query should use Gemini
 */
export const shouldUseGemini = (query: string): boolean => {
  const decision = routeQuery(query);
  return decision.model === 'gemini';
};

// ============================================
// MODEL-SPECIFIC PROMPT OPTIMIZATION
// ============================================

/**
 * Optimize prompt for the target model
 */
export const optimizePromptForModel = (
  prompt: string,
  model: AIModel
): string => {
  if (model === 'claude') {
    // Claude benefits from structured, explicit prompts
    return `Please analyze the following and provide detailed reasoning:

${prompt}

Consider:
- Visual consistency factors
- Potential improvements
- Trade-offs and alternatives`;
  }

  // Gemini - direct and visual-focused
  return prompt;
};

/**
 * Get system prompt for model
 */
export const getSystemPromptForModel = (model: AIModel, taskType: TaskType): string => {
  if (model === 'claude') {
    return `You are a senior creative director and visual consistency expert for an AI video production platform.
Your role is to analyze, critique, and improve visual assets with deep reasoning.

Task context: ${taskType}

Provide thoughtful analysis with specific, actionable recommendations.
Focus on visual consistency, composition, lighting, and storytelling.`;
  }

  // Gemini system prompts are in gemini.ts (NANO_BANANA_GUIDE, etc.)
  return '';
};

// ============================================
// EXPORTS
// ============================================

export default {
  routeQuery,
  detectTaskType,
  detectComplexity,
  shouldUseClaude,
  shouldUseGemini,
  optimizePromptForModel,
  getSystemPromptForModel,
  configureRouter
};
