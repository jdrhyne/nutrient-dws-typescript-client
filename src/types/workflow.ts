import type { Operation } from './operations';
import type { FileInput } from './inputs';

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
 * Result of a workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  outputs: Map<string, Blob>;
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
   * Whether to continue on error
   * @default false
   */
  continueOnError?: boolean;
  
  /**
   * Timeout in milliseconds for the entire workflow
   */
  timeout?: number;
  
  /**
   * Progress callback
   */
  onProgress?: (step: number, total: number) => void;
}