import type { NutrientClientOptions } from './types/common';
import type { FileInput } from './types';
import type { components } from './types/nutrient-api';
import { ValidationError } from './errors';
import { sendRequest } from './http';
import { validateFileInput } from './inputs';
import { WorkflowBuilder } from './workflow';
import { BuildApiBuilder, BuildActions } from './build';

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
   *   { optimize: true }
   * );
   * ```
   */
  async convert(
    file: FileInput,
    targetFormat: 'pdf' | 'pdfa' | 'docx' | 'xlsx' | 'pptx' | 'png' | 'jpeg' | 'webp',
    options?: {
      optimize?: boolean;
      conformance?: components['schemas']['PDFAOutput']['conformance'];
      width?: number;
      height?: number;
      dpi?: number;
    },
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    const builder = this.build().addFile(file);

    // Set output based on target format
    switch (targetFormat) {
      case 'pdf':
        builder.setOutput({
          type: 'pdf',
          ...(options?.optimize && {
            optimize: {
              linearize: true,
              imageOptimizationQuality: 2,
            },
          }),
        });
        break;
      case 'pdfa':
        builder.setOutput({
          type: 'pdfa',
          conformance: options?.conformance,
        });
        break;
      case 'docx':
      case 'xlsx':
      case 'pptx':
        builder.setOutput({ type: targetFormat });
        break;
      case 'png':
      case 'jpeg':
      case 'webp':
        builder.setOutput({
          type: 'image',
          format: targetFormat === 'jpeg' ? 'jpg' : targetFormat,
          ...(options?.width && { width: options.width }),
          ...(options?.height && { height: options.height }),
          ...(options?.dpi && { dpi: options.dpi }),
        });
        break;
      default:
        throw new ValidationError(`Unsupported target format: ${targetFormat as string}`);
    }

    return builder.execute<Blob>();
  }

  /**
   * Merges multiple documents into one
   *
   * @param files - Array of document files to merge
   * @param outputFormat - Output format for merged document (default: 'pdf')
   * @returns Promise resolving to the merged file
   *
   * @example
   * ```typescript
   * const mergedPdf = await client.merge([
   *   'doc1.pdf',
   *   'doc2.pdf',
   *   'doc3.pdf'
   * ]);
   * ```
   */
  async merge(files: FileInput[], outputFormat: 'pdf' | 'pdfa' = 'pdf'): Promise<Blob> {
    if (!Array.isArray(files) || files.length < 2) {
      throw new ValidationError('At least 2 files are required for merge operation');
    }

    // Validate all files
    const builder = this.build();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !validateFileInput(file)) {
        throw new ValidationError(`Invalid file at index ${i}`, { file });
      }
      builder.addFile(file);
    }

    // Set output format
    if (outputFormat === 'pdfa') {
      builder.setOutput({ type: 'pdfa' });
    } else {
      builder.setOutput({ type: 'pdf' });
    }

    return builder.execute<Blob>();
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
    compressionLevel: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    // Map compression levels to optimization settings
    const optimizationSettings: components['schemas']['OptimizePdf'] = {};
    switch (compressionLevel) {
      case 'low':
        optimizationSettings.imageOptimizationQuality = 4;
        break;
      case 'medium':
        optimizationSettings.imageOptimizationQuality = 2;
        optimizationSettings.linearize = true;
        break;
      case 'high':
        optimizationSettings.imageOptimizationQuality = 1;
        optimizationSettings.linearize = true;
        optimizationSettings.mrcCompression = true;
        optimizationSettings.disableImages = false;
        optimizationSettings.grayscaleImages = true;
        break;
    }

    return this.build()
      .addFile(file)
      .setOutput({
        type: 'pdf',
        optimize: optimizationSettings,
      })
      .execute<Blob>();
  }

  /**
   * Extracts text content from a document
   *
   * @param file - The document file to extract text from
   * @param options - Extraction options
   * @returns Promise resolving to extracted text and metadata
   *
   * @example
   * ```typescript
   * const result = await client.extractText(
   *   'document.pdf',
   *   { structuredText: true, tables: true }
   * );
   * console.log(result.plainText);
   * console.log(result.tables);
   * ```
   */
  async extractText(
    file: FileInput,
    options?: {
      structuredText?: boolean;
      keyValuePairs?: boolean;
      tables?: boolean;
      language?: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][];
    },
  ): Promise<components['schemas']['JSONContentOutput']> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    return this.build()
      .addFile(file)
      .setOutput({
        type: 'json-content',
        plainText: true,
        structuredText: options?.structuredText,
        keyValuePairs: options?.keyValuePairs,
        tables: options?.tables,
        language: options?.language,
      })
      .execute<components['schemas']['JSONContentOutput']>();
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
   *     opacity: 0.3,
   *     fontSize: 48,
   *     fontColor: '#FF0000'
   *   }
   * );
   * ```
   */
  async watermark(
    file: FileInput,
    watermarkText: string,
    options?: {
      opacity?: number;
      fontSize?: number;
      fontColor?: string;
      fontFamily?: string;
      rotation?: number;
    },
  ): Promise<Blob> {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided', { file });
    }

    if (!watermarkText || typeof watermarkText !== 'string') {
      throw new ValidationError('Watermark text is required and must be a string');
    }

    // Create watermark action with sensible defaults
    const watermarkAction = BuildActions.watermarkText(watermarkText, {
      width: { value: 50, unit: '%' as const },
      height: { value: 50, unit: '%' as const },
      opacity: options?.opacity ?? 0.5,
      fontSize: options?.fontSize ?? 36,
      fontColor: options?.fontColor ?? '#000000',
      fontFamily: options?.fontFamily ?? 'Helvetica',
      rotation: options?.rotation ?? 45,
    });

    return this.build()
      .addFile(file)
      .withActions([watermarkAction])
      .setOutput({ type: 'pdf' })
      .execute<Blob>();
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
   * Creates a new BuildApiBuilder for assembling documents using the Build API
   *
   * @returns A new BuildApiBuilder instance
   *
   * @example
   * ```typescript
   * const result = await client
   *   .build()
   *   .addFile('page1.pdf')
   *   .addFile('page2.pdf', { pages: { start: 0, end: 2 } })
   *   .addHtml('<h1>Cover Page</h1>')
   *   .withActions([BuildActions.ocr('english')])
   *   .execute();
   * ```
   */
  build(): BuildApiBuilder {
    return new BuildApiBuilder(this.options);
  }

  /**
   * Analyzes a Build API request without executing it
   * Returns the credit cost that would be consumed
   *
   * @param instructions - Build instructions to analyze
   * @returns Promise resolving to the analysis result
   *
   * @example
   * ```typescript
   * const builder = client.build().addFile('document.pdf');
   * const analysis = await client.analyzeBuild(builder.getInstructions());
   * console.log(`This operation would cost ${analysis.cost} credits`);
   * ```
   */
  async analyzeBuild(
    instructions: components['schemas']['BuildInstructions'],
  ): Promise<components['schemas']['AnalyzeBuildResponse']> {
    const response = await sendRequest<components['schemas']['AnalyzeBuildResponse']>(
      {
        endpoint: '/analyze_build',
        method: 'POST',
        data: instructions,
      },
      this.options,
    );

    return response.data;
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
    return this.options.baseUrl ?? 'https://api.nutrient.io';
  }
}
