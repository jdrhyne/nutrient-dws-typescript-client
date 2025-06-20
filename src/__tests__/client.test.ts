/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { NutrientClient } from '../client';
import type { NutrientClientOptions } from '../types/common';
import { ValidationError } from '../errors';
import { WorkflowBuilder } from '../workflow';
import * as inputsModule from '../inputs';
import * as httpModule from '../http';

// Mock dependencies
jest.mock('../inputs');
jest.mock('../http');
jest.mock('../workflow');

const mockValidateFileInput = inputsModule.validateFileInput as jest.MockedFunction<
  typeof inputsModule.validateFileInput
>;
const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<typeof httpModule.sendRequest>;
const MockWorkflowBuilder = WorkflowBuilder as jest.MockedClass<typeof WorkflowBuilder>;

describe('NutrientClient', () => {
  const validOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFileInput.mockReturnValue(true);
    mockSendRequest.mockResolvedValue({
      data: new Blob(['mock response'], { type: 'application/pdf' }),
      status: 200,
      statusText: 'OK',
      headers: {},
    });
  });

  describe('constructor', () => {
    it('should create client with valid options', () => {
      const client = new NutrientClient(validOptions);
      expect(client).toBeDefined();
      expect(client.getApiKey()).toBe('test-api-key');
      expect(client.getBaseUrl()).toBe('https://api.test.com/v1');
    });

    it('should create client with minimal options', () => {
      const client = new NutrientClient({ apiKey: 'test-key' });
      expect(client.getApiKey()).toBe('test-key');
      expect(client.getBaseUrl()).toBe('https://api.nutrient.io/v1'); // Default base URL
    });

    it('should create client with async API key function', () => {
      const asyncApiKey = async (): Promise<string> => 'async-key';
      const client = new NutrientClient({ apiKey: asyncApiKey });
      expect(client.getApiKey()).toBe(asyncApiKey);
    });

    it('should throw ValidationError for missing options', () => {
      expect(() => new NutrientClient(null as unknown as NutrientClientOptions)).toThrow(
        ValidationError,
      );
      expect(() => new NutrientClient(null as unknown as NutrientClientOptions)).toThrow(
        'Client options are required',
      );
    });

    it('should throw ValidationError for missing API key', () => {
      expect(() => new NutrientClient({} as NutrientClientOptions)).toThrow(ValidationError);
      expect(() => new NutrientClient({} as NutrientClientOptions)).toThrow(
        'API key is required',
      );
    });

    it('should throw ValidationError for invalid API key type', () => {
      expect(() => new NutrientClient({ apiKey: 123 as unknown as string })).toThrow(
        ValidationError,
      );
      expect(() => new NutrientClient({ apiKey: 123 as unknown as string })).toThrow(
        'API key must be a string or a function that returns a Promise<string>',
      );
    });

    it('should throw ValidationError for invalid base URL type', () => {
      expect(
        () =>
          new NutrientClient({
            apiKey: 'test-key',
            baseUrl: 123 as unknown as string,
          }),
      ).toThrow(ValidationError);
      expect(
        () =>
          new NutrientClient({
            apiKey: 'test-key',
            baseUrl: 123 as unknown as string,
          }),
      ).toThrow('Base URL must be a string');
    });
  });

  describe('convert', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should convert document successfully', async () => {
      const mockBlob = new Blob(['converted content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.convert('test.docx', 'pdf', { quality: 90 });

      expect(result).toBe(mockBlob);
      expect(mockValidateFileInput).toHaveBeenCalledWith('test.docx');
      expect(mockSendRequest).toHaveBeenCalledWith(
        {
          endpoint: '/convert',
          method: 'POST',
          files: { file: 'test.docx' },
          data: { targetFormat: 'pdf', quality: 90 },
        },
        validOptions,
      );
    });

    it('should convert without options', async () => {
      await client.convert('test.docx', 'pdf');

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { targetFormat: 'pdf' },
        }),
        validOptions,
      );
    });

    it('should throw ValidationError for invalid file input', async () => {
      mockValidateFileInput.mockReturnValue(false);

      await expect(client.convert('invalid-file', 'pdf')).rejects.toThrow(ValidationError);
      await expect(client.convert('invalid-file', 'pdf')).rejects.toThrow(
        'Invalid file input provided',
      );
    });
  });

  describe('merge', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should merge documents successfully', async () => {
      const mockBlob = new Blob(['merged content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const files = ['file1.pdf', 'file2.pdf', 'file3.pdf'];
      const result = await client.merge(files, 'pdf');

      expect(result).toBe(mockBlob);
      expect(mockSendRequest).toHaveBeenCalledWith(
        {
          endpoint: '/merge',
          method: 'POST',
          files: {
            'files[0]': 'file1.pdf',
            'files[1]': 'file2.pdf',
            'files[2]': 'file3.pdf',
          },
          data: { outputFormat: 'pdf' },
        },
        validOptions,
      );
    });

    it('should merge without output format', async () => {
      const files = ['file1.pdf', 'file2.pdf'];
      await client.merge(files);

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { outputFormat: undefined },
        }),
        validOptions,
      );
    });

    it('should throw ValidationError for insufficient files', async () => {
      await expect(client.merge(['single-file.pdf'])).rejects.toThrow(ValidationError);
      await expect(client.merge(['single-file.pdf'])).rejects.toThrow(
        'At least 2 files are required for merge operation',
      );

      await expect(client.merge([])).rejects.toThrow(ValidationError);
      await expect(client.merge([])).rejects.toThrow(
        'At least 2 files are required for merge operation',
      );
    });

    it('should throw ValidationError for non-array input', async () => {
      await expect(client.merge('not-an-array' as unknown as string[])).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError for invalid file in array', async () => {
      mockValidateFileInput.mockImplementation((file) => file !== 'invalid-file');

      await expect(client.merge(['valid-file.pdf', 'invalid-file'])).rejects.toThrow(
        ValidationError,
      );
      await expect(client.merge(['valid-file.pdf', 'invalid-file'])).rejects.toThrow(
        'Invalid file at index 1',
      );
    });

    it('should throw ValidationError for null/undefined file in array', async () => {
      await expect(client.merge(['valid-file.pdf', null as unknown as string])).rejects.toThrow(
        ValidationError,
      );
      await expect(client.merge(['valid-file.pdf', null as unknown as string])).rejects.toThrow(
        'Invalid file at index 1',
      );
    });
  });

  describe('compress', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should compress document successfully', async () => {
      const mockBlob = new Blob(['compressed content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.compress('large-file.pdf', 'high');

      expect(result).toBe(mockBlob);
      expect(mockValidateFileInput).toHaveBeenCalledWith('large-file.pdf');
      expect(mockSendRequest).toHaveBeenCalledWith(
        {
          endpoint: '/compress',
          method: 'POST',
          files: { file: 'large-file.pdf' },
          data: { compressionLevel: 'high' },
        },
        validOptions,
      );
    });

    it('should compress without compression level', async () => {
      await client.compress('file.pdf');

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { compressionLevel: undefined },
        }),
        validOptions,
      );
    });

    it('should throw ValidationError for invalid file input', async () => {
      mockValidateFileInput.mockReturnValue(false);

      await expect(client.compress('invalid-file')).rejects.toThrow(ValidationError);
      await expect(client.compress('invalid-file')).rejects.toThrow(
        'Invalid file input provided',
      );
    });
  });

  describe('extractText', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should extract text successfully', async () => {
      const mockResponse = {
        text: 'Extracted text content',
        metadata: { pages: 5, wordCount: 100 },
      };
      mockSendRequest.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.extractText('document.pdf', true);

      expect(result).toBe(mockResponse);
      expect(mockValidateFileInput).toHaveBeenCalledWith('document.pdf');
      expect(mockSendRequest).toHaveBeenCalledWith(
        {
          endpoint: '/extract',
          method: 'POST',
          files: { file: 'document.pdf' },
          data: { includeMetadata: true },
        },
        validOptions,
      );
    });

    it('should extract text without metadata', async () => {
      const mockResponse = { text: 'Extracted text content' };
      mockSendRequest.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.extractText('document.pdf');

      expect(result).toBe(mockResponse);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { includeMetadata: undefined },
        }),
        validOptions,
      );
    });

    it('should throw ValidationError for invalid file input', async () => {
      mockValidateFileInput.mockReturnValue(false);

      await expect(client.extractText('invalid-file')).rejects.toThrow(ValidationError);
      await expect(client.extractText('invalid-file')).rejects.toThrow(
        'Invalid file input provided',
      );
    });
  });

  describe('watermark', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should add watermark successfully', async () => {
      const mockBlob = new Blob(['watermarked content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.watermark('document.pdf', 'CONFIDENTIAL', {
        position: 'center',
        opacity: 0.5,
        fontSize: 48,
      });

      expect(result).toBe(mockBlob);
      expect(mockValidateFileInput).toHaveBeenCalledWith('document.pdf');
      expect(mockSendRequest).toHaveBeenCalledWith(
        {
          endpoint: '/watermark',
          method: 'POST',
          files: { file: 'document.pdf' },
          data: {
            watermarkText: 'CONFIDENTIAL',
            position: 'center',
            opacity: 0.5,
            fontSize: 48,
          },
        },
        validOptions,
      );
    });

    it('should add watermark without options', async () => {
      await client.watermark('document.pdf', 'DRAFT');

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { watermarkText: 'DRAFT' },
        }),
        validOptions,
      );
    });

    it('should throw ValidationError for invalid file input', async () => {
      mockValidateFileInput.mockReturnValue(false);

      await expect(client.watermark('invalid-file', 'TEXT')).rejects.toThrow(ValidationError);
      await expect(client.watermark('invalid-file', 'TEXT')).rejects.toThrow(
        'Invalid file input provided',
      );
    });

    it('should throw ValidationError for missing watermark text', async () => {
      await expect(client.watermark('document.pdf', '')).rejects.toThrow(ValidationError);
      await expect(client.watermark('document.pdf', '')).rejects.toThrow(
        'Watermark text is required and must be a string',
      );

      await expect(
        client.watermark('document.pdf', null as unknown as string),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.watermark('document.pdf', null as unknown as string),
      ).rejects.toThrow('Watermark text is required and must be a string');
    });

    it('should throw ValidationError for invalid watermark text type', async () => {
      await expect(
        client.watermark('document.pdf', 123 as unknown as string),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.watermark('document.pdf', 123 as unknown as string),
      ).rejects.toThrow('Watermark text is required and must be a string');
    });
  });

  describe('buildWorkflow', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should create WorkflowBuilder instance', () => {
      const workflow = client.buildWorkflow();

      expect(MockWorkflowBuilder).toHaveBeenCalledWith(validOptions);
      expect(workflow).toBeInstanceOf(WorkflowBuilder);
    });

    it('should pass client options to WorkflowBuilder', () => {
      const customOptions = { apiKey: 'custom-key', baseUrl: 'https://custom.api.com' };
      const customClient = new NutrientClient(customOptions);

      customClient.buildWorkflow();

      expect(MockWorkflowBuilder).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('getApiKey', () => {
    it('should return string API key', () => {
      const client = new NutrientClient({ apiKey: 'string-key' });
      expect(client.getApiKey()).toBe('string-key');
    });

    it('should return function API key', () => {
      const asyncApiKey = async (): Promise<string> => 'async-key';
      const client = new NutrientClient({ apiKey: asyncApiKey });
      expect(client.getApiKey()).toBe(asyncApiKey);
    });
  });

  describe('getBaseUrl', () => {
    it('should return custom base URL', () => {
      const client = new NutrientClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com/v2',
      });
      expect(client.getBaseUrl()).toBe('https://custom.api.com/v2');
    });

    it('should return default base URL when not specified', () => {
      const client = new NutrientClient({ apiKey: 'test-key' });
      expect(client.getBaseUrl()).toBe('https://api.nutrient.io/v1');
    });
  });

  describe('error handling integration', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should propagate HTTP errors from sendRequest', async () => {
      const httpError = new Error('Network error');
      mockSendRequest.mockRejectedValueOnce(httpError);

      await expect(client.convert('test.pdf', 'docx')).rejects.toThrow(httpError);
    });

    it('should handle validation errors consistently across methods', async () => {
      mockValidateFileInput.mockReturnValue(false);

      await expect(client.convert('invalid', 'pdf')).rejects.toThrow('Invalid file input provided');
      await expect(client.compress('invalid')).rejects.toThrow('Invalid file input provided');
      await expect(client.extractText('invalid')).rejects.toThrow('Invalid file input provided');
      await expect(client.watermark('invalid', 'text')).rejects.toThrow(
        'Invalid file input provided',
      );
    });
  });
});