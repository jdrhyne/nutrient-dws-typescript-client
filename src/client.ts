import type {
  FileInput,
  NutrientClientOptions,
  WorkflowInitialStage,
  WorkflowResult,
  TypedWorkflowResult,
  WorkflowWithPartsStage,
  WorkflowOutput,
  OutputTypeMap,
} from './types';
import { ValidationError, NutrientError } from './errors';
import { workflow } from './workflow';
import type { components, operations } from './generated/api-types';
import { BuildActions } from './build';
import { getPdfPageCount, isRemoteFileInput, processFileInput, processRemoteFileInput } from './inputs';
import { sendRequest } from './http';
import type { NormalizedFileData } from './inputs';
import type { ApplicableAction } from './builders/workflow';

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
   * Gets account information for the current API key
   * 
   * @returns Promise resolving to account information
   * 
   * @example
   * ```typescript
   * const accountInfo = await client.getAccountInfo();
   * console.log(accountInfo.organization);
   * ```
   */
  async getAccountInfo(): Promise<operations['get-account-info']['responses']['200']['content']['application/json']> {
    const response = await sendRequest(
      {
        method: 'GET',
        endpoint: '/account/info',
        data: undefined,
      },
      this.options,
      'json'
    );

    return response.data;
  }

  /**
   * Creates a new authentication token
   * 
   * @param params - Parameters for creating the token
   * @returns Promise resolving to the created token information
   * 
   * @example
   * ```typescript
   * const token = await client.createToken({
   *   name: 'My API Token',
   *   expiresIn: '30d'
   * });
   * console.log(token.id);
   * ```
   */
  async createToken(params: components['schemas']['CreateAuthTokenParameters']): Promise<components['schemas']['CreateAuthTokenResponse']> {
    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/tokens',
        data: params,
      },
      this.options,
      'json'
    );

    return response.data;
  }

  /**
   * Deletes an authentication token
   * 
   * @param id - ID of the token to delete
   * @returns Promise resolving when the token is deleted
   * 
   * @example
   * ```typescript
   * await client.deleteToken('token-id-123');
   * ```
   */
  async deleteToken(id: string): Promise<void> {
    await sendRequest(
      {
        method: 'DELETE',
        endpoint: '/tokens',
        data: { id },
      },
      this.options,
      'json'
    );
  }

  /**
   * Signs a PDF document
   * 
   * @param file - The PDF file to sign
   * @param data - Signature data
   * @param options - Additional options
   * @returns Promise resolving to the signed PDF file ID
   * 
   * @example
   * ```typescript
   * const fileId = await client.signPdf('document.pdf', {
   *   signature: {
   *     name: 'John Doe',
   *     location: 'San Francisco',
   *     reason: 'Approval'
   *   }
   * });
   * ```
   */
  async signPdf(
    file: FileInput,
    data?: components['schemas']['CreateDigitalSignature'],
    options?: {
      image?: FileInput;
      graphicImage?: FileInput;
    }
  ): Promise<WorkflowOutput> {
    // Normalize the file input
    const normalizedFile = isRemoteFileInput(file) ? await processRemoteFileInput(file) : await processFileInput(file);

    // Prepare optional files
    let normalizedImage: NormalizedFileData | undefined;
    let normalizedGraphicImage: NormalizedFileData | undefined;

    if (options?.image) {
      normalizedImage = isRemoteFileInput(options.image) ? await processRemoteFileInput(options.image) : await processFileInput(options.image);
    }

    if (options?.graphicImage) {
      normalizedGraphicImage = isRemoteFileInput(options.graphicImage) ? await processRemoteFileInput(options.graphicImage) : await processFileInput(options.graphicImage);
    }

    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/sign',
        data: {
          file: normalizedFile,
          data,
          image: normalizedImage,
          graphicImage: normalizedGraphicImage,
        },
      },
      this.options,
      'arraybuffer'
    );

    const buffer = new Uint8Array(response.data as unknown as ArrayBuffer);

    return { mimeType: 'application/pdf', filename: 'output.pdf', buffer };
  }

  /**
   * Uses AI to redact sensitive information in a document
   *
   * @param data - Redaction parameters
   * @param file - Optional file to redact
   * @param pages - Optional pages to redact
   * @returns Promise resolving to the redacted file ID
   *
   * @example
   * ```typescript
   * // Redact with file
   * const fileId = await client.aiRedact(
   *   { types: ['PERSON', 'EMAIL'] },
   *   'document.pdf'
   * );
   *
   * // Redact with file ID
   * const fileId = await client.aiRedact(
   *   { 
   *     types: ['PERSON', 'EMAIL'],
   *     fileId: 'existing-file-id'
   *   }
   * );
   * ```
   */
  async createRedactionsAI(
    file: FileInput,
    criteria: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    options?: components['schemas']['RedactData']['options'],
  ): Promise<WorkflowOutput> {
    const normalizedFile = isRemoteFileInput(file) ? await processRemoteFileInput(file) : await processFileInput(file);

    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/ai/redact',
        data: {
          data: {
            documents: [{
              file: "file",
              pages: pages ? { start: pages.start ?? 0, end: pages.end ?? -1 } : undefined
            }],
            criteria,
            redaction_state,
            options,
          },
          file: normalizedFile,
          fileKey: 'file',
        },
      },
      this.options,
      'arraybuffer'
    )

    const buffer = new Uint8Array(response.data as unknown as ArrayBuffer);

    return { mimeType: 'application/pdf', filename: 'output.pdf', buffer };
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
   * Helper function that takes a WorkflowResult, throws any errors, and returns the WorkflowOutput
   * 
   * @param result - The WorkflowResult to process
   * @returns The WorkflowOutput from the result
   * @throws {NutrientError} If the workflow was not successful or if output is missing
   */
  private processWorkflowResult(result: WorkflowResult): WorkflowOutput {
    if (!result.success) {
      // If there are errors, throw the first one
      if (result.errors?.[0]) {
        throw result.errors[0].error;
      }
      // If no specific errors but operation failed
      throw new NutrientError('Workflow operation failed without specific error details', 'WORKFLOW_ERROR');
    }

    // Check if output exists
    if (!result.output) {
      throw new NutrientError('Workflow completed successfully but no output was returned', 'MISSING_OUTPUT');
    }

    return result.output;
  }

  /**
   * Helper function that takes a TypedWorkflowResult, throws any errors, and returns the specific output type
   * 
   * @param result - The TypedWorkflowResult to process
   * @returns The specific output type from the result
   * @throws {NutrientError} If the workflow was not successful or if output is missing
   */
  private processTypedWorkflowResult<T extends keyof OutputTypeMap>(result: TypedWorkflowResult<T>): OutputTypeMap[T] {
    if (!result.success) {
      // If there are errors, throw the first one
      if (result.errors?.[0]) {
        throw result.errors[0].error;
      }
      // If no specific errors but operation failed
      throw new NutrientError('Workflow operation failed without specific error details', 'WORKFLOW_ERROR');
    }

    // Check if output exists
    if (!result.output) {
      throw new NutrientError('Workflow completed successfully but no output was returned', 'MISSING_OUTPUT');
    }

    return result.output as OutputTypeMap[T];
  }


  /**
   * Performs OCR (Optical Character Recognition) on a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to perform OCR on
   * @param language - The language(s) to use for OCR
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
  ): Promise<WorkflowOutput> {
    const ocrAction = BuildActions.ocr(language)

    const builder = this.workflow().addFilePart(file, undefined, [ocrAction]);

    const result = await builder.outputPdf().execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Adds a text watermark to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to watermark
   * @param text - The watermark text
   * @param options - Watermark options
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
  async watermarkText(
    file: FileInput,
    text: string,
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {},
  ): Promise<WorkflowOutput> {
    const watermarkAction = BuildActions.watermarkText(text, options);

    const builder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    const result = await builder.outputPdf().execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Adds a image watermark to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to watermark
   * @param image - The watermark image
   * @param options - Watermark options
   * @returns Promise resolving to the watermarked document
   *
   * @example
   * ```typescript
   * const result = await client.watermark('document.pdf', 'watermark.jpg', {
   *   opacity: 0.5,
   *   fontSize: 24
   * });
   * ```
   */
  async watermarkImage(
    file: FileInput,
    image: FileInput,
    options: Partial<Omit<components['schemas']['ImageWatermarkAction'], 'type' | 'image'>> = {},
  ): Promise<WorkflowOutput> {
    const watermarkAction = BuildActions.watermarkImage(image, options);

    const builder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    const result = await builder.outputPdf().execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Converts a document to a different format
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to convert
   * @param targetFormat - The target format to convert to
   * @returns Promise resolving to the specific output type based on the target format
   *
   * @example
   * ```typescript
   * const result = await client.convert('document.docx', 'pdf');
   * // result will be of type OutputTypeMap['pdf']
   * ```
   */
  async convert<T extends 'pdf' | 'pdfa' | 'pdfua' | 'docx' | 'xlsx' | 'pptx' | "png" | "jpeg" | "jpg" | "webp" | 'html' | 'markdown'>(
    file: FileInput,
    targetFormat: T,
  ): Promise<OutputTypeMap[T]> {
    const builder = this.workflow().addFilePart(file);
    let result: TypedWorkflowResult<T>;

    switch (targetFormat) {
      case 'pdf':
        result = await builder.outputPdf().execute() as TypedWorkflowResult<T>;
        break;
      case 'pdfa':
        result = await builder.outputPdfA().execute() as TypedWorkflowResult<T>;
        break;
      case 'pdfua':
        result = await builder.outputPdfUA().execute() as TypedWorkflowResult<T>;
        break;
      case 'docx':
        result = await builder.outputOffice('docx').execute() as TypedWorkflowResult<T>;
        break;
      case 'xlsx':
        result = await builder.outputOffice('xlsx').execute() as TypedWorkflowResult<T>;
        break;
      case 'pptx':
        result = await builder.outputOffice('pptx').execute() as TypedWorkflowResult<T>;
        break;
      case 'html':
        result = await builder.outputHtml({ layout: 'page' }).execute() as TypedWorkflowResult<T>;
        break;
      case 'markdown':
        result = await builder.outputMarkdown().execute() as TypedWorkflowResult<T>;
        break;
      case 'png':
        result = await builder.outputImage('png', { dpi: 500 }).execute() as TypedWorkflowResult<T>;
        break;
      case 'jpeg':
        result = await builder.outputImage('jpeg', { dpi: 500 }).execute() as TypedWorkflowResult<T>;
        break;
      case 'jpg':
        result = await builder.outputImage('jpg', { dpi: 500 }).execute() as TypedWorkflowResult<T>;
        break;
      case 'webp':
        result = await builder.outputImage('webp', { dpi: 500 }).execute() as TypedWorkflowResult<T>;
        break;
      default:
        throw new ValidationError(`Unsupported target format: ${String(targetFormat)}`);
    }

    return this.processTypedWorkflowResult<T>(result);
  }

  /**
   * Merges multiple documents into a single document
   * This is a convenience method that uses the workflow builder.
   *
   * @param files - The files to merge
   * @returns Promise resolving to the merged document
   *
   * @example
   * ```typescript
   * const result = await client.merge(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
   * ```
   */
  async merge(
    files: FileInput[],
  ): Promise<WorkflowOutput> {
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

    const result = await builder.outputPdf().execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Extracts text content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract text from
   * @param pages - Optional page range to extract text from
   * @returns Promise resolving to the extracted text data
   *
   * @example
   * ```typescript
   * const result = await client.extractText('document.pdf');
   * if (result.success && result.output && 'data' in result.output) {
   *   console.log(result.output.data);
   * }
   * ```
   * 
   * // Extract text from specific pages
   * const result = await client.extractText('document.pdf', { start: 0, end: 2 }); // First 3 pages
   */
  async extractText(
    file: FileInput,
    pages?: { start?: number; end?: number }
  ): Promise<OutputTypeMap['json-content']> {
    const result = await this.workflow()
      .addFilePart(file, pages ? { pages } : undefined)
      .outputJson({ plainText: true, tables: false })
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
  }

  /**
   * Extracts table content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract table from
   * @param pages - Optional page range to extract tables from
   * @returns Promise resolving to the extracted table data
   *
   * @example
   * ```typescript
   * const result = await client.extractTable('document.pdf');
   * if (result.success && result.output && 'data' in result.output) {
   *   console.log(result.output.data);
   * }
   * ```
   * 
   * // Extract tables from specific pages
   * const result = await client.extractTable('document.pdf', { start: 0, end: 2 }); // First 3 pages
   */
  async extractTable(
    file: FileInput,
    pages?: { start?: number; end?: number }
  ): Promise<OutputTypeMap['json-content']> {
    const result = await this.workflow()
      .addFilePart(file, pages ? { pages } : undefined)
      .outputJson({ plainText: false, tables: true})
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
  }


  /**
   * Extracts key value pair content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract KVPs from
   * @param pages - Optional page range to extract KVPs from
   * @returns Promise resolving to the extracted KVPs data
   *
   * @example
   * ```typescript
   * const result = await client.extractKeyValuePairs('document.pdf');
   * if (result.success && result.output && 'data' in result.output) {
   *   console.log(result.output.data);
   * }
   * ```
   * 
   * // Extract KVPs from specific pages
   * const result = await client.extractKeyValuePairs('document.pdf', { start: 0, end: 2 }); // First 3 pages
   */
  async extractKeyValuePairs(
    file: FileInput,
    pages?: { start?: number; end?: number }
  ): Promise<OutputTypeMap['json-content']> {
    const result = await this.workflow()
      .addFilePart(file, pages ? { pages } : undefined)
      .outputJson({ plainText: false, tables: false, keyValuePairs: true })
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
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
  ): Promise<WorkflowOutput> {
    const flattenAction = BuildActions.flatten(annotationIds);

    const result = await this.workflow()
      .addFilePart(file, undefined, [flattenAction])
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
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
  ): Promise<WorkflowOutput> {
    const rotateAction = BuildActions.rotate(angle);

    const result = await this.workflow()
      .addFilePart(file, pages ? { pages } : undefined, [rotateAction])
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Password protects a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to protect
   * @param userPassword - Password required to open the document
   * @param ownerPassword - Password required to modify the document
   * @param permissions - Optional array of permissions granted when opened with user password
   * @returns Promise resolving to the password-protected document
   *
   * @example
   * ```typescript
   * const result = await client.passwordProtect('document.pdf', 'user123', 'owner456');
   * // Or with specific permissions:
   * const result = await client.passwordProtect('document.pdf', 'user123', 'owner456', 
   *   ['printing', 'extract_accessibility']);
   * ```
   */
  async passwordProtect(
    file: FileInput,
    userPassword: string,
    ownerPassword: string,
    permissions?: components['schemas']['PDFUserPermission'][],
  ): Promise<WorkflowOutput> {
    const result = await this.workflow()
      .addFilePart(file)
      .outputPdf({
        user_password: userPassword,
        owner_password: ownerPassword,
        ...(permissions && { user_permissions: permissions }),
      })
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Sets metadata for a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to modify
   * @param metadata - The metadata to set (title and/or author)
   * @returns Promise resolving to the document with updated metadata
   *
   * @example
   * ```typescript
   * const result = await client.setMetadata('document.pdf', { 
   *   title: 'My Document', 
   *   author: 'John Doe' 
   * });
   * ```
   */
  async setMetadata(
    file: FileInput,
    metadata: components['schemas']['Metadata'],
  ): Promise<WorkflowOutput> {
    const result = await this.workflow()
      .addFilePart(file)
      .outputPdf({ metadata })
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Sets page labels for a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to modify
   * @param labels - Array of label objects with pages and label properties
   * @returns Promise resolving to the document with updated page labels
   *
   * @example
   * ```typescript
   * const result = await client.setPageLabels('document.pdf', [
   *   { pages: [0, 1, 2], label: 'Cover' },
   *   { pages: [3, 4, 5], label: 'Chapter 1' }
   * ]);
   * ```
   */
  async setPageLabels(
    file: FileInput,
    labels: components['schemas']['Label'][],
  ): Promise<WorkflowOutput> {
    const result = await this.workflow()
      .addFilePart(file)
      .outputPdf({ labels })
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Applies Instant JSON to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to modify
   * @param instantJsonFile - The Instant JSON file to apply
   * @returns Promise resolving to the modified document
   *
   * @example
   * ```typescript
   * const result = await client.applyInstantJson('document.pdf', 'annotations.json');
   * ```
   */
  async applyInstantJson(
    file: FileInput,
    instantJsonFile: FileInput,
  ): Promise<WorkflowOutput> {
    const applyJsonAction = BuildActions.applyInstantJson(instantJsonFile)

    const result = await this.workflow()
      .addFilePart(file, undefined, [applyJsonAction])
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Applies XFDF to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to modify
   * @param xfdfFile - The XFDF file to apply
   * @param options - Optional settings for applying XFDF
   * @returns Promise resolving to the modified document
   *
   * @example
   * ```typescript
   * const result = await client.applyXfdf('document.pdf', 'annotations.xfdf');
   * // Or with options:
   * const result = await client.applyXfdf('document.pdf', 'annotations.xfdf', {
   *   ignorePageRotation: true,
   *   richTextEnabled: false
   * });
   * ```
   */
  async applyXfdf(
    file: FileInput,
    xfdfFile: FileInput,
    options?: {
      ignorePageRotation?: boolean;
      richTextEnabled?: boolean;
    },
  ): Promise<WorkflowOutput> {
    const applyXfdfAction = BuildActions.applyXfdf(xfdfFile, options);

    const result = await this.workflow()
      .addFilePart(file, undefined, [applyXfdfAction])
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Creates redaction annotations based on a preset pattern
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to create redactions in
   * @param preset - The preset pattern to search for (e.g., 'email-address', 'social-security-number')
   * @param presetOptions - Optional settings for the preset strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsPreset('document.pdf', 'email-address');
   * // Or with options:
   * const result = await client.createRedactionsPreset('document.pdf', 'social-security-number', {
   *   includeAnnotations: true,
   *   start: 0,
   *   limit: 5
   * });
   * ```
   */
  async createRedactionsPreset(
    file: FileInput,
    preset: components['schemas']['SearchPreset'],
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    presetOptions?: Omit<components['schemas']['CreateRedactionsStrategyOptionsPreset'], 'preset' | 'start' | 'limit'>,
    options?: Omit<components['schemas']['CreateRedactionsAction'], 'type' | 'strategyOptions' | 'strategy'>,
  ): Promise<WorkflowOutput> {
    const createRedactionsAction = BuildActions.createRedactionsPreset(preset, options, {
      start: pages?.start ?? undefined,
      limit: pages?.end ? pages.end - (pages?.start ?? 0) + 1 :  undefined,
      ...presetOptions
    });
    const actions: ApplicableAction[] = [createRedactionsAction]

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow()
      .addFilePart(file, undefined, actions)
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Creates redaction annotations based on a regular expression
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to create redactions in
   * @param regex - The regular expression to search for
   * @param regrexOptions - Optional settings for the regrex strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsRegex('document.pdf', 'Account:\\s*\\d{8,12}');
   * // Or with options:
   * const result = await client.createRedactionsRegex('document.pdf', 'Account:\\s*\\d{8,12}', {
   *   caseSensitive: false,
   *   includeAnnotations: true
   * });
   * ```
   */
  async createRedactionsRegex(
    file: FileInput,
    regex: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    regrexOptions?: Omit<components['schemas']['CreateRedactionsStrategyOptionsRegex'], 'regex' | 'start' | 'limit'>,
    options?: Omit<components['schemas']['CreateRedactionsAction'], 'type' | 'strategyOptions' | 'strategy'>,
  ): Promise<WorkflowOutput> {
    const createRedactionsAction = BuildActions.createRedactionsRegex(regex, options, {
      start: pages?.start ?? undefined,
      limit: pages?.end ? pages.end - (pages?.start ?? 0) + 1 :  undefined,
      ...regrexOptions
    });
    const actions: ApplicableAction[] = [createRedactionsAction]

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow()
      .addFilePart(file, undefined, actions)
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Creates redaction annotations based on text
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to create redactions in
   * @param text - The text to search for
   * @param textOptions - Optional settings for the text strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsText('document.pdf', 'email@example.com');
   * // Or with options:
   * const result = await client.createRedactionsText('document.pdf', 'email@example.com', {
   *   caseSensitive: false,
   *   includeAnnotations: true
   * });
   * ```
   */
  async createRedactionsText(
    file: FileInput,
    text: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    textOptions?: Omit<components['schemas']['CreateRedactionsStrategyOptionsText'], 'text' | 'start' | 'limit'>,
    options?: Omit<components['schemas']['CreateRedactionsAction'], 'type' | 'strategyOptions' | 'strategy'>,
  ): Promise<WorkflowOutput> {
    const createRedactionsAction = BuildActions.createRedactionsText(text, options, {
      start: pages?.start ?? undefined,
      limit: pages?.end ? pages.end - (pages?.start ?? 0) + 1 :  undefined,
      ...textOptions
    });
    const actions: ApplicableAction[] = [createRedactionsAction]

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow()
      .addFilePart(file, undefined, actions)
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Applies redaction annotations in a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file with redaction annotations to apply
   * @returns Promise resolving to the document with applied redactions
   *
   * @example
   * ```typescript
   * const result = await client.applyRedactions('document-with-redactions.pdf');
   * ```
   */
  async applyRedactions(
    file: FileInput,
  ): Promise<WorkflowOutput> {
    const applyRedactionsAction = BuildActions.applyRedactions()

    const result = await this.workflow()
      .addFilePart(file, undefined, [applyRedactionsAction])
      .outputPdf()
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Adds blank pages to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to add pages to
   * @param count - The number of blank pages to add
   * @param index - Optional index where to add the blank pages (0-based). If not provided, pages are added at the end.
   * @returns Promise resolving to the document with added pages
   *
   * @example
   * ```typescript
   * // Add 2 blank pages at the end
   * const result = await client.addPage('document.pdf', 2);
   * 
   * // Add 1 blank page after the first page (at index 1)
   * const result = await client.addPage('document.pdf', 1, 1);
   * ```
   */
  async addPage(
    file: FileInput,
    count: number = 1,
    index?: number,
  ): Promise<WorkflowOutput> {
    let result: WorkflowResult;

    // If no index is provided or it's the end of the document, simply add pages at the end
    if (index === undefined) {
      const builder = this.workflow().addFilePart(file);

      // Add the specified number of blank pages
      builder.addNewPage({ pageCount: count });

      result = await builder.outputPdf().execute();
    } else {
      // Get the actual page count of the PDF
      const pageCount = await getPdfPageCount(file);

      // Validate that the index is within range
      if (index < 0 || index > pageCount) {
        throw new ValidationError(`Index ${index} is out of range (document has ${pageCount} pages)`);
      }

      const builder = this.workflow();

      // Add pages before the specified index
      if (index > 0) {
        builder.addFilePart(file, { pages: { start: 0, end: index - 1 } });
      }

      // Add the blank pages
      builder.addNewPage({ pageCount: count });

      // Add pages after the specified index
      if (index < pageCount) {
        builder.addFilePart(file, { pages: { start: index, end: pageCount - 1 } });
      }

      result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    }

    return this.processWorkflowResult(result);
  }

  /**
   * Optimizes a PDF document for size reduction
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to optimize
   * @param options - Optimization options
   * @returns Promise resolving to the optimized document
   *
   * @example
   * ```typescript
   * const result = await client.optimize('large-document.pdf', {
   *   grayscaleImages: true,
   *   mrcCompression: true,
   *   imageOptimizationQuality: 2
   * });
   * ```
   */
  async optimize(
    file: FileInput,
    options: components['schemas']['OptimizePdf'] = { imageOptimizationQuality : 2 },
  ): Promise<WorkflowOutput> {
    const result = await this.workflow()
      .addFilePart(file)
      .outputPdf({ optimize: options })
      .execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Splits a PDF document into multiple parts based on page ranges
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to split
   * @param pageRanges - Array of page ranges to extract
   * @returns Promise resolving to an array of PDF documents, one for each page range
   *
   * @example
   * ```typescript
   * const results = await client.splitPdf('document.pdf', [
   *   { start: 0, end: 2 },  // Pages 1-3
   *   { start: 3, end: 5 }   // Pages 4-6
   * ]);
   * 
   * // Process each resulting PDF
   * for (const result of results) {
   *   if (result.success && result.output) {
   *     // Do something with result.output.buffer
   *   }
   * }
   * ```
   */
  async splitPdf(
    file: FileInput,
    pageRanges: { start: number; end: number }[],
  ): Promise<WorkflowOutput[]> {
    if (!pageRanges || pageRanges.length === 0) {
      throw new ValidationError('At least one page range is required for splitting');
    }

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(file);

    // Validate that all page ranges are within bounds
    for (const range of pageRanges) {
      if (range.start < 0 || range.end >= pageCount || range.start > range.end) {
        throw new ValidationError(`Page range ${JSON.stringify(range)} is invalid (document has ${pageCount} pages)`);
      }
    }

    // Create a separate workflow for each page range
    const workflows: Promise<WorkflowResult>[] = [];

    for (const range of pageRanges) {
      const builder = this.workflow();
      builder.addFilePart(file, { pages: range });
      workflows.push((builder as WorkflowWithPartsStage).outputPdf().execute());
    }

    // Execute all workflows in parallel and process the results
    const results = await Promise.all(workflows);
    return results.map(result => this.processWorkflowResult(result));
  }

  /**
   * Creates a new PDF containing only the specified pages in the order provided
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to extract pages from
   * @param pageIndices - Array of page indices to include in the new PDF (0-based)
   * @returns Promise resolving to a new document with only the specified pages
   *
   * @example
   * ```typescript
   * // Create a new PDF with only the first and third pages
   * const result = await client.duplicatePages('document.pdf', [0, 2]);
   * 
   * // Create a new PDF with pages in a different order
   * const result = await client.duplicatePages('document.pdf', [2, 0, 1]);
   * 
   * // Create a new PDF with duplicated pages
   * const result = await client.duplicatePages('document.pdf', [0, 0, 1, 1, 0]);
   * ```
   */
  async duplicatePages(
    file: FileInput,
    pageIndices: number[],
  ): Promise<WorkflowOutput> {
    if (!pageIndices || pageIndices.length === 0) {
      throw new ValidationError('At least one page index is required for duplication');
    }

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(file);

    // Validate that all page indices are within range
    if (pageIndices.some(index => index < 0 || index >= pageCount)) {
      throw new ValidationError(`Page indices ${pageIndices.toString()} is out of range (document has ${pageCount} pages)`);
    }

    const builder = this.workflow();

    // Add each page in the order specified
    for (const pageIndex of pageIndices) {
      builder.addFilePart(file, { pages: { start: pageIndex, end: pageIndex } });
    }

    const result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    return this.processWorkflowResult(result);
  }

  /**
   * Deletes pages from a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The PDF file to modify
   * @param pageIndices - Array of page indices to delete (0-based)
   * @returns Promise resolving to the document with deleted pages
   *
   * @example
   * ```typescript
   * const result = await client.deletePages('document.pdf', [1, 3]); // Delete second and fourth pages
   * ```
   */
  async deletePages(
    file: FileInput,
    pageIndices: number[],
  ): Promise<WorkflowOutput> {
    if (!pageIndices || pageIndices.length === 0) {
      throw new ValidationError('At least one page index is required for deletion');
    }

    // Remove duplicate and sort the deleteIndicies
    const deleteIndicies = [...new Set(pageIndices)].sort((a, b) => a - b);

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(file);

    // Validate that all page indices are within range
    if (pageIndices.some((index) => index < 0 || index >= pageCount)) {
      throw new ValidationError(`Page indices ${pageIndices.toString()} is out of range (document has ${pageCount} pages)`);

    }
    const builder = this.workflow();

    // Group consecutive pages that should be kept into ranges
    let currentPage: number = 0;
    const pageRanges: { start: number; end: number }[] = [];

    for (const deleteIndex of deleteIndicies) {
      if (currentPage < deleteIndex) {
        pageRanges.push({ start: currentPage, end: deleteIndex - 1 });
      }
      currentPage = deleteIndex + 1;
    }
    if ((currentPage > 0 || (currentPage == 0 && deleteIndicies.length == 0)) && currentPage < pageCount) {
      pageRanges.push({ start: currentPage, end: pageCount - 1 });
    }

    if (pageRanges.length === 0) {
      throw new ValidationError('You cannot delete all pages from a document')
    }

    pageRanges.forEach(range => {
      builder.addFilePart(file, { pages: range });
    })

    const result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    return this.processWorkflowResult(result);
  }
}
