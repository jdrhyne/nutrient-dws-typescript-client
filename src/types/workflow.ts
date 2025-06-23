import type { Operation } from './operations';
import type { FileInput } from './inputs';
import type { components } from '../generated/api-types';

/**
 * Maps output types to their specific output structures
 */
export type OutputTypeMap = {
  'pdf': { buffer: Uint8Array; mimeType: 'application/pdf'; filename?: string };
  'pdfa': { buffer: Uint8Array; mimeType: 'application/pdf'; filename?: string };
  'image': { buffer: Uint8Array; mimeType: `image/${string}`; filename?: string };
  'docx': { buffer: Uint8Array; mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; filename?: string };
  'xlsx': { buffer: Uint8Array; mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; filename?: string };
  'pptx': { buffer: Uint8Array; mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; filename?: string };
  'json-content': { data: components['schemas']['BuildResponseJsonContents'] };
};

/**
 * Builder pattern interfaces for workflow stages
 */

// Stage 1: Initial workflow - only part methods available
export interface WorkflowInitialStage {
  addPart(part: components['schemas']['Part']): WorkflowWithPartsStage;
  addFilePart(
    file: FileInput, 
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addHtmlPart(
    html: string | Blob, 
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
}

// Stage 2: After parts added - parts, actions, and output methods available
export interface WorkflowWithPartsStage {
  // Part methods (can add more parts)
  addPart(part: components['schemas']['Part']): WorkflowWithPartsStage;
  addFilePart(
    file: FileInput, 
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addHtmlPart(
    html: string | Blob, 
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][]
  ): WorkflowWithPartsStage;

  // Action methods
  applyActions(actions: components['schemas']['BuildAction'][]): WorkflowWithActionsStage;
  applyAction(action: components['schemas']['BuildAction']): WorkflowWithActionsStage;

  // Output methods
  output(output: components['schemas']['BuildOutput']): WorkflowWithOutputStage;
  outputPdf(options?: Omit<components['schemas']['PDFOutput'], 'type'>): WorkflowWithOutputStage<'pdf'>;
  outputPdfA(options?: Omit<components['schemas']['PDFAOutput'], 'type'>): WorkflowWithOutputStage<'pdfa'>;
  outputImage(options?: Omit<components['schemas']['ImageOutput'], 'type'>): WorkflowWithOutputStage<'image'>;
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T>;
  outputJson(options?: Omit<components['schemas']['JSONContentOutput'], 'type'>): WorkflowWithOutputStage<'json-content'>;
}

// Stage 3: After actions added - more actions and output methods available
export interface WorkflowWithActionsStage {
  // Action methods (can add more actions)
  applyActions(actions: components['schemas']['BuildAction'][]): WorkflowWithActionsStage;
  applyAction(action: components['schemas']['BuildAction']): WorkflowWithActionsStage;

  // Output methods
  output(output: components['schemas']['BuildOutput']): WorkflowWithOutputStage;
  outputPdf(options?: Omit<components['schemas']['PDFOutput'], 'type'>): WorkflowWithOutputStage<'pdf'>;
  outputPdfA(options?: Omit<components['schemas']['PDFAOutput'], 'type'>): WorkflowWithOutputStage<'pdfa'>;
  outputImage(options?: Omit<components['schemas']['ImageOutput'], 'type'>): WorkflowWithOutputStage<'image'>;
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T>;
  outputJson(options?: Omit<components['schemas']['JSONContentOutput'], 'type'>): WorkflowWithOutputStage<'json-content'>;
}

// Stage 4: After output set - only execute and dryRun available
export interface WorkflowWithOutputStage<TOutput extends keyof OutputTypeMap | undefined = undefined> {
  execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>>;
  dryRun(options?: Pick<WorkflowExecuteOptions, 'timeout'>): Promise<WorkflowDryRunResult>;
}

/**
 * Represents a step in a workflow
 */
export interface WorkflowStep {
  operation: Operation;
  outputName?: string;
}

/**
 * Configuration for a workflow
 */
export interface WorkflowConfig {
  steps: WorkflowStep[];
  initialInput?: FileInput;
}

/**
 * Represents an output file with its content and metadata
 */
export interface WorkflowOutput {
  /** The file content as a Uint8Array buffer */
  buffer: Uint8Array;
  /** The MIME type of the output file */
  mimeType: string;
  /** Optional filename if available */
  filename?: string;
}

/**
 * Result of a workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  output?: WorkflowOutput;
  errors?: Array<{
    step: number;
    error: Error;
  }>;
}

/**
 * Typed result of a workflow execution based on output configuration
 */
export type TypedWorkflowResult<T extends keyof OutputTypeMap | undefined> = {
  success: boolean;
  output?: T extends keyof OutputTypeMap ? OutputTypeMap[T] : WorkflowOutput;
  errors?: Array<{ step: number; error: Error; }>;
};

/**
 * Result of a workflow dry run
 */
export interface WorkflowDryRunResult {
  success: boolean;
  analysis?: components['schemas']['AnalyzeBuildResponse'];
  errors?: Array<{
    step: number;
    error: Error;
  }>;
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecuteOptions {
  /**
   * Timeout in milliseconds for the entire workflow
   */
  timeout?: number;

  /**
   * Progress callback
   */
  onProgress?: (step: number, total: number) => void;
}
