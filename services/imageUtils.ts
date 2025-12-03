/**
 * Image Utility Functions for Performance Optimization
 */

/**
 * Generate a compressed thumbnail from a base64 image
 * @param base64Image - Full resolution base64 data URL
 * @param maxWidth - Maximum thumbnail width (default 300px)
 * @param quality - JPEG quality 0-1 (default 0.7)
 * @returns Promise<string> - Compressed thumbnail as base64 data URL
 */
export const generateThumbnail = (
    base64Image: string,
    maxWidth: number = 300,
    quality: number = 0.7
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ratio = maxWidth / img.width;

                // Only resize if image is larger than maxWidth
                if (img.width > maxWidth) {
                    canvas.width = maxWidth;
                    canvas.height = img.height * ratio;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Use JPEG for better compression (smaller than PNG)
                const thumbnail = canvas.toDataURL('image/jpeg', quality);
                resolve(thumbnail);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = base64Image;
    });
};

/**
 * Generate thumbnails for multiple images in batch
 * @param images - Array of base64 data URLs
 * @param maxWidth - Maximum thumbnail width
 * @param quality - JPEG quality
 * @returns Promise<string[]> - Array of thumbnail data URLs
 */
export const generateThumbnailBatch = async (
    images: string[],
    maxWidth: number = 300,
    quality: number = 0.7
): Promise<string[]> => {
    const thumbnails = await Promise.all(
        images.map(img => generateThumbnail(img, maxWidth, quality).catch(() => img))
    );
    return thumbnails;
};

/**
 * Check if an image URL is a data URL (base64)
 */
export const isDataUrl = (url: string): boolean => {
    return url.startsWith('data:');
};

/**
 * Get the approximate size of a base64 string in KB
 */
export const getBase64SizeKB = (base64: string): number => {
    // Remove data URL prefix if present
    const base64Data = base64.split(',')[1] || base64;
    // Base64 encodes 6 bits per character, so multiply by 0.75 to get bytes
    const bytes = base64Data.length * 0.75;
    return Math.round(bytes / 1024);
};

/**
 * Lazy load an image - useful for intersection observer patterns
 */
export const lazyLoadImage = (
    src: string,
    placeholder: string = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
): { src: string; loaded: boolean; load: () => Promise<string> } => {
    let loaded = false;
    let cachedSrc = placeholder;

    const load = async (): Promise<string> => {
        if (loaded) return cachedSrc;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                loaded = true;
                cachedSrc = src;
                resolve(src);
            };
            img.onerror = () => {
                resolve(placeholder);
            };
            img.src = src;
        });
    };

    return { src: cachedSrc, loaded, load };
};
