import type {
  FileInput,
  ConvertOperation,
  MergeOperation,
  CompressOperation,
  ExtractOperation,
  WatermarkOperation,
  WorkflowStep,
  WorkflowResult,
  WorkflowExecuteOptions,
} from './types';
import type { NutrientClientOptions } from './types/common';
import { ValidationError, NutrientError } from './errors';
import { validateFileInput } from './inputs';
import { sendRequest } from './http';
import type { ExtractTextResponse } from './types/responses';

/**
 * Fluent interface for building and executing document processing workflows
 * Allows chaining multiple operations for sequential processing
 */
export class WorkflowBuilder {
  /**
   * Steps to execute in the workflow
   */
  private steps: WorkflowStep[] = [];

  /**
   * Client options for API authentication and configuration
   */
  private clientOptions: NutrientClientOptions;

  /**
   * Current working file data (result of previous step)
   */
  private currentFile: Blob | null = null;

  /**
   * Named outputs from workflow steps
   */
  private outputs: Map<string, Blob> = new Map();

  constructor(clientOptions: NutrientClientOptions) {
    this.clientOptions = clientOptions;
  }

  /**
   * Sets the initial input file for the workflow
   * @param input - File to start the workflow with
   * @returns The workflow builder for chaining
   */
  input(input: FileInput): this {
    if (!validateFileInput(input)) {
      throw new ValidationError('Invalid file input provided to workflow', { input });
    }

    // Create initial step to load the input
    this.steps.push({
      operation: {
        type: 'convert',
        file: input,
        targetFormat: 'pdf', // Default to PDF for consistency
      } as ConvertOperation,
      outputName: '_initial',
    });

    return this;
  }

  /**
   * Adds a document conversion step to the workflow
   * @param targetFormat - Target format for conversion
   * @param options - Additional conversion options
   * @param outputName - Optional name to store this output
   * @returns The workflow builder for chaining
   */
  convert(
    targetFormat: ConvertOperation['targetFormat'],
    options?: ConvertOperation['options'],
    outputName?: string,
  ): this {
    this.steps.push({
      operation: {
        type: 'convert',
        file: '_previous',
        targetFormat,
        options,
      } as ConvertOperation,
      outputName,
    });

    return this;
  }

  /**
   * Adds a document merge step to the workflow
   * @param additionalFiles - Additional files to merge with current
   * @param outputFormat - Output format for merged document
   * @param outputName - Optional name to store this output
   * @returns The workflow builder for chaining
   */
  merge(
    additionalFiles: FileInput[],
    outputFormat?: MergeOperation['outputFormat'],
    outputName?: string,
  ): this {
    // Validate additional files
    for (const file of additionalFiles) {
      if (!validateFileInput(file)) {
        throw new ValidationError('Invalid file input in merge operation', { file });
      }
    }

    this.steps.push({
      operation: {
        type: 'merge',
        files: ['_previous', ...additionalFiles],
        outputFormat,
      } as MergeOperation,
      outputName,
    });

    return this;
  }

  /**
   * Adds a document compression step to the workflow
   * @param compressionLevel - Level of compression to apply
   * @param outputName - Optional name to store this output
   * @returns The workflow builder for chaining
   */
  compress(compressionLevel?: CompressOperation['compressionLevel'], outputName?: string): this {
    this.steps.push({
      operation: {
        type: 'compress',
        file: '_previous',
        compressionLevel,
      } as CompressOperation,
      outputName,
    });

    return this;
  }

  /**
   * Adds a text extraction step to the workflow
   * @param includeMetadata - Whether to include document metadata
   * @param outputName - Optional name to store this output
   * @returns The workflow builder for chaining
   */
  extractText(includeMetadata?: boolean, outputName?: string): this {
    this.steps.push({
      operation: {
        type: 'extract',
        file: '_previous',
        includeMetadata,
      } as ExtractOperation,
      outputName,
    });

    return this;
  }

  /**
   * Adds a watermark step to the workflow
   * @param watermarkText - Text to use as watermark
   * @param options - Watermark positioning and styling options
   * @param outputName - Optional name to store this output
   * @returns The workflow builder for chaining
   */
  watermark(
    watermarkText: string,
    options?: Partial<Pick<WatermarkOperation, 'position' | 'opacity' | 'fontSize'>>,
    outputName?: string,
  ): this {
    this.steps.push({
      operation: {
        type: 'watermark',
        file: '_previous',
        watermarkText,
        ...options,
      } as WatermarkOperation,
      outputName,
    });

    return this;
  }

  /**
   * Gets the number of steps in the workflow
   */
  get stepCount(): number {
    return this.steps.length;
  }

  /**
   * Gets a copy of the current workflow steps
   */
  getSteps(): WorkflowStep[] {
    return [...this.steps];
  }

  /**
   * Clears all steps from the workflow
   * @returns The workflow builder for chaining
   */
  clear(): this {
    this.steps = [];
    this.currentFile = null;
    this.outputs.clear();
    return this;
  }

