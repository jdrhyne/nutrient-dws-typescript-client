import type { FileInput, NutrientClientOptions, WorkflowInitialStage, WorkflowResult, TypedWorkflowResult } from './types';
import { ValidationError } from './errors';
import { workflow } from './workflow';
import type { components } from './generated/api-types';

const DEFAULT_DIMENSION = { value: 100, unit: '%' as const }

/**
 * Main client for interacting with the Nutrient Document Web Services API.
 *
 * @example
 * ```typescript
 * // Server-side usage with API key
 * const client = new NutrientClient({
 *   apiKey: 'your-secret-api-key'
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
   * Creates a new WorkflowBuilder for chaining multiple operations
   *
   * @returns A new WorkflowBuilder instance
   *
   * @example
   * ```typescript
   * const result = await client
   *   .workflow()
   *   .addFilePart('document.docx')
   *   .applyAction(BuildActions.ocr('english'))
   *   .outputPdf()
   *   .execute();
   * ```
   */
  workflow(): WorkflowInitialStage {
    return workflow(this.options);
  }


  /**
   * Performs OCR (Optical Character Recognition) on a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to perform OCR on
   * @param language - The language(s) to use for OCR
   * @param outputFormat - The output format (default: 'pdf')
   * @returns Promise resolving to the OCR result
   *
   * @example
   * ```typescript
   * const result = await client.ocr('scanned-document.pdf', 'english');
   * ```
   */
  async ocr(
    file: FileInput,
    language: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][],
    outputFormat: 'pdf' | 'pdfa' = 'pdf',
  ): Promise<WorkflowResult> {
    const ocrAction: components['schemas']['OcrAction'] = {
      type: 'ocr',
      language,
    };

    const builder = this.workflow().addFilePart(file, undefined, [ocrAction]);

    return outputFormat === 'pdf' 
      ? builder.outputPdf().execute()
      : builder.outputPdfA().execute();
  }

  /**
   * Adds a text watermark to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to watermark
   * @param text - The watermark text
   * @param options - Watermark options
   * @param outputFormat - The output format (default: 'pdf')
   * @returns Promise resolving to the watermarked document
   *
   * @example
   * ```typescript
   * const result = await client.watermark('document.pdf', 'CONFIDENTIAL', {
   *   opacity: 0.5,
   *   fontSize: 24
   * });
   * ```
   */
  async watermark(
    file: FileInput,
    text: string,
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {},
    outputFormat: 'pdf' | 'pdfa' = 'pdf',
  ): Promise<WorkflowResult> {
    const watermarkAction: components['schemas']['TextWatermarkAction'] = {
      type: 'watermark',
      text,
      rotation: options.rotation ?? 0,
      width: options.width ?? DEFAULT_DIMENSION,
      height: options.height ?? DEFAULT_DIMENSION,
      ...options,
    };

    const builder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    return outputFormat === 'pdf'
      ? builder.outputPdf().execute()
      : builder.outputPdfA().execute();
  }

  /**
   * Converts a document to a different format
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to convert
   * @param targetFormat - The target format to convert to
   * @returns Promise resolving to the converted document
   *
   * @example
   * ```typescript
   * const result = await client.convert('document.docx', 'pdf');
   * ```
   */
  async convert(
    file: FileInput,
    targetFormat: 'pdf' | 'pdfa' | 'docx' | 'xlsx' | 'pptx' | 'image',
  ): Promise<WorkflowResult> {
    const builder = this.workflow().addFilePart(file);

    switch (targetFormat) {
      case 'pdf':
        return builder.outputPdf().execute();
      case 'pdfa':
        return builder.outputPdfA().execute();
      case 'docx':
        return builder.outputOffice('docx').execute();
      case 'xlsx':
        return builder.outputOffice('xlsx').execute();
      case 'pptx':
        return builder.outputOffice('pptx').execute();
      case 'image':
        return builder.outputImage().execute();
      default:
        throw new ValidationError(`Unsupported target format: ${String(targetFormat)}`);
    }
  }

  /**
   * Merges multiple documents into a single document
   * This is a convenience method that uses the workflow builder.
   *
   * @param files - The files to merge
   * @param outputFormat - The output format (default: 'pdf')
   * @returns Promise resolving to the merged document
   *
   * @example
   * ```typescript
   * const result = await client.merge(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
   * ```
   */
  merge(
    files: FileInput[],
    outputFormat: 'pdf' | 'pdfa' = 'pdf',
  ): Promise<WorkflowResult> {
    if (!files || files.length < 2) {
      throw new ValidationError('At least 2 files are required for merge operation');
    }

    const [firstFile, ...restFiles] = files;
    if (!firstFile) {
      throw new ValidationError('First file is required');
    }

    let builder = this.workflow().addFilePart(firstFile);
    
    for (const file of restFiles) {
      builder = builder.addFilePart(file);
    }

    return outputFormat === 'pdf'
      ? builder.outputPdf().execute()
      : builder.outputPdfA().execute();
  }

  /**
   * Compresses a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to compress
   * @param level - Compression level (default: 'medium')
   * @returns Promise resolving to the compressed document
   *
   * @example
   * ```typescript
   * const result = await client.compress('large-document.pdf', 'high');
   * ```
   */
  async compress(
    file: FileInput,
    level: 'low' | 'medium' | 'high' | 'maximum' = 'medium',
  ): Promise<WorkflowResult> {
    const compressionOptions = {
      low: { 
        optimize: { 
          imageOptimizationQuality: 3,
          mrcCompression: false 
        } 
      },
      medium: { 
        optimize: { 
          imageOptimizationQuality: 2,
          mrcCompression: true 
        } 
      },
      high: { 
        optimize: { 
          imageOptimizationQuality: 1,
          mrcCompression: true,
          grayscaleImages: true 
        } 
      },
      maximum: { 
        optimize: { 
          imageOptimizationQuality: 0,
          mrcCompression: true,
          grayscaleImages: true,
          grayscaleGraphics: true 
        } 
      },
    };

    return this.workflow()
      .addFilePart(file)
      .outputPdf(compressionOptions[level])
      .execute();
  }

  /**
   * Extracts text content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract text from
   * @returns Promise resolving to the extracted text data
   *
   * @example
   * ```typescript
   * const result = await client.extractText('document.pdf');
   * if (result.success && result.output && 'data' in result.output) {
   *   console.log(result.output.data);
   * }
   * ```
   */
  async extractText(file: FileInput): Promise<TypedWorkflowResult<'json-content'>> {
    return this.workflow()
      .addFilePart(file)
      .outputJson({ plainText: true, structuredText: true })
      .execute();
  }

  /**
   * Flattens annotations in a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to flatten
   * @param annotationIds - Optional specific annotation IDs to flatten
   * @returns Promise resolving to the flattened document
   *
   * @example
   * ```typescript
   * const result = await client.flatten('annotated-document.pdf');
   * ```
   */
  async flatten(
    file: FileInput,
    annotationIds?: (string | number)[],
  ): Promise<WorkflowResult> {
    const flattenAction: components['schemas']['FlattenAction'] = {
      type: 'flatten',
      ...(annotationIds && { annotationIds }),
    };

    return this.workflow()
      .addFilePart(file, undefined, [flattenAction])
      .outputPdf()
      .execute();
  }

  /**
   * Rotates pages in a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to rotate
   * @param angle - Rotation angle (90, 180, or 270 degrees)
   * @param pages - Optional page range to rotate (e.g., { start: 1, end: 3 })
   * @returns Promise resolving to the rotated document
   *
   * @example
   * ```typescript
   * const result = await client.rotate('document.pdf', 90);
   * // Or rotate specific pages:
   * const result = await client.rotate('document.pdf', 90, { start: 1, end: 3 });
   * ```
   */
  async rotate(
    file: FileInput,
    angle: 90 | 180 | 270,
    pages?: { start?: number; end?: number },
  ): Promise<WorkflowResult> {
    const rotateAction: components['schemas']['RotateAction'] = {
      type: 'rotate',
      rotateBy: angle,
    };

    return this.workflow()
      .addFilePart(file, pages ? { pages } : undefined, [rotateAction])
      .outputPdf()
      .execute();
  }
}
