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
    });

    it('should create client with minimal options', () => {
      const client = new NutrientClient({ apiKey: 'test-key' });
      expect(client).toBeDefined();
    });

    it('should create client with async API key function', () => {
      const asyncApiKey = async (): Promise<string> => 'async-key';
      const client = new NutrientClient({ apiKey: asyncApiKey });
      expect(client).toBeDefined();
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






  describe('workflow()', () => {
    let client: NutrientClient;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
    });

    it('should create WorkflowBuilder instance', () => {
      const workflow = client.workflow();

      expect(MockWorkflowBuilder).toHaveBeenCalledWith(validOptions);
      expect(workflow).toBeInstanceOf(WorkflowBuilder);
    });

    it('should pass client options to WorkflowBuilder', () => {
      const customOptions = { apiKey: 'custom-key', baseUrl: 'https://custom.api.com' };
      const customClient = new NutrientClient(customOptions);

      customClient.workflow();

      expect(MockWorkflowBuilder).toHaveBeenCalledWith(customOptions);
    });
  });



});
