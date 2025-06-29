/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import { sendRequest } from '../http';
import type { RequestConfig } from '../http';
import type { NutrientClientOptions } from '../types/common';
import { AuthenticationError } from '../errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Mock axios.isAxiosError
mockedAxios.isAxiosError = jest.fn();

// Mock form-data with a simple implementation
const mockFormDataInstance = {
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({
    'content-type': 'multipart/form-data; boundary=----test',
  }),
};

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => mockFormDataInstance);
});

// Mock file input processing
jest.mock('../inputs', () => ({
  processFileInput: jest.fn().mockImplementation((input: unknown) => {
    if (typeof input === 'string' && input === 'test-file.pdf') {
      // Return a mock stream for file path inputs
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        read: jest.fn(),
      };
      return Promise.resolve({
        data: mockStream,
        filename: 'test-file.pdf',
        contentType: 'application/pdf',
      });
    }
    return Promise.resolve({
      data: Buffer.from('mock file data'),
      filename: 'file.bin',
      contentType: 'application/octet-stream',
    });
  }),
}));


// Mock environment detection
jest.mock('../utils/environment', () => ({
  isNode: jest.fn().mockReturnValue(true),
  isBrowser: jest.fn().mockReturnValue(false),
}));

describe('HTTP Layer', () => {
  const mockClientOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset form-data mock
    mockFormDataInstance.append.mockClear();
    mockFormDataInstance.getHeaders.mockClear();
    mockFormDataInstance.getHeaders.mockReturnValue({
      'content-type': 'multipart/form-data; boundary=----test',
    });
    // Reset axios.isAxiosError mock
    (mockedAxios.isAxiosError as jest.Mock).mockReturnValue(false);
  });

  describe('sendRequest', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      const result = await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.test.com/v1/test',
        headers: {
          Authorization: 'Bearer test-api-key',
        },
        timeout: 30000,
        validateStatus: expect.any(Function),
      });

      expect(result).toEqual({
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should handle async API key provider', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest.fn().mockResolvedValue('async-api-key') as () => Promise<string>,
      };

      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'POST',
        data: { foo: 'bar' },
      };

      await sendRequest(config, asyncOptions);

      expect(asyncOptions.apiKey as jest.Mock).toHaveBeenCalled();
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer async-api-key',
          }),
        }),
      );
    });

    it('should throw AuthenticationError for invalid async API key', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest.fn().mockResolvedValue('') as () => Promise<string>,
      };

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, asyncOptions)).rejects.toThrow(AuthenticationError);
      await expect(sendRequest(config, asyncOptions)).rejects.toThrow(
        'API key function must return a non-empty string',
      );
    });

    it('should throw AuthenticationError when async API key function fails', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest
          .fn()
          .mockRejectedValue(new Error('Token fetch failed')) as () => Promise<string>,
      };

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, asyncOptions)).rejects.toThrow(AuthenticationError);
      await expect(sendRequest(config, asyncOptions)).rejects.toThrow(
        'Failed to resolve API key from function',
      );
    });

    it('should send JSON data with proper headers', async () => {
      const mockResponse = {
        data: { id: 123 },
        status: 201,
        statusText: 'Created',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/create',
        method: 'POST',
        data: {
          userName: 'John Doe',
          emailAddress: 'john@example.com',
        },
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userName: 'John Doe',
            emailAddress: 'john@example.com',
          },
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should send files with FormData', async () => {
      const mockResponse = {
        data: { uploaded: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/upload',
        method: 'POST',
        files: new Map([['document', new Uint8Array([1, 2, 3, 4])]]), // Use Uint8Array instead of string
        instructions: {
          parts: [{ file: 'document' }],
          output: { type: 'pdf' },
        },
      };

      await sendRequest(config, mockClientOptions);

      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'document',
        expect.any(Object), // Expecting a Blob or similar object
        'file.bin' // Default filename for binary data
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('instructions', expect.any(String));
    });

    it('should handle 401 authentication error', async () => {
      const mockResponse = {
        data: { error: 'Invalid API key' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toMatchObject({
        name: 'AuthenticationError',
        message: 'Invalid API key',
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
      });
    });

    it('should handle 400 validation error', async () => {
      const mockResponse = {
        data: { message: 'Invalid parameters' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'POST',
        data: {},
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should handle 500 server error', async () => {
      const mockResponse = {
        data: { detail: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toMatchObject({
        name: 'APIError',
        message: 'Internal server error',
        code: 'API_ERROR',
        statusCode: 500,
      });
    });

    it('should handle network errors', async () => {
      const networkError = {
        isAxiosError: true,
        request: {},
        message: 'Network Error',
      };

      mockedAxios.mockRejectedValueOnce(networkError);
      (mockedAxios.isAxiosError as jest.Mock).mockReturnValue(true);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toMatchObject({
        name: 'NetworkError',
        message: 'Network request failed',
        code: 'NETWORK_ERROR',
      });
    });

    it('should handle request configuration errors', async () => {
      const configError = {
        isAxiosError: true,
        message: 'Request failed',
      };

      mockedAxios.mockRejectedValueOnce(configError);
      (mockedAxios.isAxiosError as jest.Mock).mockReturnValue(true);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Request configuration error',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle unknown errors', async () => {
      mockedAxios.mockRejectedValueOnce(new Error('Unknown error'));

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await expect(sendRequest(config, mockClientOptions)).rejects.toThrow(
        'Unexpected error occurred',
      );
    });

    it('should use custom timeout', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
        timeout: 60000,
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        }),
      );
    });

    it('should use default timeout when not specified', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const optionsWithoutTimeout: NutrientClientOptions = {
        apiKey: 'test-key',
      };

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await sendRequest(config, optionsWithoutTimeout);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000, // Default timeout
        }),
      );
    });

    it('should handle multiple files in request', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/merge',
        method: 'POST',
        files: new Map([
          ['file1', new Uint8Array([1, 2, 3])],
          ['file2', new Uint8Array([4, 5, 6])],
          ['file3', new Uint8Array([7, 8, 9])],
        ]),
        instructions: {
          parts: [{ file: 'file1' }, { file: 'file2' }, { file: 'file3' }],
          output: { type: 'pdf' },
        },
      };

      await sendRequest(config, mockClientOptions);

      expect(mockFormDataInstance.append).toHaveBeenCalledTimes(4); // 3 files + 1 instructions
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file1',
        expect.any(Object), // Expecting a Blob-like object created from Uint8Array
        'file.bin',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file2',
        expect.any(Object), // Expecting a Blob-like object created from Uint8Array
        'file.bin',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file3',
        expect.any(Object), // Expecting a Blob-like object created from Uint8Array
        'file.bin',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'instructions',
        expect.any(String), // JSON stringified instructions
      );
    });

    it('should handle binary response data', async () => {
      const binaryData = Buffer.from('PDF content here');
      const mockResponse = {
        data: binaryData,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/pdf',
        },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/download',
        method: 'GET',
      };

      const result = await sendRequest<Buffer>(config, mockClientOptions);

      expect(result.data).toBe(binaryData);
      expect(result.headers['content-type']).toBe('application/pdf');
    });

    it('should strip trailing slashes from base URL', async () => {
      const optionsWithTrailingSlash: NutrientClientOptions = {
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com/v1/',
      };

      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await sendRequest(config, optionsWithTrailingSlash);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.test.com/v1/test',
        }),
      );
    });

    it('should handle leading slash in endpoint', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: 'test', // No leading slash
        method: 'GET',
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.test.com/v1/test',
        }),
      );
    });
  });
});
