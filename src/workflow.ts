import type { 
  FileInput, 
  WorkflowDryRunResult, 
  WorkflowExecuteOptions, 
  OutputTypeMap, 
  TypedWorkflowResult,
  WorkflowInitialStage,
  WorkflowWithPartsStage,
  WorkflowWithActionsStage,
  WorkflowWithOutputStage
} from './types';
import type { NutrientClientOptions } from './types';
import { NutrientError, ValidationError } from './errors';
import { validateFileInput } from './inputs';
import { sendRequest } from './http';
import { BuildOutputs } from './build';
import type { components } from './types/nutrient-api';

/**
 * Fluent interface for building and executing document processing workflows
 * using a composable API that directly maps to the /build API structure.
 */
export class WorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined> {
  /**
   * Build instructions for the /build API
   */
  private buildInstructions: components['schemas']['BuildInstructions'] = {
    parts: [],
  };

  /**
   * Client options for API authentication and configuration
   */
  private clientOptions: NutrientClientOptions;

  /**
   * Current working file data (result of previous step)
   */
  private currentFile: Blob | null = null;

  /**
   * Last execution output
   */
  private lastOutput: TypedWorkflowResult<TOutput>['output'] = undefined;

  /**
   * Files to be sent in the request
   */
  private files: Record<string, unknown> = {};

  /**
   * Current file index for generating unique file keys
   */
  private fileIndex = 0;

  constructor(clientOptions: NutrientClientOptions) {
    this.clientOptions = clientOptions;
  }

  /**
   * Adds a part to the workflow
   * @param part - The part to add
   * @returns The workflow builder for chaining
   */
  addPart(part: components['schemas']['Part']): this {
    this.buildInstructions.parts.push(part);
    return this;
  }

  /**
   * Adds a file part to the workflow
   * @param file - The file to add
   * @param options - Additional options for the file part
   * @param actions - Actions to apply to this specific part
   * @returns The workflow builder for chaining
   */
  addFilePart(
    file: FileInput, 
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): this {
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided to workflow', { file });
    }

    const fileKey = `file_${this.fileIndex++}`;
    this.files[fileKey] = file;

    const filePart: components['schemas']['FilePart'] = {
      file: fileKey,
      ...options,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(filePart);
    return this;
  }

