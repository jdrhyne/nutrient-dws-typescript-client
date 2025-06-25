import type { FileInput } from './types/inputs';
import { isFile, isBlob, isBuffer, isUint8Array, isUrl } from './types/inputs';
import { isNode, isBrowser } from './utils/environment';
import { ValidationError } from './errors';

/**
 * Normalized file data for internal processing
 */
export interface NormalizedFileData {
  data: Buffer | Uint8Array | Blob | NodeJS.ReadableStream;
  filename: string;
  contentType?: string;
}

/**
 * Processes various file input types into a normalized format
 * Works isomorphically across Node.js and browser environments
 */
export async function processFileInput(input: FileInput): Promise<NormalizedFileData> {
  if (typeof input === 'string') {
    if (isUrl(input)) {
      return await processUrlInput(input);
    } else if (isNode()) {
      return await processFilePathInput(input);
    } else {
      throw new ValidationError('File path inputs are only supported in Node.js environment', {
        input,
        environment: 'browser',
      });
    }
  }

  if (isFile(input)) {
    return processBrowserFileInput(input);
  }

  if (isBlob(input)) {
    return processBlobInput(input);
  }

  if (isBuffer(input)) {
    if (!isNode()) {
      throw new ValidationError('Buffer inputs are only supported in Node.js environment', {
        input: 'Buffer',
        environment: 'browser',
      });
    }
    return processBufferInput(input);
  }

  if (isUint8Array(input)) {
    return processUint8ArrayInput(input);
  }

  // Handle structured input objects
  if (typeof input === 'object' && input !== null) {
    if ('type' in input) {
      switch (input.type) {
        case 'browser-file':
          return processBrowserFileInput(input.file);
        case 'blob':
          return processBlobInput(input.blob, input.filename);
        case 'file-path':
          return await processFilePathInput(input.path);
        case 'buffer':
          return processBufferInput(input.buffer, input.filename);
        case 'uint8array':
          return processUint8ArrayInput(input.data, input.filename);
        case 'url':
          return await processUrlInput(input.url);
        default:
          throw new ValidationError(`Unsupported input type: ${(input as { type: string }).type}`, {
            input,
          });
      }
    }
  }

  throw new ValidationError('Invalid file input provided', { input });
}

/**
 * Process Browser File object
 */
function processBrowserFileInput(file: File): NormalizedFileData {
  if (!isBrowser()) {
    throw new ValidationError('File objects are only supported in browser environment', {
      environment: 'node',
    });
  }

  return {
    data: file,
    filename: file.name,
    contentType: file.type || undefined,
  };
}

/**
 * Process Blob object
 */
function processBlobInput(blob: Blob, filename?: string): NormalizedFileData {
  if (!isBrowser()) {
    throw new ValidationError('Blob objects are only supported in browser environment', {
      environment: 'node',
    });
  }

  return {
    data: blob,
    filename: filename ?? 'blob',
    contentType: blob.type || undefined,
  };
}

/**
 * Process Buffer (Node.js)
 */
function processBufferInput(buffer: Buffer, filename?: string): NormalizedFileData {
  if (!isNode()) {
    throw new ValidationError('Buffer objects are only supported in Node.js environment', {
      environment: 'browser',
    });
  }

  return {
    data: buffer,
    filename: filename ?? 'buffer',
  };
}

/**
 * Process Uint8Array
 */
function processUint8ArrayInput(data: Uint8Array, filename?: string): NormalizedFileData {
  return {
    data: data,
    filename: filename ?? 'data.bin',
  };
}

/**
 * Process file path (Node.js only)
 */
async function processFilePathInput(filePath: string): Promise<NormalizedFileData> {
  if (!isNode()) {
    throw new ValidationError('File path inputs are only supported in Node.js environment', {
      filePath,
      environment: 'browser',
    });
  }

  try {
    // Dynamic import to avoid bundling fs in browser builds
    const fs = await import('fs');
    const path = await import('path');

    // Check if file exists
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch {
      throw new ValidationError(`File not found: ${filePath}`, { filePath });
    }

    // Create read stream instead of reading entire file into memory
    const readStream = fs.createReadStream(filePath);
    const filename = path.basename(filePath);

    return {
      data: readStream,
      filename,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to create read stream for file: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Process URL input
 */
async function processUrlInput(url: string): Promise<NormalizedFileData> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch URL: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }

    const blob = await response.blob();
    const filename = getFilenameFromUrl(url) ?? 'download';

    return {
      data: blob,
      filename,
      contentType: response.headers.get('content-type') ?? undefined,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to fetch URL: ${url}`, {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename && filename.length > 0 ? filename : null;
  } catch {
    return null;
  }
}

/**
 * Validates that the input is a supported file type
 */
export function validateFileInput(input: unknown): input is FileInput {
  if (typeof input === 'string') {
    return true; // Could be file path or URL
  }

  if (isFile(input) || isBlob(input) || isBuffer(input) || isUint8Array(input)) {
    return true;
  }

  if (typeof input === 'object' && input !== null && 'type' in input) {
    const typedInput = input as { type: string };
    return ['browser-file', 'blob', 'file-path', 'buffer', 'uint8array', 'url'].includes(
      typedInput.type,
    );
  }

  return false;
}
