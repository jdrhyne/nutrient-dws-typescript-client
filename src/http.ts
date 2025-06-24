import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import FormData from 'form-data';
import { type NormalizedFileData, processFileInput } from './inputs';
import {
  APIError,
  AuthenticationError,
  NetworkError,
  NutrientError,
  ValidationError,
} from './errors';
import type { NutrientClientOptions } from './types';
import type { components } from './generated/api-types';
import { isNode } from './utils/environment';

/**
 * HTTP request configuration for API calls
 */
export interface RequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  instructions?: components['schemas']['BuildInstructions'];
  files?: Map<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Response from API call
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Sends HTTP request to Nutrient DWS API
 */
export async function sendRequest<T = unknown>(
  config: RequestConfig,
  clientOptions: NutrientClientOptions,
): Promise<ApiResponse<T>> {
  try {
    const apiKey = await resolveApiKey(clientOptions.apiKey);
    const baseUrl = clientOptions.baseUrl ?? 'https://api.nutrient.io';
    const url = `${baseUrl.replace(/\/$/, '')}/${config.endpoint.replace(/^\//, '')}`;

    // Use arraybuffer for cross-platform binary data support
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      responseType: config.instructions?.output?.type === 'json-content' ? 'json' : 'arraybuffer',
    };

    await prepareRequestBody(axiosConfig, config);
    const response = await axios(axiosConfig);

    return handleResponse<T>(response);
  } catch (error) {
    throw convertError(error, config);
  }
}

/**
 * Resolves API key from string or async function
 */
