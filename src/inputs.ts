import type { FileInput, UrlInput } from './types';
import { isBuffer, isUint8Array, isUrl } from './types';
import { ValidationError } from './errors';
import fs from 'fs';
import path from 'path';

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
export async function processFileInput(input: Exclude<FileInput, UrlInput>): Promise<NormalizedFileData> {
  if (typeof input === 'string') {
    return await processFilePathInput(input);
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
        error: streamError.message,
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

/**
 * Validation that the input is a remote file type
 */
export function isRemoteFileInput(input: FileInput): input is UrlInput | string {
  if (typeof input === 'string') {
    return isUrl(input);
  }

  return typeof input === 'object' && input !== null && 'type' in input && input.type === 'url';
}

/**
 * Process Remote File Input
 */
export async function processRemoteFileInput(input: UrlInput | string): Promise<NormalizedFileData> {
  let url: string;
  if (typeof input === 'string') {
    url = input;
  } else {
    url = input.url;
  }

  const buffer = await fetchFromUrl(url);
  return {
    data: buffer,
    filename: 'buffer',
  };
}

/**
 * Fetches data from a URL and returns it as a Buffer
 * 
 * @param url - The URL to fetch data from
 * @returns A Buffer containing the fetched data
 * @throws {ValidationError} If the fetch fails or returns a non-OK response
 */
async function fetchFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch URL: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return Buffer.from(await response.arrayBuffer());
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
 * Zero dependency way to get the number of pages in a PDF.
 * 
 * @param pdfInput - File path, URL, Buffer, or Uint8Array. Has to be of a PDF file
 * @returns Number of pages in a PDF
 * @throws {ValidationError} If the input is not a valid PDF or if the page count cannot be determined
 */
export async function getPdfPageCount(pdfInput: FileInput): Promise<number> {
  let pdfBytes: Buffer;

  // Handle different input types
  if (typeof pdfInput === 'string') {
    if (isUrl(pdfInput)) {
      // Handle URL string
      pdfBytes = await fetchFromUrl(pdfInput);
    } else {
      // Handle file path string
      try {
        pdfBytes = await fs.promises.readFile(pdfInput);
      } catch (error) {
        throw new ValidationError(`Failed to read PDF file: ${pdfInput}`, {
          filePath: pdfInput,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } else if (isBuffer(pdfInput)) {
    pdfBytes = pdfInput;
  } else if (isUint8Array(pdfInput)) {
    pdfBytes = Buffer.from(pdfInput);
  } else if (typeof pdfInput === 'object' && pdfInput !== null && 'type' in pdfInput) {
    switch (pdfInput.type) {
      case 'file-path':
        try {
          pdfBytes = await fs.promises.readFile(pdfInput.path);
        } catch (error) {
          throw new ValidationError(`Failed to read PDF file: ${pdfInput.path}`, {
            filePath: pdfInput.path,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      case 'buffer':
        pdfBytes = pdfInput.buffer;
        break;
      case 'uint8array':
        pdfBytes = Buffer.from(pdfInput.data);
        break;
      case 'url':
        pdfBytes = await fetchFromUrl(pdfInput.url);
        break;
      default:
        throw new ValidationError(`Unsupported input type: ${(pdfInput as { type: string }).type}`, {
          input: pdfInput,
        });
    }
  } else {
    throw new ValidationError('Invalid PDF input provided', { input: pdfInput });
  }

  // Convert to string for regex operations
  const pdfContent = pdfBytes.toString('binary');

  // Find all PDF objects
  const objectRegex = /(\d+)\s+(\d+)\s+obj(.*?)endobj/gs;
  const objects: Array<[string, string, string]> = [];

  let match;
  while ((match = objectRegex.exec(pdfContent)) !== null) {
    if (match[1] && match[2] && match[3]) {
      objects.push([match[1], match[2], match[3]]);
    }
  }

  if (objects.length === 0) {
    throw new ValidationError('Could not find any objects in PDF', { input: pdfInput });
  }

  // Get the Catalog Object
  let catalogObj: string | null = null;
  for (const [, , objData] of objects) {
    if (objData.includes('/Type') && objData.includes('/Catalog')) {
      catalogObj = objData;
      break;
    }
  }

  if (!catalogObj) {
    throw new ValidationError('Could not find /Catalog object in PDF', { input: pdfInput });
  }

  // Extract /Pages reference (e.g. 3 0 R)
  const pagesRefMatch = /\/Pages\s+(\d+)\s+(\d+)\s+R/.exec(catalogObj);
  if (!pagesRefMatch) {
    throw new ValidationError('Could not find /Pages reference in /Catalog', { input: pdfInput });
  }

  const pagesObjNum = pagesRefMatch[1];
  const pagesObjGen = pagesRefMatch[2];

  // Find the referenced /Pages object
  const pagesObjPattern = new RegExp(`${pagesObjNum}\\s+${pagesObjGen}\\s+obj(.*?)endobj`, 'gs');
  const pagesObjMatch = pagesObjPattern.exec(pdfContent);

  if (!pagesObjMatch) {
    throw new ValidationError('Could not find root /Pages object', { input: pdfInput });
  }

  const pagesObjData = pagesObjMatch[1];

  // Extract /Count
  const countMatch = /\/Count\s+(\d+)/.exec(pagesObjData as string);
  if (!countMatch) {
    throw new ValidationError('Could not find /Count in root /Pages object', { input: pdfInput });
  }

  return parseInt(countMatch[1] as string, 10);
}
