/**
 * Supabase Storage Service for Design Agent v7
 * Handles image upload/download via Supabase Storage
 */

import { getSupabase, SUPABASE_URL } from './supabase';

const BUCKET_NAME = 'design-agent-images';

/**
 * Upload a base64 image to Supabase Storage
 * @param projectId - Project ID for organizing images
 * @param imageId - Unique image identifier
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (
  projectId: string,
  imageId: string,
  base64Data: string
): Promise<string | null> => {
  const client = getSupabase();

  try {
    // Remove data URL prefix if present
    let base64Content = base64Data;
    let contentType = 'image/png';

    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        base64Content = match[2];
      }
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file extension from content type
    const extension = contentType.split('/')[1] || 'png';
    const filePath = `${projectId}/images/${imageId}.${extension}`;

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Failed to upload image:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
};

/**
 * Batch upload multiple images
 * @param projectId - Project ID
 * @param images - Array of {id, base64} objects
 * @returns Map of imageId to public URL
 */
export const uploadImages = async (
  projectId: string,
  images: { id: string; base64: string }[]
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Upload in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const uploads = await Promise.allSettled(
      batch.map(async (img) => {
        const url = await uploadImage(projectId, img.id, img.base64);
        if (url) results.set(img.id, url);
        return { id: img.id, url };
      })
    );
  }

  return results;
};

/**
 * Delete an image from storage
 */
export const deleteImage = async (
  projectId: string,
  imageId: string
): Promise<boolean> => {
  const client = getSupabase();

  try {
    // Try common extensions
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];

    for (const ext of extensions) {
      const filePath = `${projectId}/images/${imageId}.${ext}`;
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (!error) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};

/**
 * Delete all images for a project
 */
export const deleteProjectImages = async (projectId: string): Promise<boolean> => {
  const client = getSupabase();

  try {
    // List all files in project folder
    const { data: files, error: listError } = await client.storage
      .from(BUCKET_NAME)
      .list(`${projectId}/images`);

    if (listError || !files || files.length === 0) {
      return true; // No files to delete
    }

    // Delete all files
    const filePaths = files.map(f => `${projectId}/images/${f.name}`);
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (error) {
      console.error('Failed to delete project images:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete project images:', error);
    return false;
  }
};

/**
 * Get the public URL for an image
 */
export const getImageUrl = (projectId: string, imageId: string, extension = 'png'): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${projectId}/images/${imageId}.${extension}`;
};

/**
 * Check if an image exists in storage
 */
export const imageExists = async (
  projectId: string,
  imageId: string
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const { data } = await client.storage
      .from(BUCKET_NAME)
      .list(`${projectId}/images`, {
        search: imageId
      });

    return data !== null && data.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Upload from URL (download and re-upload to Supabase)
 */
export const uploadFromUrl = async (
  projectId: string,
  imageId: string,
  imageUrl: string
): Promise<string | null> => {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image from URL:', response.statusText);
      return null;
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const client = getSupabase();
    const contentType = blob.type || 'image/png';
    const extension = contentType.split('/')[1] || 'png';
    const filePath = `${projectId}/images/${imageId}.${extension}`;

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Failed to upload image from URL:', error);
      return null;
    }

    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image from URL:', error);
    return null;
  }
};
