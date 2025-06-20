import type { NutrientClientOptions } from './types/common';
import type {
  FileInput,
  ConvertOperation,
  MergeOperation,
  CompressOperation,
  WatermarkOperation,
} from './types';
import type { ExtractTextResponse } from './types/responses';
import { ValidationError } from './errors';
import { sendRequest } from './http';
import { validateFileInput } from './inputs';
import { WorkflowBuilder } from './workflow';

/**
 * Main client for interacting with the Nutrient Document Web Services API.
 *
 * @example
 * ```typescript
 * // Server-side usage with API key
 * const client = new NutrientClient({
 *   apiKey: 'nutr_sk_...'
 * });
 *
 * // Client-side usage with token provider
 * const client = new NutrientClient({
 *   apiKey: async () => {
 *     const response = await fetch('/api/get-nutrient-token');
 *     const { token } = await response.json();
 *     return token;
 *   }
 * });
 * ```
 */
export class NutrientClient {
  /**
   * Client configuration options
   */
  private options: NutrientClientOptions;

  /**
   * Creates a new NutrientClient instance
   *
   * @param options - Configuration options for the client
   * @throws {ValidationError} If options are invalid
   */
  constructor(options: NutrientClientOptions) {
    this.validateOptions(options);
    this.options = options;
  }

  /**
   * Validates client options
   */
  private validateOptions(options: NutrientClientOptions): void {
    if (!options) {
      throw new ValidationError('Client options are required');
    }

    if (!options.apiKey) {
      throw new ValidationError('API key is required');
    }

    if (typeof options.apiKey !== 'string' && typeof options.apiKey !== 'function') {
      throw new ValidationError(
        'API key must be a string or a function that returns a Promise<string>',
      );
    }

    if (options.baseUrl && typeof options.baseUrl !== 'string') {
      throw new ValidationError('Base URL must be a string');
    }
  }

  /**
   * Converts a document to a different format
   *
   * @param file - The document file to convert
   * @param targetFormat - Target format for conversion
   * @param options - Additional conversion options
   * @returns Promise resolving to the converted file
   *
   * @example
   * ```typescript
   * const pdfBlob = await client.convert(
   *   'path/to/document.docx',
   *   'pdf',
   *   { quality: 90, optimize: true }
   * );
   * ```
   */
  async convert(
    file: FileInput,
    targetFormat: ConvertOperation['targetFormat'],
    options?: ConvertOperation['options'],
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    const response = await sendRequest<Blob>(
      {
        endpoint: '/convert',
        method: 'POST',
        files: { file },
        data: {
          targetFormat,
          ...options,
        },
      },
      this.options,
    );

    return response.data;
  }

  /**
   * Merges multiple documents into one
   *
   * @param files - Array of document files to merge
   * @param outputFormat - Output format for merged document
   * @returns Promise resolving to the merged file
   *
   * @example
   * ```typescript
   * const mergedPdf = await client.merge([
   *   'doc1.pdf',
   *   'doc2.pdf',
   *   'doc3.pdf'
   * ], 'pdf');
   * ```
   */
  async merge(files: FileInput[], outputFormat?: MergeOperation['outputFormat']): Promise<Blob> {
    if (!Array.isArray(files) || files.length < 2) {
      throw new ValidationError('At least 2 files are required for merge operation');
    }

    // Validate all files
    const filesObject: Record<string, FileInput> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !validateFileInput(file)) {
        throw new ValidationError(`Invalid file at index ${i}`, { file });
      }
      filesObject[`files[${i}]`] = file;
    }

    const response = await sendRequest<Blob>(
      {
        endpoint: '/merge',
        method: 'POST',
        files: filesObject,
        data: {
          outputFormat,
        },
      },
      this.options,
    );

    return response.data;
  }

  /**
   * Compresses a document to reduce file size
   *
   * @param file - The document file to compress
   * @param compressionLevel - Level of compression to apply
   * @returns Promise resolving to the compressed file
   *
   * @example
   * ```typescript
   * const compressedPdf = await client.compress(
   *   largePdfFile,
   *   'high'
   * );
   * ```
   */
  async compress(
    file: FileInput,
    compressionLevel?: CompressOperation['compressionLevel'],
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    const response = await sendRequest<Blob>(
      {
        endpoint: '/compress',
        method: 'POST',
        files: { file },
        data: {
          compressionLevel,
        },
      },
      this.options,
    );

    return response.data;
  }

  /**
   * Extracts text content from a document
   *
   * @param file - The document file to extract text from
   * @param includeMetadata - Whether to include document metadata
   * @returns Promise resolving to extracted text and metadata
   *
   * @example
   * ```typescript
   * const result = await client.extractText(
   *   'document.pdf',
   *   true
   * );
   * console.log(result.text);
   * console.log(result.metadata);
   * ```
   */
  async extractText(file: FileInput, includeMetadata?: boolean): Promise<ExtractTextResponse> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    const response = await sendRequest<ExtractTextResponse>(
      {
        endpoint: '/extract',
        method: 'POST',
        files: { file },
        data: {
          includeMetadata,
        },
      },
      this.options,
    );

    return response.data;
  }

  /**
   * Adds a watermark to a document
   *
   * @param file - The document file to watermark
   * @param watermarkText - Text to use as watermark
   * @param options - Watermark positioning and styling options
   * @returns Promise resolving to the watermarked file
   *
   * @example
   * ```typescript
   * const watermarkedPdf = await client.watermark(
   *   'document.pdf',
   *   'CONFIDENTIAL',
   *   {
   *     position: 'center',
   *     opacity: 0.3,
   *     fontSize: 48
   *   }
   * );
   * ```
   */
  async watermark(
    file: FileInput,
    watermarkText: string,
    options?: Partial<Pick<WatermarkOperation, 'position' | 'opacity' | 'fontSize'>>,
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    if (!watermarkText || typeof watermarkText !== 'string') {
      throw new ValidationError('Watermark text is required and must be a string');
    }

    const response = await sendRequest<Blob>(
      {
        endpoint: '/watermark',
        method: 'POST',
        files: { file },
        data: {
          watermarkText,
          ...options,
        },
      },
      this.options,
    );

    return response.data;
  }

  /**
   * Creates a new WorkflowBuilder for chaining multiple operations
   *
   * @returns A new WorkflowBuilder instance
   *
   * @example
   * ```typescript
   * const result = await client
   *   .buildWorkflow()
   *   .input('document.docx')
   *   .convert('pdf')
   *   .compress('high')
   *   .watermark('DRAFT', { opacity: 0.5 })
   *   .execute();
   * ```
   */
  buildWorkflow(): WorkflowBuilder {
    return new WorkflowBuilder(this.options);
  }

  /**
   * Gets the current API key (for debugging purposes)
   * Note: This will not resolve async functions
   */
  getApiKey(): string | (() => Promise<string>) {
    return this.options.apiKey;
  }

  /**
   * Gets the current base URL
   */
  getBaseUrl(): string {
    return this.options.baseUrl ?? 'https://api.nutrient.io/v1';
  }
}
