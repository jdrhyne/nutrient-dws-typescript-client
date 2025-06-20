/**
 * Base response interface
 */
export interface BaseResponse {
  success: boolean;
}

/**
 * Error response from the API
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Extract text response
 */
export interface ExtractTextResponse extends BaseResponse {
  success: true;
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

/**
 * File operation response (for operations that return files)
 */
export interface FileResponse extends BaseResponse {
  success: true;
  data: Blob;
  filename: string;
  contentType: string;
}