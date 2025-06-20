/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { WorkflowBuilder } from '../workflow';
import type { NutrientClientOptions, WorkflowExecuteOptions } from '../types/common';
import { ValidationError, NutrientError } from '../errors';
import * as inputsModule from '../inputs';
import * as httpModule from '../http';

// Mock dependencies
jest.mock('../inputs');
jest.mock('../http');

const mockValidateFileInput = inputsModule.validateFileInput as jest.MockedFunction<
  typeof inputsModule.validateFileInput
>;
const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<
  typeof httpModule.sendRequest
>;

describe('WorkflowBuilder', () => {
  const mockClientOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  let workflow: WorkflowBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    workflow = new WorkflowBuilder(mockClientOptions);

    // Default mocks
    mockValidateFileInput.mockReturnValue(true);
    mockSendRequest.mockResolvedValue({
      data: new Blob(['mock response'], { type: 'application/pdf' }),
      status: 200,
      statusText: 'OK',
      headers: {},
    });
  });

  describe('constructor', () => {
    it('should create a workflow with client options', () => {
      const builder = new WorkflowBuilder(mockClientOptions);
      expect(builder).toBeDefined();
      expect(builder.stepCount).toBe(0);
    });
  });

  describe('input', () => {
    it('should add initial input step', () => {
      const inputFile = 'test.pdf';

      const result = workflow.input(inputFile);

      expect(result).toBe(workflow); // Should return this for chaining
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'convert',
          file: inputFile,
          targetFormat: 'pdf',
        },
        outputName: '_initial',
      });
    });

    it('should validate input file', () => {
      mockValidateFileInput.mockReturnValue(false);

      expect(() => workflow.input('invalid-file')).toThrow(ValidationError);
      expect(() => workflow.input('invalid-file')).toThrow(
        'Invalid file input provided to workflow',
      );
    });
  });

  describe('convert', () => {
    it('should add convert step with target format', () => {
      const result = workflow.convert('docx');

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'convert',
          file: '_previous',
          targetFormat: 'docx',
        },
      });
    });

    it('should add convert step with options and output name', () => {
      workflow.convert('pdf', { quality: 95 }, 'high-quality');

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'convert',
          file: '_previous',
          targetFormat: 'pdf',
          options: { quality: 95 },
        },
        outputName: 'high-quality',
      });
    });
  });

  describe('merge', () => {
    it('should add merge step with additional files', () => {
      const additionalFiles = ['file2.pdf', 'file3.pdf'];

      const result = workflow.merge(additionalFiles);

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'merge',
          files: ['_previous', ...additionalFiles],
        },
      });
    });

    it('should add merge step with output format and name', () => {
      workflow.merge(['file2.pdf'], 'pdf', 'merged-output');

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'merge',
          files: ['_previous', 'file2.pdf'],
          outputFormat: 'pdf',
        },
        outputName: 'merged-output',
      });
    });

    it('should validate additional files', () => {
      mockValidateFileInput.mockImplementation((file) => file !== 'invalid-file');

      expect(() => workflow.merge(['valid-file', 'invalid-file'])).toThrow(ValidationError);
      expect(() => workflow.merge(['valid-file', 'invalid-file'])).toThrow(
        'Invalid file input in merge operation',
      );
    });
  });

  describe('compress', () => {
    it('should add compress step with default compression level', () => {
      const result = workflow.compress();

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'compress',
          file: '_previous',
        },
      });
    });

    it('should add compress step with compression level and output name', () => {
      workflow.compress('high', 'compressed-version');

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'compress',
          file: '_previous',
          compressionLevel: 'high',
        },
        outputName: 'compressed-version',
      });
    });
  });

  describe('extractText', () => {
    it('should add extract text step', () => {
      const result = workflow.extractText();

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'extract',
          file: '_previous',
        },
      });
    });

    it('should add extract text step with metadata and output name', () => {
      workflow.extractText(true, 'extracted-content');

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'extract',
          file: '_previous',
          includeMetadata: true,
        },
        outputName: 'extracted-content',
      });
    });
  });

  describe('watermark', () => {
    it('should add watermark step with text', () => {
      const result = workflow.watermark('CONFIDENTIAL');

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(1);

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'watermark',
          file: '_previous',
          watermarkText: 'CONFIDENTIAL',
        },
      });
    });

    it('should add watermark step with options and output name', () => {
      workflow.watermark(
        'DRAFT',
        {
          position: 'top-right',
          opacity: 0.5,
          fontSize: 36,
        },
        'watermarked-version',
      );

      const steps = workflow.getSteps();
      expect(steps[0]).toMatchObject({
        operation: {
          type: 'watermark',
          file: '_previous',
          watermarkText: 'DRAFT',
          position: 'top-right',
          opacity: 0.5,
          fontSize: 36,
        },
        outputName: 'watermarked-version',
      });
    });
  });

  describe('step management', () => {
    it('should return correct step count', () => {
      expect(workflow.stepCount).toBe(0);

      workflow.input('test.pdf');
      expect(workflow.stepCount).toBe(1);

      workflow.convert('docx').compress();
      expect(workflow.stepCount).toBe(3);
    });

    it('should return copy of steps', () => {
      workflow.input('test.pdf').convert('docx');

      const steps = workflow.getSteps();
      expect(steps).toHaveLength(2);

      // Should be a copy, not reference
      steps.push({} as never);
      expect(workflow.stepCount).toBe(2);
    });

    it('should clear all steps and state', () => {
      workflow.input('test.pdf').convert('docx');
      expect(workflow.stepCount).toBe(2);

      const result = workflow.clear();

      expect(result).toBe(workflow);
      expect(workflow.stepCount).toBe(0);
      expect(workflow.getSteps()).toHaveLength(0);
    });
  });

  describe('validation', () => {
    it('should validate workflow has steps before execution', async () => {
      await expect(workflow.execute()).rejects.toThrow(ValidationError);
      await expect(workflow.execute()).rejects.toThrow('Workflow has no steps to execute');
    });

    it('should validate first step has input file', async () => {
      workflow.convert('pdf'); // First step with _previous reference

      await expect(workflow.execute()).rejects.toThrow(ValidationError);
      await expect(workflow.execute()).rejects.toThrow(
        'First workflow step must have an input file specified',
      );
    });

    it('should allow merge as first step but fail during execution', async () => {
      workflow.merge(['file1.pdf', 'file2.pdf']);

      // Merge as first step passes validation but fails during execution due to no current file
      const result = await workflow.execute();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error.message).toContain(
        'No current file available for merge operation',
      );
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      workflow.input('test.pdf');
    });

    it('should execute single step workflow successfully', async () => {
      const mockBlob = new Blob(['converted content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockSendRequest).toHaveBeenCalledTimes(1);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/convert',
          method: 'POST',
          files: { file: 'test.pdf' },
          data: { targetFormat: 'pdf' },
        }),
        mockClientOptions,
      );
    });

    it('should execute multi-step workflow', async () => {
      workflow.convert('docx').compress('medium');

      const convertBlob = new Blob(['converted'], { type: 'application/docx' });
      const compressBlob = new Blob(['compressed'], { type: 'application/docx' });

      mockSendRequest
        .mockResolvedValueOnce({ data: convertBlob, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: convertBlob, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: compressBlob, status: 200, statusText: 'OK', headers: {} });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(mockSendRequest).toHaveBeenCalledTimes(3);
    });

    it('should call progress callback', async () => {
      workflow.convert('docx').compress();

      const onProgress = jest.fn();
      const options = { onProgress } satisfies WorkflowExecuteOptions;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await workflow.execute(options);

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
    });

    it('should store named outputs', async () => {
      workflow.convert('docx', undefined, 'word-version').compress('high', 'compressed-version');

      const convertBlob = new Blob(['converted'], { type: 'application/docx' });
      const compressBlob = new Blob(['compressed'], { type: 'application/docx' });

      mockSendRequest
        .mockResolvedValueOnce({ data: convertBlob, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: convertBlob, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: compressBlob, status: 200, statusText: 'OK', headers: {} });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.outputs.has('word-version')).toBe(true);
      expect(result.outputs.has('compressed-version')).toBe(true);
      expect(result.outputs.get('word-version')).toBe(convertBlob);
      expect(result.outputs.get('compressed-version')).toBe(compressBlob);
    });

    it('should handle step errors without continueOnError', async () => {
      workflow.convert('docx');

      const error = new Error('Conversion failed');
      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockRejectedValueOnce(error);

      const result = await workflow.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        step: 1,
        error,
      });
    });

    it('should continue on errors when continueOnError is true', async () => {
      workflow.convert('docx').compress();

      const error = new Error('Conversion failed');
      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} });

      const result = await workflow.execute({ continueOnError: true });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(mockSendRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle unknown errors in steps', async () => {
      workflow.convert('docx');

      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockRejectedValueOnce('string error');

      const result = await workflow.execute({ continueOnError: true });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBeInstanceOf(NutrientError);
    });
  });

  describe('operation execution', () => {
    beforeEach(() => {
      workflow.input('test.pdf');
    });

    it('should execute convert operation', async () => {
      workflow.convert('docx', { quality: 90 });

      await workflow.execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/convert',
          method: 'POST',
          files: { file: expect.any(Object) },
          data: { targetFormat: 'docx', quality: 90 },
        }),
        mockClientOptions,
      );
    });

    it('should execute merge operation', async () => {
      workflow.merge(['file2.pdf', 'file3.pdf'], 'pdf');

      await workflow.execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/merge',
          method: 'POST',
          files: expect.objectContaining({
            'files[0]': expect.any(Object),
            'files[1]': 'file2.pdf',
            'files[2]': 'file3.pdf',
          }),
          data: { outputFormat: 'pdf' },
        }),
        mockClientOptions,
      );
    });

    it('should execute compress operation', async () => {
      workflow.compress('high');

      await workflow.execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/compress',
          method: 'POST',
          files: { file: expect.any(Object) },
          data: { compressionLevel: 'high' },
        }),
        mockClientOptions,
      );
    });

    it('should execute extract operation', async () => {
      workflow.extractText(true);

      const extractResponse = { text: 'extracted text', metadata: {} };
      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({
          data: extractResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      await workflow.execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/extract',
          method: 'POST',
          files: { file: expect.any(Object) },
          data: { includeMetadata: true },
        }),
        mockClientOptions,
      );
    });

    it('should execute watermark operation', async () => {
      workflow.watermark('CONFIDENTIAL', { position: 'center', opacity: 0.5 });

      await workflow.execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/watermark',
          method: 'POST',
          files: { file: expect.any(Object) },
          data: {
            watermarkText: 'CONFIDENTIAL',
            position: 'center',
            opacity: 0.5,
          },
        }),
        mockClientOptions,
      );
    });

    it('should handle error for unknown operation type', async () => {
      // Manually add invalid step to test error handling
      (workflow as unknown as { steps: unknown[] }).steps.push({
        operation: { type: 'unknown', file: '_previous' },
      });

      const result = await workflow.execute();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error.message).toContain('Unknown operation type: unknown');
    });
  });

  describe('output management', () => {
    beforeEach(() => {
      workflow.input('test.pdf');
    });

    it('should get specific output by name', async () => {
      workflow.convert('docx', undefined, 'word-version');

      const mockBlob = new Blob(['content'], { type: 'application/docx' });
      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: mockBlob, status: 200, statusText: 'OK', headers: {} });

      await workflow.execute();

      expect(workflow.getOutput('word-version')).toBe(mockBlob);
      expect(workflow.getOutput('non-existent')).toBeUndefined();
    });

    it('should get all outputs', async () => {
      workflow.convert('docx', undefined, 'word-version').compress('high', 'compressed-version');

      const convertBlob = new Blob(['converted'], { type: 'application/docx' });
      const compressBlob = new Blob(['compressed'], { type: 'application/docx' });

      mockSendRequest
        .mockResolvedValueOnce({ data: new Blob(), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: convertBlob, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: compressBlob, status: 200, statusText: 'OK', headers: {} });

      await workflow.execute();

      const allOutputs = workflow.getAllOutputs();
      expect(allOutputs.size).toBe(3); // Includes '_initial' from input step
      expect(allOutputs.get('word-version')).toBe(convertBlob);
      expect(allOutputs.get('compressed-version')).toBe(compressBlob);
      expect(allOutputs.has('_initial')).toBe(true);
    });
  });

  describe('error handling in step execution', () => {
    it('should handle missing current file for _previous reference', async () => {
      // Clear and add step that references _previous without input
      workflow.clear().convert('pdf');

      await expect(workflow.execute()).rejects.toThrow(ValidationError);
      await expect(workflow.execute()).rejects.toThrow(
        'First workflow step must have an input file specified',
      );
    });

    it('should handle missing current file in merge operation', async () => {
      // Clear and add merge step without current file
      workflow.clear().merge(['file1.pdf']);

      const result = await workflow.execute();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error.message).toContain(
        'No current file available for merge operation',
      );
    });

    it('should handle missing previous output in step', async () => {
      // Manually create scenario where current file is missing mid-workflow
      workflow.convert('pdf');

      // Mock first step success but clear current file before second step
      mockSendRequest.mockImplementation(() => {
        (workflow as unknown as { currentFile: null }).currentFile = null; // Simulate missing current file
        throw new ValidationError(
          'Step 1 references previous output but no previous output exists',
        );
      });

      await expect(workflow.execute()).rejects.toThrow(ValidationError);
    });
  });
});
