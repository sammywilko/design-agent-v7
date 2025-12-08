// services/batchGenerationService.ts
// Batch generation with graceful error handling

export interface BatchGenerationOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (completed: number, total: number) => void;
  onBatchComplete?: (batchNumber: number, totalBatches: number) => void;
  onError?: (error: Error, prompt: string) => void;
}

export interface BatchResult {
  prompt: string;
  imageUrl: string;
  status: 'success' | 'failed';
  error?: string;
  retries?: number;
  generationTime?: number;
}

/**
 * Split array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate multiple images in parallel batches with graceful error handling
 *
 * Features:
 * - Parallel generation within batches (10 at a time)
 * - Individual error handling (one failure doesn't break batch)
 * - Progress tracking
 * - Retry logic for failed generations
 * - Rate limiting between batches
 *
 * Usage:
 * ```typescript
 * const results = await generateBatch(prompts, generateFn, {
 *   batchSize: 10,
 *   onProgress: (completed, total) => {
 *     console.log(`${completed}/${total} complete`);
 *   }
 * });
 * ```
 */
export async function generateBatch(
  prompts: string[],
  generateFn: (prompt: string) => Promise<string>,
  options: BatchGenerationOptions = {}
): Promise<BatchResult[]> {

  const {
    batchSize = 10,
    maxRetries = 2,
    retryDelay = 2000,
    onProgress,
    onBatchComplete,
    onError
  } = options;

  const batches = chunk(prompts, batchSize);
  const allResults: BatchResult[] = [];

  let completed = 0;
  const total = prompts.length;

  console.log(`Starting batch generation: ${total} images in ${batches.length} batches`);

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} images)`);

    // Generate all in batch simultaneously with individual error handling
    const batchResults = await Promise.all(
      batch.map(async (prompt): Promise<BatchResult> => {
        const startTime = Date.now();
        let retries = 0;

        // Try generation with retries
        while (retries <= maxRetries) {
          try {
            const imageUrl = await generateFn(prompt);
            const generationTime = Date.now() - startTime;

            completed++;
            onProgress?.(completed, total);

            return {
              prompt,
              imageUrl,
              status: 'success',
              retries,
              generationTime
            };

          } catch (error) {
            retries++;

            if (retries > maxRetries) {
              // Max retries exceeded
              completed++;
              onProgress?.(completed, total);

              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              onError?.(error as Error, prompt);

              console.error(`Failed after ${maxRetries} retries: ${prompt.substring(0, 50)}...`);

              return {
                prompt,
                imageUrl: '',
                status: 'failed',
                error: errorMessage,
                retries: maxRetries
              };
            }

            // Wait before retry
            console.warn(`Retry ${retries}/${maxRetries} for: ${prompt.substring(0, 50)}...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        // Should never reach here, but TypeScript wants it
        return {
          prompt,
          imageUrl: '',
          status: 'failed',
          error: 'Unknown error'
        };
      })
    );

    allResults.push(...batchResults);

    // Batch complete callback
    onBatchComplete?.(batchIndex + 1, batches.length);

    const successCount = batchResults.filter(r => r.status === 'success').length;
    console.log(`Batch ${batchIndex + 1} complete: ${successCount}/${batch.length} successful`);

    // Rate limiting: Small delay between batches
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  const totalSuccess = allResults.filter(r => r.status === 'success').length;
  const totalFailed = allResults.filter(r => r.status === 'failed').length;
  const successRate = ((totalSuccess / total) * 100).toFixed(1);

  console.log(`\nBatch generation complete:`);
  console.log(`   Success: ${totalSuccess}/${total} (${successRate}%)`);
  console.log(`   Failed: ${totalFailed}/${total}`);

  return allResults;
}

/**
 * Retry failed generations from a previous batch
 */
export async function retryFailedGenerations(
  previousResults: BatchResult[],
  generateFn: (prompt: string) => Promise<string>,
  options: BatchGenerationOptions = {}
): Promise<BatchResult[]> {

  const failedResults = previousResults.filter(r => r.status === 'failed');

  if (failedResults.length === 0) {
    console.log('No failed generations to retry');
    return previousResults;
  }

  console.log(`Retrying ${failedResults.length} failed generations...`);

  const failedPrompts = failedResults.map(r => r.prompt);
  const retryResults = await generateBatch(failedPrompts, generateFn, options);

  // Merge retry results back into original results
  const updatedResults = previousResults.map(result => {
    if (result.status === 'success') {
      return result;
    }

    const retryResult = retryResults.find(r => r.prompt === result.prompt);
    return retryResult || result;
  });

  return updatedResults;
}

/**
 * Get batch statistics
 */
export function getBatchStats(results: BatchResult[]) {
  const total = results.length;
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const successRate = (successful / total) * 100;

  const totalTime = results.reduce((sum, r) => sum + (r.generationTime || 0), 0);
  const avgTime = successful > 0 ? totalTime / successful : 0;

  return {
    total,
    successful,
    failed,
    successRate: parseFloat(successRate.toFixed(1)),
    totalTime: Math.round(totalTime / 1000), // seconds
    avgTimePerImage: Math.round(avgTime / 1000) // seconds
  };
}
