
import { Project, Message, GeneratedImage, SavedEntity, GeneratedVideo, SavedPrompt, ScriptData, MoodBoard } from '../types';

const DB_NAME = 'DesignAgentDB';
const DB_VERSION = 6; // Incremented for Mood Boards

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
    const tx = db.transaction(['projects', 'messages', 'history', 'library', 'videos', 'prompts', 'scripts', 'locations', 'products', 'moodboards'], 'readwrite');
    
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
  }
};
