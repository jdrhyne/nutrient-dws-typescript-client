import axios from 'axios';
import { sendRequest } from '../http';
import type { RequestConfig } from '../http';
import type { NutrientClientOptions } from '../types';
import { AuthenticationError } from '../errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Create a proper mock for isAxiosError
const mockIsAxiosError = jest.fn() as unknown as jest.MockedFunction<typeof axios.isAxiosError>;
mockedAxios.isAxiosError = mockIsAxiosError;

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
      return Promise.resolve({
        data: Buffer.from('mock pdf file data'),
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
    // Reset axios mocks
    mockedAxios.mockClear();
    mockIsAxiosError.mockReturnValue(false);
  });

  describe('sendRequest', () => {
    it('should make a successful GET request', async () => {
      const responseData = JSON.stringify({ result: 'success' });
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
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
        responseType: 'arraybuffer',
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

      const responseData = JSON.stringify({ result: 'success' });
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'POST',
        instructions: { parts: [] },
      };

      await sendRequest(config, asyncOptions);

      expect(asyncOptions.apiKey as jest.Mock).toHaveBeenCalled();
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.nutrient.io/test',
          data: expect.objectContaining({ parts: [] }) as Record<string, unknown>,
          headers: expect.objectContaining({
            Authorization: 'Bearer async-api-key',
            'Content-Type': 'application/json',
          }),
          responseType: 'arraybuffer',
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
      const responseData = JSON.stringify({ id: 123 });
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/create',
        method: 'POST',
        instructions: {
          parts: [],
        },
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.test.com/v1/create',
          data: expect.objectContaining({ parts: [] }) as Record<string, unknown>,
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          responseType: 'arraybuffer',
        }),
      );
    });

    it('should send files with FormData', async () => {
      const responseData = JSON.stringify({ uploaded: true });
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/upload',
        method: 'POST',
        files: new Map([['document', 'test-file.pdf']]),
        instructions: {
          parts: [{ file: 'document' }],
          output: { type: 'pdf' },
        },
      };

      await sendRequest(config, mockClientOptions);

      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'document',
        expect.anything(), // Buffer object with Symbol properties
        'test-file.pdf',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'instructions', 
        JSON.stringify({
          parts: [{ file: 'document' }],
          output: { type: 'pdf' },
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      const mockResponse = {
        data: new TextEncoder().encode(JSON.stringify({ error: 'Invalid API key' })).buffer,
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'content-type': 'application/json' },
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
        data: new TextEncoder().encode(JSON.stringify({ message: 'Invalid parameters' })).buffer,
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'POST',
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
        data: new TextEncoder().encode(JSON.stringify({ detail: 'Internal server error' })).buffer,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'application/json' },
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
      mockIsAxiosError.mockReturnValue(true);

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
      mockIsAxiosError.mockReturnValue(true);

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
      const responseData = JSON.stringify({});
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
        timeout: 60000,
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.test.com/v1/test',
        headers: {
          Authorization: 'Bearer test-api-key',
        },
        responseType: 'arraybuffer',
      });
    });

    it('should use default timeout when not specified', async () => {
      const responseData = JSON.stringify({});
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
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

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.nutrient.io/test',
        headers: {
          Authorization: 'Bearer test-key',
        },
        responseType: 'arraybuffer',
      });
    });

    it('should handle multiple files in request', async () => {
      const responseData = JSON.stringify({ success: true });
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/merge',
        method: 'POST',
        files: new Map([
          ['file1', 'file1.pdf'],
          ['file2', 'file2.pdf'],
          ['file3', 'file3.pdf'],
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
        expect.anything(),
        'file.bin',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file2',
        expect.anything(),
        'file.bin',
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file3',
        expect.anything(),
        'file.bin',
      );
    });

    it('should handle binary response data', async () => {
      const binaryData = new TextEncoder().encode('PDF content here');
      const mockResponse = {
        data: binaryData.buffer,
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

      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.headers['content-type']).toBe('application/pdf');
    });

    it('should strip trailing slashes from base URL', async () => {
      const optionsWithTrailingSlash: NutrientClientOptions = {
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com/v1/',
      };

      const responseData = JSON.stringify({});
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: '/test',
        method: 'GET',
      };

      await sendRequest(config, optionsWithTrailingSlash);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.test.com/v1/test',
        headers: {
          Authorization: 'Bearer test-key',
        },
        responseType: 'arraybuffer',
      });
    });

    it('should handle leading slash in endpoint', async () => {
      const responseData = JSON.stringify({});
      const mockResponse = {
        data: new TextEncoder().encode(responseData).buffer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig = {
        endpoint: 'test', // No leading slash
        method: 'GET',
      };

      await sendRequest(config, mockClientOptions);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.test.com/v1/test',
        headers: {
          Authorization: 'Bearer test-api-key',
        },
        responseType: 'arraybuffer',
      });
    });
  });
});
