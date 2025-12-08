
import { Project, Message, GeneratedImage, SavedEntity, GeneratedVideo, SavedPrompt, ScriptData, MoodBoard } from '../types';

const DB_NAME = 'DesignAgentDB';
const DB_VERSION = 7; // Incremented for Image Blobs

// ============================================
// IMAGE BLOB STORAGE UTILITIES
// ============================================

/**
 * Convert base64 data URL to Blob for efficient storage
 */
const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binaryString = atob(parts[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
};

/**
 * Convert Blob back to base64 data URL
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Generate a thumbnail from base64 image
 */
const generateThumbnailFromBase64 = (base64: string, maxWidth: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = base64;
    });
};

/**
 * Check if a URL is a base64 data URL
 */
const isBase64DataUrl = (url: string): boolean => {
    return url.startsWith('data:image');
};

/**
 * Get the approximate size of a base64 string in bytes
 */
const getBase64Size = (base64: string): number => {
    const data = base64.split(',')[1] || base64;
    return Math.round(data.length * 0.75);
};

// Threshold for blob storage (500KB) - images larger than this get stored as blobs
const BLOB_STORAGE_THRESHOLD = 500 * 1024;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('history')) {
        const store = db.createObjectStore('history', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('library')) {
        const store = db.createObjectStore('library', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('videos')) {
        const store = db.createObjectStore('videos', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('prompts')) {
        const store = db.createObjectStore('prompts', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }

      // Scripts Store (existing)
      if (!db.objectStoreNames.contains('scripts')) {
          db.createObjectStore('scripts', { keyPath: 'projectId' });
      }

      // NEW: Locations Store for World Bible
      if (!db.objectStoreNames.contains('locations')) {
          const store = db.createObjectStore('locations', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
      }

      // NEW: Products Store for World Bible
      if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
      }

      // NEW: Mood Boards Store
      if (!db.objectStoreNames.contains('moodboards')) {
          const store = db.createObjectStore('moodboards', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
      }

      // NEW: Image Blobs Store for optimized storage
      if (!db.objectStoreNames.contains('imageBlobs')) {
          db.createObjectStore('imageBlobs', { keyPath: 'id' });
      }
    };
  });
};

export const db = {
  getProjects: async (): Promise<Project[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveProject: async (project: Project): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put(project);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  deleteProject: async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(['projects', 'messages', 'history', 'library', 'videos', 'prompts', 'scripts', 'locations', 'products', 'moodboards', 'imageBlobs'], 'readwrite');
    
    tx.objectStore('projects').delete(id);
    
    // Helper to delete by index
    const deleteByProject = (storeName: string) => {
        if(db.objectStoreNames.contains(storeName)) {
            const store = tx.objectStore(storeName);
            // scripts uses projectId as keyPath, handled separately
            if (storeName === 'scripts') {
                store.delete(id);
            } else {
                const index = store.index('projectId');
                const request = index.openCursor(IDBKeyRange.only(id));
                request.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            }
        }
    };

    deleteByProject('messages');
    deleteByProject('history');
    deleteByProject('library');
    deleteByProject('videos');
    deleteByProject('prompts');
    deleteByProject('scripts');
    deleteByProject('locations');  // NEW
    deleteByProject('products');   // NEW
    deleteByProject('moodboards'); // NEW

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getMessages: async (projectId: string): Promise<Message[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const index = tx.objectStore('messages').index('projectId');
      const request = index.getAll(IDBKeyRange.only(projectId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveMessage: async (message: Message): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put(message);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getHistory: async (projectId: string): Promise<GeneratedImage[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const index = tx.objectStore('history').index('projectId');
      const request = index.getAll(IDBKeyRange.only(projectId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveHistoryImage: async (image: GeneratedImage): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').put(image);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  deleteHistoryImage: async (imageId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').delete(imageId);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getLibrary: async (projectId: string): Promise<SavedEntity[]> => {
     const db = await openDB();
     return new Promise((resolve, reject) => {
       const tx = db.transaction('library', 'readonly');
       const index = tx.objectStore('library').index('projectId');
       const request = index.getAll(IDBKeyRange.only(projectId));
       request.onsuccess = () => resolve(request.result);
       request.onerror = () => reject(request.error);
     });
  },

  saveLibraryItem: async (item: SavedEntity): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('library', 'readwrite');
    tx.objectStore('library').put(item);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },
  
  deleteLibraryItem: async (id: string): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction('library', 'readwrite');
      tx.objectStore('library').delete(id);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getVideos: async (projectId: string): Promise<GeneratedVideo[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readonly');
      const index = tx.objectStore('videos').index('projectId');
      const request = index.getAll(IDBKeyRange.only(projectId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveVideo: async (video: GeneratedVideo): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').put(video);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  deleteVideo: async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getSavedPrompts: async (projectId: string): Promise<SavedPrompt[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('prompts', 'readonly');
      const index = tx.objectStore('prompts').index('projectId');
      const request = index.getAll(IDBKeyRange.only(projectId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  savePrompt: async (prompt: SavedPrompt): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('prompts', 'readwrite');
    tx.objectStore('prompts').put(prompt);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  deletePrompt: async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('prompts', 'readwrite');
    tx.objectStore('prompts').delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  // Script Data Methods - UPDATED for World Bible
  saveScriptData: async (projectId: string, data: ScriptData): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction('scripts', 'readwrite');
      tx.objectStore('scripts').put({ 
          projectId, 
          content: data.content,
          beats: data.beats,
          characters: data.characters,
          locations: data.locations || [],      // NEW
          products: data.products || [],        // NEW
          productionDesign: data.productionDesign
      });
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  },

  getScriptData: async (projectId: string): Promise<ScriptData | null> => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction('scripts', 'readonly');
          const store = tx.objectStore('scripts');
          const request = store.get(projectId);
          request.onsuccess = () => resolve(request.result ? {
              content: request.result.content,
              beats: request.result.beats,
              characters: request.result.characters,
              locations: request.result.locations || [],      // NEW with fallback
              products: request.result.products || [],        // NEW with fallback
              productionDesign: request.result.productionDesign
          } : null);
          request.onerror = () => reject(request.error);
      });
  },

  // Mood Board Methods
  getMoodBoards: async (projectId: string): Promise<MoodBoard[]> => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction('moodboards', 'readonly');
          const index = tx.objectStore('moodboards').index('projectId');
          const request = index.getAll(IDBKeyRange.only(projectId));
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
      });
  },

  saveMoodBoard: async (projectId: string, moodBoard: MoodBoard): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction('moodboards', 'readwrite');
      tx.objectStore('moodboards').put({ ...moodBoard, projectId });
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  },

  deleteMoodBoard: async (id: string): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction('moodboards', 'readwrite');
      tx.objectStore('moodboards').delete(id);
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  },

  // ============================================
  // IMAGE BLOB STORAGE METHODS
  // ============================================

  /**
   * Store an image with optimized blob storage for large images.
   * Images > 500KB are stored as blobs with thumbnails.
   * Returns the image with thumbnail URL for display.
   */
  saveImageOptimized: async (image: GeneratedImage): Promise<GeneratedImage> => {
      const db = await openDB();

      // Check if image is large enough to warrant blob storage
      if (isBase64DataUrl(image.url) && getBase64Size(image.url) > BLOB_STORAGE_THRESHOLD) {
          try {
              // Generate thumbnail for display
              const thumbnail = await generateThumbnailFromBase64(image.url, 400);

              // Convert full image to blob for storage
              const blob = base64ToBlob(image.url);

              // Store blob separately
              const blobTx = db.transaction('imageBlobs', 'readwrite');
              blobTx.objectStore('imageBlobs').put({
                  id: image.id,
                  blob: blob,
                  originalSize: getBase64Size(image.url)
              });

              await new Promise<void>((resolve, reject) => {
                  blobTx.oncomplete = () => resolve();
                  blobTx.onerror = () => reject(blobTx.error);
              });

              // Store image metadata with thumbnail (not full image)
              const optimizedImage: GeneratedImage = {
                  ...image,
                  url: thumbnail,  // Use thumbnail for display
                  thumbnail: thumbnail,
                  hasBlobStorage: true  // Flag to indicate blob storage
              };

              return optimizedImage;
          } catch (e) {
              console.warn('Failed to optimize image storage, using original:', e);
              return image;
          }
      }

      return image;
  },

  /**
   * Retrieve the full-resolution image from blob storage
   */
  getFullResolutionImage: async (imageId: string): Promise<string | null> => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction('imageBlobs', 'readonly');
          const store = tx.objectStore('imageBlobs');
          const request = store.get(imageId);

          request.onsuccess = async () => {
              const result = request.result;
              if (result?.blob) {
                  try {
                      const base64 = await blobToBase64(result.blob);
                      resolve(base64);
                  } catch {
                      resolve(null);
                  }
              } else {
                  resolve(null);
              }
          };
          request.onerror = () => reject(request.error);
      });
  },

  /**
   * Delete an image blob
   */
  deleteImageBlob: async (imageId: string): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction('imageBlobs', 'readwrite');
      tx.objectStore('imageBlobs').delete(imageId);
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  },

  /**
   * Get storage statistics
   */
  getStorageStats: async (): Promise<{ blobCount: number; estimatedSize: number }> => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction('imageBlobs', 'readonly');
          const store = tx.objectStore('imageBlobs');
          const request = store.getAll();

          request.onsuccess = () => {
              const blobs = request.result || [];
              const estimatedSize = blobs.reduce((sum, b) => sum + (b.originalSize || 0), 0);
              resolve({
                  blobCount: blobs.length,
                  estimatedSize
              });
          };
          request.onerror = () => reject(request.error);
      });
  }
};

// Export utilities for use elsewhere
export { isBase64DataUrl, getBase64Size, base64ToBlob, blobToBase64 };