  /**
   * Validates that the workflow has steps and is ready to execute
   */
  private validate(): void {
    if (this.steps.length === 0) {
      throw new ValidationError('Workflow has no steps to execute');
    }

    // Check that first step has a real input (not _previous)
    const firstStep = this.steps[0];
    if (
      firstStep &&
      firstStep.operation.type !== 'merge' &&
      firstStep.operation.file === '_previous'
    ) {
      throw new ValidationError('First workflow step must have an input file specified', {
        firstStep,
      });
    }
  }

  /**
   * Executes the workflow and returns the results
   * @param options - Execution options
   * @returns Promise resolving to workflow results
   */
  async execute(options?: WorkflowExecuteOptions): Promise<WorkflowResult> {
    this.validate();

    const result: WorkflowResult = {
      success: false,
      outputs: new Map(),
      errors: [],
    };

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        if (!step) continue;

        // Call progress callback if provided
        options?.onProgress?.(i + 1, this.steps.length);

        try {
          // Execute the step
          await this.executeStep(step, i);

          // Store named output if specified
          if (step.outputName && this.currentFile) {
            this.outputs.set(step.outputName, this.currentFile);
          }
        } catch (error) {
          const stepError = {
            step: i,
            error:
              error instanceof Error ? error : new NutrientError('Unknown error in workflow step'),
          };

          result.errors?.push(stepError);

          if (!options?.continueOnError) {
            throw error;
          }
        }
      }

      result.success = true;
      result.outputs = new Map(this.outputs);
    } catch (error) {
      // Workflow failed
      result.success = false;
    }

    return result;
  }

  /**
   * Executes a single workflow step
   */
  private async executeStep(step: WorkflowStep, stepIndex: number): Promise<void> {
    const operation = step.operation;

    // Prepare file input for the operation
    const fileInput = await this.prepareFileInput(operation, stepIndex);

    switch (operation.type) {
      case 'convert': {
        const response = await sendRequest<Blob>(
          {
            endpoint: '/convert',
            method: 'POST',
            files: { file: fileInput },
            data: {
              targetFormat: operation.targetFormat,
              ...operation.options,
            },
          },
          this.clientOptions,
        );

        this.currentFile = response.data;
        break;
      }

      case 'merge': {
        const files: Record<string, FileInput> = {};

        // Prepare all files for merge
        for (let i = 0; i < operation.files.length; i++) {
          const file = operation.files[i];
          if (!file) continue;
          if (file === '_previous') {
            if (!this.currentFile) {
              throw new ValidationError('No current file available for merge operation');
            }
            files[`files[${i}]`] = this.currentFile;
          } else {
            files[`files[${i}]`] = file;
          }
        }

        const response = await sendRequest<Blob>(
          {
            endpoint: '/merge',
            method: 'POST',
            files,
            data: {
              outputFormat: operation.outputFormat,
            },
          },
          this.clientOptions,
        );

        this.currentFile = response.data;
        break;
      }

      case 'compress': {
        const response = await sendRequest<Blob>(
          {
            endpoint: '/compress',
            method: 'POST',
            files: { file: fileInput },
            data: {
              compressionLevel: operation.compressionLevel,
            },
          },
          this.clientOptions,
        );

        this.currentFile = response.data;
        break;
      }

      case 'extract': {
        const response = await sendRequest<ExtractTextResponse>(
          {
            endpoint: '/extract',
            method: 'POST',
            files: { file: fileInput },
            data: {
              includeMetadata: operation.includeMetadata,
            },
          },
          this.clientOptions,
        );

        // For extract, we need to convert the response to a blob
        const textData = JSON.stringify(response.data);
        this.currentFile = new Blob([textData], { type: 'application/json' });
        break;
      }

      case 'watermark': {
        const response = await sendRequest<Blob>(
          {
            endpoint: '/watermark',
            method: 'POST',
            files: { file: fileInput },
            data: {
              watermarkText: operation.watermarkText,
              position: operation.position,
              opacity: operation.opacity,
              fontSize: operation.fontSize,
            },
          },
          this.clientOptions,
        );

        this.currentFile = response.data;
        break;
      }

      default:
        throw new ValidationError(
          `Unknown operation type: ${(operation as { type: string }).type}`,
          { operation },
        );
    }
  }

  /**
   * Prepares the file input for an operation
   */
  private prepareFileInput(
    operation: WorkflowStep['operation'],
    stepIndex: number,
  ): Promise<FileInput> {
    if (operation.type === 'merge') {
      // Merge handles files differently
      if (!this.currentFile) {
        throw new ValidationError('No current file available for merge operation');
      }
      return this.currentFile;
    }

    const fileRef = (operation as { file?: FileInput }).file;

    if (!fileRef || fileRef === '_previous') {
      if (!this.currentFile) {
        throw new ValidationError(
          `Step ${stepIndex} references previous output but no previous output exists`,
          { stepIndex, operation },
        );
      }
      return this.currentFile;
    }

    return fileRef;
  }

  /**
   * Gets a specific output by name
   */
  getOutput(name: string): Blob | undefined {
    return this.outputs.get(name);
  }

  /**
   * Gets all named outputs
   */
  getAllOutputs(): Map<string, Blob> {
    return new Map(this.outputs);
  }
}
