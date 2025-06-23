import type { FileInput, NutrientClientOptions, WorkflowInitialStage, WorkflowResult } from './types';
import { ValidationError } from './errors';
import { workflow } from './workflow';
import type { components } from './types/nutrient-api';

const DEFAULT_DIMENSION = { value: 100, unit: '%' as const } as Record<string, never> & {
  value: number;
  unit: '%' | 'pt';
}

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
   * Creates a new WorkflowBuilder for chaining multiple operations
   *
   * @returns A new WorkflowBuilder instance
   *
   * @example
   * ```typescript
   * const result = await client
   *   .workflow()
   *   .input('document.docx')
   *   .convert('pdf')
   *   .compress('high')
   *   .watermark('DRAFT', { opacity: 0.5 })
   *   .execute();
   * ```
   */
  workflow(): WorkflowInitialStage {
    return workflow(this.options);
  }

  /**
   * Performs OCR (Optical Character Recognition) on a document
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

    const workflowBuilder = this.workflow().addFilePart(file, undefined, [ocrAction]);

    if (outputFormat === 'pdf') {
      return workflowBuilder.outputPdf().execute();
    } else {
      return workflowBuilder.outputPdfA().execute();
    }
  }

  /**
   * Adds a text watermark to a document
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
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {
      width: DEFAULT_DIMENSION,
      height: DEFAULT_DIMENSION,
    },
    outputFormat: 'pdf' | 'pdfa' = 'pdf',
  ): Promise<WorkflowResult> {
    const watermarkAction: components['schemas']['TextWatermarkAction'] = {
      type: 'watermark',
      text,
      ...options,
      width: options.width ?? DEFAULT_DIMENSION,
      height: options.height ?? DEFAULT_DIMENSION,
    };

    const workflowBuilder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    if (outputFormat === 'pdf') {
      return workflowBuilder.outputPdf().execute();
    } else {
      return workflowBuilder.outputPdfA().execute();
    }
  }

  /**
   * Converts a document to a different format
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
    const supportedFormats = ['pdf', 'pdfa', 'docx', 'xlsx', 'pptx', 'image'] as const;
    
    if (!supportedFormats.includes(targetFormat as any)) {
      throw new ValidationError(`Unsupported target format: ${targetFormat}. Supported formats: ${supportedFormats.join(', ')}`);
    }

    const workflowBuilder = this.workflow().addFilePart(file);

    switch (targetFormat) {
      case 'pdf':
        return workflowBuilder.outputPdf().execute();
      case 'pdfa':
        return workflowBuilder.outputPdfA().execute();
      case 'docx':
        return workflowBuilder.outputOffice('docx').execute();
      case 'xlsx':
        return workflowBuilder.outputOffice('xlsx').execute();
      case 'pptx':
        return workflowBuilder.outputOffice('pptx').execute();
      case 'image':
        return workflowBuilder.outputImage().execute();
      default:
        throw new ValidationError(`Unsupported target format: ${targetFormat}`);
    }
  }
}