async function resolveApiKey(apiKey: string | (() => Promise<string>)): Promise<string> {
  if (typeof apiKey === 'string') {
    return apiKey;
  }

  try {
    const resolvedKey = await apiKey();
    if (typeof resolvedKey !== 'string' || resolvedKey.length === 0) {
      throw new AuthenticationError('API key function must return a non-empty string', {
        resolvedType: typeof resolvedKey,
      });
    }
    return resolvedKey;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Failed to resolve API key from function', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Prepares request body with files and data
 */
async function prepareRequestBody(
  axiosConfig: AxiosRequestConfig,
  config: RequestConfig,
): Promise<void> {
  if (config.files && config.files.size > 0) {
    if (!config.instructions) {
      throw new ValidationError('File uploads require instructions', {
        files: config.files,
      });
    }
    // Use FormData for file uploads
    axiosConfig.data = await createFormData(config.files, config.instructions);

    // Set appropriate headers for FormData
    axiosConfig.headers = {
      ...axiosConfig.headers,
    };
  } else if (config.instructions) {
    // JSON only request
    axiosConfig.data = config.instructions;
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'Content-Type': 'application/json',
    };
  }
}

/**
 * Creates FormData with files and additional data
 */
async function createFormData(
  files: Map<string, unknown>,
  instructions: components['schemas']['BuildInstructions'],
): Promise<FormData> {
  const formData = new FormData();

  for (const [key, value] of files) {
    const normalizedFile = await processFileInput(value as never);
    appendFileToFormData(formData, key, normalizedFile);
  }

  formData.append('instructions', JSON.stringify(instructions));

  return formData;
}

/**
 * Appends file to FormData with proper format
 */
function appendFileToFormData(
  formData: FormData | globalThis.FormData,
  key: string,
  file: NormalizedFileData,
): void {
  if (isNode() && formData instanceof FormData) {
    // Node.js FormData
    if (Buffer.isBuffer(file.data)) {
      formData.append(key, file.data, file.filename);
    } else if (file.data instanceof Uint8Array) {
      formData.append(key, Buffer.from(file.data), file.filename);
    } else {
      throw new ValidationError(
        'Node.js environment expects Buffer, Uint8Array, or ReadableStream for file data',
        {
          dataType: typeof file.data,
        },
      );
    }
  } else {
    // Browser FormData
    if (file.data instanceof Blob) {
      (formData as globalThis.FormData).append(key, file.data, file.filename);
    } else if (file.data instanceof Uint8Array) {
      const blob = new Blob([file.data], { type: file.contentType });
      (formData as globalThis.FormData).append(key, blob, file.filename);
    } else {
      throw new ValidationError('Browser environment expects Blob or Uint8Array for file data', {
        dataType: typeof file.data,
      });
    }
  }
}

/**
 * Handles HTTP response and converts to standardized format
 */
function handleResponse<T>(response: AxiosResponse): ApiResponse<T> {
  const { status, statusText, headers } = response;

  if (status >= 400) {
    throw createHttpError(status, statusText, response.data);
  }

  let responseData: T;
  const contentType = response.headers['content-type'] as string;

  if (contentType?.includes('application/json')) {
    const arrayBuffer = response.data as ArrayBuffer;
    const text = new TextDecoder('utf-8').decode(arrayBuffer);
    responseData = JSON.parse(text) as T;
  } else {
    const arrayBuffer = response.data as ArrayBuffer;
    if (isNode()) {
      responseData = Buffer.from(arrayBuffer) as T;
    } else {
      // In browsers, you might want to return ArrayBuffer or Uint8Array
      responseData = new Uint8Array(arrayBuffer) as T;
    }
  }

  return {
    data: responseData,
    status,
    statusText,
    headers: headers as Record<string, string>,
  };
}

/**
 * Creates appropriate error for HTTP status codes
 */
function createHttpError(status: number, statusText: string, data: unknown): NutrientError {
  const message = extractErrorMessage(data) ?? `HTTP ${status}: ${statusText}`;
  const details = extractErrorDetails(data) ?? { response: data };

  if (status === 401 || status === 403) {
    return new AuthenticationError(message, details, status);
  }

  if (status >= 400 && status < 500) {
    return new ValidationError(message, details, status);
  }

  return new APIError(message, status, details);
}

/**
 * Extracts error message from response data
 */
function extractErrorMessage(data: unknown): string | null {
  let errorData: Record<string, unknown>;

  // Handle ArrayBuffer data (common in error responses)
  if (data instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder('utf-8').decode(data);
      errorData = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof data === 'object' && data !== null) {
    errorData = data as Record<string, unknown>;
  } else {
    return null;
  }

  // Common error message fields
  if (typeof errorData['message'] === 'string') {
    return errorData['message'];
  }
  if (typeof errorData['error'] === 'string') {
    return errorData['error'];
  }
  if (typeof errorData['detail'] === 'string') {
    return errorData['detail'];
  }

  return null;
}

/**
 * Extracts error details from response data, ensuring proper conversion from Buffer/ArrayBuffer
 */
function extractErrorDetails(data: unknown): Record<string, unknown> | null {
  // Handle ArrayBuffer data (common in error responses)
  if (data instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder('utf-8').decode(data);
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // Handle direct Buffer instances (Node.js environment)
  if (isNode() && Buffer.isBuffer(data)) {
    try {
      const text = new TextDecoder('utf-8').decode(data);
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // Handle Buffer.toJSON() format (Node.js environment)
  if (typeof data === 'object' && data !== null && 'type' in data && (data as any).type === 'Buffer') {
    try {
      const buffer = Buffer.from((data as any).data);
      const text = new TextDecoder('utf-8').decode(buffer);
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // Handle regular objects
  if (typeof data === 'object' && data !== null) {
    return data as Record<string, unknown>;
  }

  return null;
}

/**
 * Converts various error types to NutrientError
 */
function convertError(error: unknown, config: RequestConfig): NutrientError {
  if (error instanceof NutrientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;
    const request = error.request as unknown;
    const message = error.message;

    if (response) {
      // HTTP error response
      return createHttpError(response.status, response.statusText, response.data);
    }

    if (request) {
      // Network error (request made but no response)
      return new NetworkError('Network request failed', {
        message,
        endpoint: config.endpoint,
        method: config.method,
      });
    }

    // Request setup error
    return new ValidationError('Request configuration error', { message, config });
  }

  // Unknown error
  return new NutrientError('Unexpected error occurred', 'UNKNOWN_ERROR', {
    error: error instanceof Error ? error.message : String(error),
    endpoint: config.endpoint,
  });
}