  /**
   * Adds an HTML part to the workflow
   * @param html - The HTML content to add
   * @param options - Additional options for the HTML part
   * @param actions - Actions to apply to this specific part
   * @returns The workflow builder for chaining
   */
  addHtmlPart(
    html: string | Blob, 
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): this {
    const htmlKey = `html_${this.fileIndex++}`;
    this.files[htmlKey] = html;

    const htmlPart: components['schemas']['HTMLPart'] = {
      html: htmlKey,
      ...options,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(htmlPart);
    return this;
  }

  /**
   * Adds a new blank page to the workflow
   * @param options - Options for the new page
   * @param actions - Actions to apply to this specific part
   * @returns The workflow builder for chaining
   */
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): this {
    const newPagePart: components['schemas']['NewPagePart'] = {
      page: 'new',
      ...options,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(newPagePart);
    return this;
  }

  /**
   * Adds a document part to the workflow
   * @param documentId - The ID of the document
   * @param options - Additional options for the document part
   * @param actions - Actions to apply to this specific part
   * @returns The workflow builder for chaining
   */
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][]
  ): this {
    const { layer, ...restOptions } = options ?? {};

    const documentPart: components['schemas']['DocumentPart'] = {
      document: {
        id: documentId,
        ...(layer ? { layer } : {}),
      },
      ...restOptions,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(documentPart);
    return this;
  }

  /**
   * Applies actions to the entire document
   * @param actions - The actions to apply
   * @returns The workflow builder for chaining
   */
  applyActions(actions: components['schemas']['BuildAction'][]): this {
    if (!this.buildInstructions.actions) {
      this.buildInstructions.actions = [];
    }

    this.buildInstructions.actions.push(...actions);
    return this;
  }

  /**
   * Applies a single action to the entire document
   * @param action - The action to apply
   * @returns The workflow builder for chaining
   */
  applyAction(action: components['schemas']['BuildAction']): this {
    return this.applyActions([action]);
  }

  /**
   * Sets the output format and options
   * @param output - The output configuration
   * @returns The workflow builder for chaining
   */
  output(output: components['schemas']['BuildOutput']): this {
    this.buildInstructions.output = output;
    return this;
  }

  /**
   * Sets the output format to PDF with options
   * @param options - PDF output options
   * @returns The workflow builder for chaining
   */
  outputPdf(options?: Omit<components['schemas']['PDFOutput'], 'type'>): WorkflowBuilder<'pdf'> {
    this.buildInstructions.output = {
      type: 'pdf',
      ...options,
    } as components['schemas']['PDFOutput'];
    return this as WorkflowBuilder<'pdf'>;
  }

  /**
   * Sets the output format to PDF/A with options
   * @param options - PDF/A output options
   * @returns The workflow builder for chaining
   */
  outputPdfA(options?: Omit<components['schemas']['PDFAOutput'], 'type'>): WorkflowBuilder<'pdfa'> {
    this.buildInstructions.output = {
      type: 'pdfa',
      ...options,
    } as components['schemas']['PDFAOutput'];
    return this as WorkflowBuilder<'pdfa'>;
  }

  /**
   * Sets the output format to image with options
   * @param options - Image output options
   * @returns The workflow builder for chaining
   */
  outputImage(options?: Omit<components['schemas']['ImageOutput'], 'type'>): WorkflowBuilder<'image'> {
    this.buildInstructions.output = {
      type: 'image',
      ...options,
    } as components['schemas']['ImageOutput'];
    return this as WorkflowBuilder<'image'>;
  }

  /**
   * Sets the output format to Office with options
   * @param format - Office format (docx, xlsx, pptx)
   * @returns The workflow builder for chaining
   */
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowBuilder<T> {
    this.buildInstructions.output = {
      type: format,
    } as components['schemas']['OfficeOutput'];
    return this as unknown as WorkflowBuilder<T>;
  }

  /**
   * Sets the output format to JSON with options
   * @param options - JSON output options
   * @returns The workflow builder for chaining
   */
  outputJson(options?: Omit<components['schemas']['JSONContentOutput'], 'type'>): WorkflowBuilder<'json-content'> {
    this.buildInstructions.output = {
      type: 'json-content',
      ...options,
    } as components['schemas']['JSONContentOutput'];
    return this as WorkflowBuilder<'json-content'>;
  }

  /**
   * Gets the output from the last execution
   * @returns The output from the last execution, or undefined if no execution has occurred
   */
  getOutput(): TypedWorkflowResult<TOutput>['output'] {
    return this.lastOutput;
  }

  /**
   * Validates that the workflow has parts and is ready to execute
   */
  private validate(): void {
    if (this.buildInstructions.parts.length === 0) {
      throw new ValidationError('Workflow has no parts to execute');
    }

    // Ensure we have an output format
    if (!this.buildInstructions.output) {
      // Default to PDF output if not specified
      this.buildInstructions.output = BuildOutputs.pdf();
    }
  }

  /**
   * Executes the workflow and returns the results
   * @param options - Execution options
   * @returns Promise resolving to workflow results
   */
  async execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    this.validate();

    const result: TypedWorkflowResult<TOutput> = {
      success: false,
      errors: [],
    };

    try {
      // Call progress callback if provided
      options?.onProgress?.(1, 1);

      // Execute the build API request
      const response = await sendRequest<Blob>(
        {
          endpoint: '/build',
          method: 'POST',
          files: this.files,
          data: {
            instructions: this.buildInstructions,
          },
          timeout: options?.timeout,
        },
        this.clientOptions,
      );

      // Store the result
      this.currentFile = response.data;

      // Store output if available
      if (this.currentFile) {
        const mimeType = response.headers['content-type'] ?? this.determineMimeTypeFromOutput();
        result.output = {
          blob: this.currentFile,
          mimeType,
        } as TypedWorkflowResult<TOutput>['output'];

        // Store the output for getOutput method
        this.lastOutput = result.output;
      }

      result.success = true;
    } catch (error) {
      // Workflow failed
      result.success = false;
      result.errors?.push({
        step: 0,
        error: error instanceof Error ? error : new NutrientError('Unknown error in workflow execution'),
      });
    }

    return result;
  }

  /**
   * Performs a dry run of the workflow to analyze it without executing
   * 
   * This method uses the analyze_build endpoint to validate the workflow and calculate
   * the credit cost without actually executing the workflow. It's useful for checking
   * if a workflow is valid and understanding the resource requirements before execution.
   * 
   * @param options - Execution options (timeout)
   * @returns Promise resolving to workflow dry run results including analysis data
   */
  async dryRun(options?: Pick<WorkflowExecuteOptions, 'timeout'>): Promise<WorkflowDryRunResult> {
    this.validate();

    const result: WorkflowDryRunResult = {
      success: false,
      errors: [],
    };

    try {
      // Execute the analyze_build API request
      const response = await sendRequest<components['schemas']['AnalyzeBuildResponse']>(
        {
          endpoint: '/analyze_build',
          method: 'POST',
          data: {
            instructions: this.buildInstructions,
          },
          timeout: options?.timeout,
        },
        this.clientOptions,
      );

      result.success = true;
      result.analysis = response.data;
    } catch (error) {
      // Dry run failed
      result.success = false;
      result.errors?.push({
        step: 0,
        error: error instanceof Error ? error : new NutrientError('Unknown error in workflow dry run'),
      });
    }

    return result;
  }

  /**
   * Determines the MIME type based on the output configuration
   * @returns The MIME type string
   */
  private determineMimeTypeFromOutput(): string {
    const output = this.buildInstructions.output;

    if (!output) {
      return 'application/octet-stream'; // Default fallback
    }

    switch (output.type) {
      case 'pdf':
        return 'application/pdf';
      case 'pdfa':
        return 'application/pdf';
      case 'image': {
        const format = output.format ?? 'png';
        return `image/${format === 'jpg' ? 'jpeg' : format}`;
      }
      case 'json-content':
        return 'application/json';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default:
        return 'application/octet-stream';
    }
  }



}

