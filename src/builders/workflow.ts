import type {
  FileInput,
  OutputTypeMap,
  TypedWorkflowResult,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
} from '../types';
import { BaseBuilder } from './base';
import { NutrientError, ValidationError } from '../errors';
import { validateFileInput } from '../inputs';
import { BuildOutputs } from '../build';
import type { components } from '../generated/api-types';

/**
 * File entry with metadata for type safety
 */
interface FileEntry {
  data: FileInput | string | Blob;
  type: 'file' | 'html' | 'document';
}

/**
 * Workflow builder implementation using the composable Build API
 */
export class WorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined> 
  extends BaseBuilder<TypedWorkflowResult<TOutput>> {
  
  private buildInstructions: components['schemas']['BuildInstructions'] = {
    parts: [],
  };
  
  private files: Map<string, FileEntry> = new Map();
  private fileIndex = 0;
  private currentStep = 0;
  private isExecuted = false;

  /**
   * Adds a part to the workflow
   */
  addPart(part: components['schemas']['Part']): this {
    this.ensureNotExecuted();
    this.buildInstructions.parts.push(part);
    return this;
  }

  /**
   * Adds a file part to the workflow
   */
  addFilePart(
    file: FileInput,
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): this {
    this.ensureNotExecuted();
    
    if (!validateFileInput(file)) {
      throw new ValidationError('Invalid file input provided to workflow', { file });
    }

    const fileKey = `file_${this.fileIndex++}`;
    this.files.set(fileKey, { data: file, type: 'file' });

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
   */
  addHtmlPart(
    html: string | Blob,
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): this {
    this.ensureNotExecuted();
    
    const htmlKey = `html_${this.fileIndex++}`;
    this.files.set(htmlKey, { data: html, type: 'html' });

    const htmlPart: components['schemas']['HTMLPart'] = {
      html: htmlKey,
      ...options,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(htmlPart);
    return this;
  }

  /**
   * Adds a new page part to the workflow
   */
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): this {
    this.ensureNotExecuted();
    
    const newPagePart: components['schemas']['NewPagePart'] = {
      page: 'new',
      ...options,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(newPagePart);
    return this;
  }

  /**
   * Adds a document part by document ID
   */
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][],
  ): this {
    this.ensureNotExecuted();
    
    const { layer, ...documentOptions } = options || {};
    
    const documentPart: components['schemas']['DocumentPart'] = {
      document: { id: documentId, ...(layer && { layer }) },
      ...documentOptions,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };

    this.buildInstructions.parts.push(documentPart);
    return this;
  }

  /**
   * Applies actions to the entire document
   */
  applyActions(actions: components['schemas']['BuildAction'][]): this {
    this.ensureNotExecuted();
    
    if (!this.buildInstructions.actions) {
      this.buildInstructions.actions = [];
    }
    this.buildInstructions.actions.push(...actions);
    return this;
  }

  /**
   * Applies a single action to the entire document
   */
  applyAction(action: components['schemas']['BuildAction']): this {
    return this.applyActions([action]);
  }

  /**
   * Sets the output configuration
   */
  output(output: components['schemas']['BuildOutput']): this {
    this.ensureNotExecuted();
    this.buildInstructions.output = output;
    return this;
  }

  /**
   * Sets PDF output
   */
  outputPdf(options?: Omit<components['schemas']['PDFOutput'], 'type'>): WorkflowBuilder<'pdf'> {
    this.output({ type: 'pdf', ...options });
    return this as WorkflowBuilder<'pdf'>;
  }

  /**
   * Sets PDF/A output
   */
  outputPdfA(options?: Omit<components['schemas']['PDFAOutput'], 'type'>): WorkflowBuilder<'pdfa'> {
    this.output({ type: 'pdfa', ...options });
    return this as WorkflowBuilder<'pdfa'>;
  }

  /**
   * Sets image output
   */
  outputImage(options?: Omit<components['schemas']['ImageOutput'], 'type'>): WorkflowBuilder<'image'> {
    this.output({ type: 'image', ...options });
    return this as WorkflowBuilder<'image'>;
  }

  /**
   * Sets Office format output
   */
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowBuilder<T> {
    const typeMap = {
      docx: 'docx',
      xlsx: 'xlsx',
      pptx: 'pptx',
    } as const;

    this.output({ type: typeMap[format] });
    return this as unknown as WorkflowBuilder<T>;
  }

  /**
   * Sets JSON content extraction output
   */
  outputJson(options?: Omit<components['schemas']['JSONContentOutput'], 'type'>): WorkflowBuilder<'json-content'> {
    this.output({ type: 'json-content', ...options });
    return this as WorkflowBuilder<'json-content'>;
  }

  /**
   * Validates the workflow before execution
   */
  private validate(): void {
    if (this.buildInstructions.parts.length === 0) {
      throw new ValidationError('Workflow has no parts to execute');
    }

    if (!this.buildInstructions.output) {
      this.buildInstructions.output = { type: 'pdf' };
    }
  }

  /**
   * Ensures the workflow hasn't been executed
   */
  private ensureNotExecuted(): void {
    if (this.isExecuted) {
      throw new ValidationError('This workflow has already been executed. Create a new workflow builder for additional operations.');
    }
  }

  /**
   * Prepares files for the request
   */
  private prepareFiles(): Map<string, unknown> {
    const requestFiles = new Map<string, unknown>();
    
    for (const [key, entry] of this.files) {
      requestFiles.set(key, entry.data);
    }
    
    return requestFiles;
  }

  /**
   * Cleans up resources after execution
   */
  private cleanup(): void {
    this.files.clear();
    this.fileIndex = 0;
    this.currentStep = 0;
    this.isExecuted = true;
  }

  /**
   * Executes the workflow
   */
  async execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    this.ensureNotExecuted();
    this.currentStep = 0;
    
    const result: TypedWorkflowResult<TOutput> = {
      success: false,
      errors: [],
    };

    try {
      this.currentStep = 1;
      this.validate();

      this.currentStep = 2;
      options?.onProgress?.(this.currentStep, 3);

      const response = await this.sendRequest<ArrayBuffer>(
        'build',
        {
          method: 'POST',
          data: { instructions: this.buildInstructions },
          files: this.prepareFiles(),
          timeout: options?.timeout,
        },
      );

      this.currentStep = 3;
      options?.onProgress?.(this.currentStep, 3);

      const { mimeType, filename } = BuildOutputs.getMimeTypeForOutput(this.buildInstructions.output!);
      
      // Use standard ArrayBuffer to Uint8Array conversion for browser compatibility
      const buffer = new Uint8Array(response);

      result.success = true;
      result.output = {
        buffer,
        mimeType,
        filename,
      } as any;

    } catch (error) {
      result.errors?.push({
        step: this.currentStep,
        error: NutrientError.wrap(error, `Workflow failed at step ${this.currentStep}`),
      });
    } finally {
      this.cleanup();
    }

    return result;
  }

  /**
   * Performs a dry run to analyze the workflow
   */
  async dryRun(options?: Pick<WorkflowExecuteOptions, 'timeout'>): Promise<WorkflowDryRunResult> {
    this.ensureNotExecuted();
    
    const result: WorkflowDryRunResult = {
      success: false,
      errors: [],
    };

    try {
      this.validate();

      const response = await this.sendRequest<components['schemas']['AnalyzeBuildResponse']>(
        'analyze_build',
        {
          method: 'POST',
          data: { instructions: this.buildInstructions },
          files: this.prepareFiles(),
          timeout: options?.timeout,
        },
      );

      result.success = true;
      result.analysis = response;

    } catch (error) {
      result.errors?.push({
        step: 0,
        error: NutrientError.wrap(error, 'Dry run failed'),
      });
    }

    return result;
  }
}