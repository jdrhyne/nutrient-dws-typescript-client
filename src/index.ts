// Main exports
export { NutrientClient } from './client';
export { WorkflowBuilder } from './workflow';

// Error exports
export {
  NutrientError,
  ValidationError,
  APIError,
  AuthenticationError,
  NetworkError,
} from './errors';

// Type exports
export type {
  // Client options
  NutrientClientOptions,

  // Input types
  FileInput,
  BrowserFileInput,
  BlobInput,
  FilePathInput,
  BufferInput,
  Uint8ArrayInput,
  UrlInput,

  // Operation types
  Operation,
  OperationType,
  ConvertOperation,
  MergeOperation,
  CompressOperation,
  ExtractOperation,
  WatermarkOperation,

  // Response types
  BaseResponse,
  ErrorResponse,
  ExtractTextResponse,
  FileResponse,

  // Workflow types
  WorkflowStep,
  WorkflowConfig,
  WorkflowResult,
  WorkflowExecuteOptions,
} from './types';

// Utility exports
export { validateFileInput, processFileInput, type NormalizedFileData } from './inputs';

export {
  getEnvironment,
  getEnvironmentCapabilities,
  isBrowser,
  isNode,
  isWebWorker,
  type Environment,
  type EnvironmentCapabilities,
} from './utils/environment';

export {
  camelToSnake,
  snakeToCamel,
  objectCamelToSnake,
  objectSnakeToCamel,
} from './utils/case-transform';
