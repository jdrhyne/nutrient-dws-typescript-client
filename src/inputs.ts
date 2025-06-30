import type { FileInput } from './types/inputs';
import { isBuffer, isUint8Array, isUrl } from './types/inputs';
import { ValidationError } from './errors';

/**
 * Normalized file data for internal processing (Node.js only)
 */
export interface NormalizedFileData {
  data: Buffer | Uint8Array | NodeJS.ReadableStream;
  filename: string;
  contentType?: string;
}

/**
 * Processes various file input types into a normalized format (Node.js only)
 */
export async function processFileInput(input: FileInput): Promise<NormalizedFileData> {
  if (typeof input === 'string') {
    if (isUrl(input)) {
      return await processUrlInput(input);
    } else {
      return await processFilePathInput(input);
    }
  }

  if (isBuffer(input)) {
    return processBufferInput(input);
  }

  if (isUint8Array(input)) {
    return processUint8ArrayInput(input);
  }

  // Handle structured input objects
  if (typeof input === 'object' && input !== null) {
    if ('type' in input) {
      switch (input.type) {
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
 * Process Buffer (Node.js)
 */
function processBufferInput(buffer: Buffer, filename?: string): NormalizedFileData {
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

    // Add error handling to ensure stream is properly closed on errors
    readStream.on('error', (streamError) => {
      readStream.destroy();
      throw new ValidationError(`Failed to read file: ${filePath}`, {
        filePath,
        error: streamError instanceof Error ? streamError.message : String(streamError),
      });
    });

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
 * Process URL input (Node.js only)
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

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = getFilenameFromUrl(url) ?? 'download';

    return {
      data: buffer,
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
 * Validates that the input is a supported file type (Node.js only)
 */
export function validateFileInput(input: unknown): input is FileInput {
  if (typeof input === 'string') {
    return true; // Could be file path or URL
  }

  if (isBuffer(input) || isUint8Array(input)) {
    return true;
  }

  if (typeof input === 'object' && input !== null && 'type' in input) {
    const typedInput = input as { type: string };
    return ['file-path', 'buffer', 'uint8array', 'url'].includes(
      typedInput.type,
    );
  }

  return false;
}
