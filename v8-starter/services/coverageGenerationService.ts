// services/coverageGenerationService.ts
// Main service for generating coverage libraries

import { generateBatch, BatchResult } from './batchGenerationService';
import { COVERAGE_PACKS, getPackById } from '../constants/coveragePacks';
import {
  CoverageLibrary,
  CoverageAngle,
  CoverageGenerationRequest,
  EntityType
} from '../types/coverage';
import { CharacterProfile, LocationProfile, ProductProfile } from '../../types';

/**
 * Generate coverage library from a pack
 *
 * This is the main service that orchestrates coverage generation.
 * It uses the batch generation service for parallel processing.
 *
 * Usage:
 * ```typescript
 * const library = await generateCoverageLibrary({
 *   entityId: character.id,
 *   entityType: 'character',
 *   entity: character,
 *   packId: 'contactSheet',
 *   options: {
 *     resolution: '4K',
 *     onProgress: (progress, completed, total) => {
 *       console.log(`${progress}% (${completed}/${total})`);
 *     }
 *   }
 * }, generateImageFn);
 * ```
 */
export async function generateCoverageLibrary(
  request: CoverageGenerationRequest,
  generateImageFn: (prompt: string) => Promise<string>
): Promise<CoverageLibrary> {

  const {
    entityId,
    entityType,
    entity,
    packId,
    options = {},
    onProgress,
    onAngleComplete,
    onComplete,
    onError
  } = request;

  // Get pack definition
  const pack = getPackById(packId);
  if (!pack) {
    throw new Error(`Pack not found: ${packId}`);
  }

  // Get entity name based on type
  const entityName = getEntityName(entity, entityType);

  console.log(`Generating ${pack.name} for ${entityType}: ${entityName}`);

  // Build prompts for each angle
  const prompts = pack.angles.map(angle => {
    let basePrompt = '';

    // Entity-specific prompt building
    if (entityType === 'character') {
      const char = entity as CharacterProfile;
      basePrompt = char.promptSnippet || char.description;
    } else if (entityType === 'product') {
      const prod = entity as ProductProfile;
      basePrompt = `${prod.name}, ${prod.promptSnippet || prod.description}`;
    } else if (entityType === 'location') {
      const loc = entity as LocationProfile;
      basePrompt = loc.promptSnippet || `${loc.name || ''} ${loc.description}`.trim();
    }

    // Add angle specifications
    const anglePrompt = `${basePrompt}. ${angle.description}.
Professional cinematography, ${options.resolution || '4K'}, ${angle.type} shot, ${angle.angle}.`;

    // Add optional atmosphere controls
    let finalPrompt = anglePrompt;
    if (options.timeOfDay) {
      finalPrompt += ` ${options.timeOfDay} lighting.`;
    }
    if (options.weather) {
      finalPrompt += ` ${options.weather} weather.`;
    }

    return finalPrompt;
  });

  // Initialize library
  const library: CoverageLibrary = {
    id: generateId(),
    entityId,
    entityType,
    entityName,
    packId,
    packName: pack.name,
    angles: [],
    status: 'generating',
    progress: 0,
    uploadedAngles: 0,
    generatedAngles: 0,
    failedAngles: 0,
    createdAt: new Date()
  };

  const startTime = Date.now();

  try {
    // Generate batch
    const results: BatchResult[] = await generateBatch(
      prompts,
      generateImageFn,
      {
        batchSize: options.maxConcurrent || 10,
        onProgress: (completed, total) => {
          const progress = Math.round((completed / total) * 100);
          library.progress = progress;
          onProgress?.(progress, completed, total);
        },
        onError: (error) => {
          onError?.(error);
        }
      }
    );

    // Convert results to coverage angles
    library.angles = results.map((result, index) => {
      const angle: CoverageAngle = {
        id: generateId(),
        category: pack.angles[index].category,
        type: pack.angles[index].type,
        angle: pack.angles[index].angle,
        description: pack.angles[index].description,
        imageUrl: result.imageUrl,
        resolution: options.resolution || '4K',
        source: 'generated',
        prompt: result.prompt,
        generatedAt: new Date(),
        generationTime: result.generationTime,
        metadata: {
          timeOfDay: options.timeOfDay,
          weather: options.weather,
          cinematicUse: [pack.angles[index].type.toLowerCase()]
        },
        tags: [],
        favorite: false,
        usedInStoryboard: false,
        usedInScenes: [],
        status: result.status,
        error: result.error,
        createdAt: new Date()
      };

      // Trigger callback for each completed angle
      onAngleComplete?.(angle);

      return angle;
    });

    // Update library stats
    library.generatedAngles = results.filter(r => r.status === 'success').length;
    library.failedAngles = results.filter(r => r.status === 'failed').length;
    library.status = 'complete';
    library.progress = 100;
    library.completedAt = new Date();

    const totalTime = Date.now() - startTime;
    library.metadata = {
      totalTime: Math.round(totalTime / 1000),
      averageTimePerAngle: Math.round(totalTime / pack.shots / 1000),
      successRate: parseFloat(((library.generatedAngles / pack.shots) * 100).toFixed(1))
    };

    console.log(`Coverage generation complete:`);
    console.log(`   Generated: ${library.generatedAngles}/${pack.shots}`);
    console.log(`   Failed: ${library.failedAngles}/${pack.shots}`);
    console.log(`   Time: ${library.metadata.totalTime}s`);
    console.log(`   Success rate: ${library.metadata.successRate}%`);

    onComplete?.(library);

    return library;

  } catch (error) {
    library.status = 'failed';
    onError?.(error as Error);
    throw error;
  }
}

/**
 * Get entity name based on type
 */
function getEntityName(entity: CharacterProfile | LocationProfile | ProductProfile, entityType: EntityType): string {
  if (entityType === 'character') {
    return (entity as CharacterProfile).name;
  } else if (entityType === 'product') {
    return (entity as ProductProfile).name;
  } else if (entityType === 'location') {
    const loc = entity as LocationProfile;
    return loc.name || 'Location';
  }
  return 'Entity';
}

/**
 * Generate ID helper
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retry failed angles in a library
 */
export async function retryFailedAngles(
  library: CoverageLibrary,
  generateImageFn: (prompt: string) => Promise<string>
): Promise<CoverageLibrary> {

  const failedAngles = library.angles.filter(a => a.status === 'failed');

  if (failedAngles.length === 0) {
    console.log('No failed angles to retry');
    return library;
  }

  console.log(`Retrying ${failedAngles.length} failed angles...`);

  const failedPrompts = failedAngles.map(a => a.prompt!);

  const results = await generateBatch(
    failedPrompts,
    generateImageFn,
    { batchSize: 5 }
  );

  // Update failed angles with retry results
  library.angles = library.angles.map(angle => {
    if (angle.status === 'success') {
      return angle;
    }

    const retryResult = results.find(r => r.prompt === angle.prompt);
    if (retryResult && retryResult.status === 'success') {
      return {
        ...angle,
        imageUrl: retryResult.imageUrl,
        status: 'success' as const,
        error: undefined
      };
    }

    return angle;
  });

  // Update library stats
  library.generatedAngles = library.angles.filter(a => a.status === 'success').length;
  library.failedAngles = library.angles.filter(a => a.status === 'failed').length;

  console.log(`Retry complete: ${library.generatedAngles} successful, ${library.failedAngles} still failed`);

  return library;
}
