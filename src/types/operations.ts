import type { FileInput } from './inputs';

/**
 * Available operations in the Nutrient DWS API
 */
export type OperationType = 
  | 'convert' 
  | 'merge' 
  | 'compress' 
  | 'extract' 
  | 'watermark';

/**
 * Base operation interface
 */
export interface BaseOperation {
  type: OperationType;
}

/**
 * Convert operation parameters
 */
export interface ConvertOperation extends BaseOperation {
  type: 'convert';
  file: FileInput;
  targetFormat: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';
  options?: {
    quality?: number;
    optimize?: boolean;
  };
}

/**
 * Merge operation parameters
 */
export interface MergeOperation extends BaseOperation {
  type: 'merge';
  files: FileInput[];
  outputFormat?: 'pdf' | 'docx';
}

/**
 * Compress operation parameters
 */
export interface CompressOperation extends BaseOperation {
  type: 'compress';
  file: FileInput;
  compressionLevel?: 'low' | 'medium' | 'high' | 'maximum';
}

/**
 * Extract text operation parameters
 */
export interface ExtractOperation extends BaseOperation {
  type: 'extract';
  file: FileInput;
  includeMetadata?: boolean;
}

/**
 * Watermark operation parameters
 */
export interface WatermarkOperation extends BaseOperation {
  type: 'watermark';
  file: FileInput;
  watermarkText: string;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  fontSize?: number;
}

/**
 * Union type for all operations
 */
export type Operation = 
  | ConvertOperation 
  | MergeOperation 
  | CompressOperation 
  | ExtractOperation 
  | WatermarkOperation;