/**
 * Staged workflow builder that implements the builder pattern with method restrictions
 */
class StagedWorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined> 
  implements WorkflowInitialStage, WorkflowWithPartsStage, WorkflowWithActionsStage, WorkflowWithOutputStage<TOutput> {

  private builder: WorkflowBuilder<TOutput>;

  constructor(clientOptions: NutrientClientOptions) {
    this.builder = new WorkflowBuilder<TOutput>(clientOptions);
  }

  // Stage 1: Initial workflow - only part methods available
  addPart(part: components['schemas']['Part']): WorkflowWithPartsStage {
    this.builder.addPart(part);
    return this as WorkflowWithPartsStage;
  }

  addFilePart(
    file: FileInput, 
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage {
    this.builder.addFilePart(file, options, actions);
    return this as WorkflowWithPartsStage;
  }

  addHtmlPart(
    html: string | Blob, 
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage {
    this.builder.addHtmlPart(html, options, actions);
    return this as WorkflowWithPartsStage;
  }

  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage {
    this.builder.addNewPage(options, actions);
    return this as WorkflowWithPartsStage;
  }

  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage {
    this.builder.addDocumentPart(documentId, options, actions);
    return this as WorkflowWithPartsStage;
  }

  // Stage 2 & 3: Action methods
  applyActions(actions: components['schemas']['BuildAction'][]): WorkflowWithActionsStage {
    this.builder.applyActions(actions);
    return this as WorkflowWithActionsStage;
  }

  applyAction(action: components['schemas']['BuildAction']): WorkflowWithActionsStage {
    this.builder.applyAction(action);
    return this as WorkflowWithActionsStage;
  }

  // Stage 2 & 3: Output methods
  output(output: components['schemas']['BuildOutput']): WorkflowWithOutputStage {
    this.builder.output(output);
    return this as WorkflowWithOutputStage;
  }

  outputPdf(options?: Omit<components['schemas']['PDFOutput'], 'type'>): WorkflowWithOutputStage<'pdf'> {
    this.builder.outputPdf(options);
    return this as WorkflowWithOutputStage<'pdf'>;
  }

  outputPdfA(options?: Omit<components['schemas']['PDFAOutput'], 'type'>): WorkflowWithOutputStage<'pdfa'> {
    this.builder.outputPdfA(options);
    return this as WorkflowWithOutputStage<'pdfa'>;
  }

  outputImage(options?: Omit<components['schemas']['ImageOutput'], 'type'>): WorkflowWithOutputStage<'image'> {
    this.builder.outputImage(options);
    return this as WorkflowWithOutputStage<'image'>;
  }

  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T> {
    this.builder.outputOffice(format);
    return this as unknown as WorkflowWithOutputStage<T>;
  }

  outputJson(options?: Omit<components['schemas']['JSONContentOutput'], 'type'>): WorkflowWithOutputStage<'json-content'> {
    this.builder.outputJson(options);
    return this as WorkflowWithOutputStage<'json-content'>;
  }

  // Stage 4: Final execution methods
  async execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    return this.builder.execute(options);
  }

  async dryRun(options?: Pick<WorkflowExecuteOptions, 'timeout'>): Promise<WorkflowDryRunResult> {
    return this.builder.dryRun(options);
  }

  getOutput(): TypedWorkflowResult<TOutput>['output'] {
    return this.builder.getOutput();
  }
}

/**
 * Creates a new workflow builder with the specified client options.
 * This is the entry point for the builder pattern API.
 *
 * @param clientOptions - Configuration options for the Nutrient API client
 * @returns A workflow builder that only allows part methods initially
 *
 * @example
 * ```typescript
 * const result = await workflow(clientOptions)
 *   .addFilePart('document.pdf')
 *   .applyAction(BuildActions.rotate(90))
 *   .outputPdf()
 *   .execute();
 * ```
 */
export function workflow(clientOptions: NutrientClientOptions): WorkflowInitialStage {
  return new StagedWorkflowBuilder(clientOptions);
}
