/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { WorkflowBuilder } from '../workflow';
import type { NutrientClientOptions } from '../types/common';
import type { WorkflowExecuteOptions } from '../types/workflow';
import { ValidationError } from '../errors';
import * as inputsModule from '../inputs';
import * as httpModule from '../http';
import { BuildActions } from '../build';

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
    });
  });

  describe('addFilePart', () => {
    it('should add file part to workflow', () => {
      const inputFile = 'test.pdf';

      const result = workflow.addFilePart(inputFile);

      expect(result).toBe(workflow); // Should return this for chaining
    });

    it('should validate input file', () => {
      mockValidateFileInput.mockReturnValue(false);

      expect(() => workflow.addFilePart('invalid-file')).toThrow(ValidationError);
      expect(() => workflow.addFilePart('invalid-file')).toThrow(
        'Invalid file input provided to workflow',
      );
    });

    it('should add file part with actions', () => {
      const result = workflow.addFilePart('test.pdf', {}, [BuildActions.rotate(90)]);

      expect(result).toBe(workflow);
    });
  });

  describe('addHtmlPart', () => {
    it('should add HTML part to workflow', () => {
      const result = workflow.addHtmlPart('<html><body>Hello</body></html>');

      expect(result).toBe(workflow);
    });

    it('should add HTML part with options and actions', () => {
      const result = workflow.addHtmlPart(
        '<html><body>Hello</body></html>',
        { assets: ['style.css'] },
        [BuildActions.rotate(90)]
      );

      expect(result).toBe(workflow);
    });
  });

  describe('addNewPage', () => {
    it('should add new page to workflow', () => {
      const result = workflow.addNewPage();

      expect(result).toBe(workflow);
    });

    it('should add new page with options and actions', () => {
      const result = workflow.addNewPage(
        { pageCount: 3 },
        [BuildActions.rotate(90)]
      );

      expect(result).toBe(workflow);
    });
  });

  describe('addDocumentPart', () => {
    it('should add document part to workflow', () => {
      const result = workflow.addDocumentPart('doc-id-123');

      expect(result).toBe(workflow);
    });

    it('should add document part with options and actions', () => {
      const result = workflow.addDocumentPart(
        'doc-id-123',
        { layer: 'layer1' },
        [BuildActions.rotate(90)]
      );

      expect(result).toBe(workflow);
    });
  });

  describe('applyActions', () => {
    it('should apply actions to workflow', () => {
      const result = workflow.applyActions([
        BuildActions.ocr('english'),
        BuildActions.flatten()
      ]);

      expect(result).toBe(workflow);
    });

    it('should apply single action to workflow', () => {
      const result = workflow.applyAction(BuildActions.rotate(90));

      expect(result).toBe(workflow);
    });
  });

  describe('output methods', () => {
    it('should set PDF output', () => {
      const result = workflow.outputPdf();
      expect(result).toBe(workflow);
    });

    it('should set PDF/A output', () => {
      const result = workflow.outputPdfA();
      expect(result).toBe(workflow);
    });

    it('should set image output', () => {
      const result = workflow.outputImage({ format: 'png' });
      expect(result).toBe(workflow);
    });

    it('should set office output', () => {
      const result = workflow.outputOffice('docx');
      expect(result).toBe(workflow);
    });

    it('should set JSON output', () => {
      const result = workflow.outputJson({ plainText: true });
      expect(result).toBe(workflow);
    });
  });

  describe('validation', () => {
    it('should validate workflow has parts before execution', async () => {
      await expect(workflow.execute()).rejects.toThrow(ValidationError);
      await expect(workflow.execute()).rejects.toThrow('Workflow has no parts to execute');
    });

    it('should auto-add default output if none specified', async () => {
      workflow.addFilePart('test.pdf');

      // Should succeed and add default PDF output
      const result = await workflow.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      workflow.addFilePart('test.pdf');
    });

    it('should execute workflow using Build API', async () => {
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
          endpoint: '/build',
          method: 'POST',
          files: expect.objectContaining({
            file_0: 'test.pdf',
          }),
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  file: 'file_0',
                }),
              ]),
              output: expect.objectContaining({
                type: 'pdf',
              }),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should execute multi-step workflow with correct build instructions', async () => {
      workflow.addFilePart('test.pdf').outputOffice('docx').applyAction(BuildActions.flatten());

      const mockBlob = new Blob(['result'], { type: 'application/docx' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(mockSendRequest).toHaveBeenCalledTimes(1);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/build',
          method: 'POST',
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  file: expect.any(String),
                }),
              ]),
              actions: expect.arrayContaining([
                expect.objectContaining({
                  type: 'flatten',
                }),
              ]),
              output: expect.objectContaining({
                type: 'docx',
              }),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should execute extract text workflow with correct output format', async () => {
      workflow.applyAction(BuildActions.ocr('english')).outputJson({ plainText: true });

      const mockResponse = { text: 'extracted text', metadata: {} };
      mockSendRequest.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              actions: expect.arrayContaining([
                expect.objectContaining({
                  type: 'ocr',
                  language: 'english',
                }),
              ]),
              output: expect.objectContaining({
                type: 'json-content',
              }),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should execute watermark workflow with correct action', async () => {
      workflow.applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
        width: { value: 50, unit: '%' },
        height: { value: 50, unit: '%' },
        opacity: 0.5,
      }));

      const mockBlob = new Blob(['watermarked'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              actions: expect.arrayContaining([
                expect.objectContaining({
                  type: 'watermark',
                  text: 'CONFIDENTIAL',
                  opacity: 0.5,
                }),
              ]),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should execute merge workflow with multiple files', async () => {
      workflow.addFilePart('file1.pdf');
      workflow.addFilePart('file2.pdf');
      workflow.addFilePart('file3.pdf');

      const mockBlob = new Blob(['merged'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.objectContaining({
            file_0: 'test.pdf',
            file_1: 'file1.pdf',
            file_2: 'file2.pdf',
            file_3: 'file3.pdf',
          }),
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({ file: 'file_0' }),
                expect.objectContaining({ file: 'file_1' }),
                expect.objectContaining({ file: 'file_2' }),
                expect.objectContaining({ file: 'file_3' }),
              ]),
              output: expect.objectContaining({
                type: 'pdf',
              }),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should call progress callback', async () => {
      workflow.addFilePart('test.pdf').outputOffice('docx').applyAction(BuildActions.flatten());

      const onProgress = jest.fn();
      const options: WorkflowExecuteOptions = { onProgress };

      await workflow.execute(options);

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 1);
    });

    it('should store output with default name', async () => {
      workflow.addFilePart('test.docx').outputOffice('docx');

      const mockBlob = new Blob(['result'], { type: 'application/docx' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.blob).toBe(mockBlob);
      expect(result.output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should handle Build API errors', async () => {
      const error = new Error('Build API failed');
      mockSendRequest.mockRejectedValueOnce(error);

      const result = await workflow.execute();

      expect(result.success).toBe(false);
      expect(mockSendRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors during execution', async () => {
      workflow.addFilePart('test.pdf');

      const error = new Error('API failed');
      mockSendRequest.mockRejectedValueOnce(error);

      const result = await workflow.execute();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBe(error);
    });

    it('should handle execution errors', async () => {
      workflow.addFilePart('test.pdf');

      const error = new Error('Execution failed');
      mockSendRequest.mockRejectedValueOnce(error);

      const result = await workflow.execute();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBe(error);
    });

    it('should handle timeout option', async () => {
      const timeout = 30000;
      await workflow.execute({ timeout });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout,
        }),
        mockClientOptions,
      );
    });
  });

  describe('output management', () => {
    beforeEach(() => {
      workflow.addFilePart('test.pdf');
    });

    it('should get specific output by name', async () => {
      workflow.addFilePart('test.docx').outputOffice('docx');

      const mockBlob = new Blob(['content'], { type: 'application/docx' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await workflow.execute();

      const output = workflow.getOutput();
      expect(output?.blob).toBe(mockBlob);
      expect(output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should get workflow output', async () => {
      workflow.addFilePart('test.docx').outputOffice('docx');

      const mockBlob = new Blob(['content'], { type: 'application/docx' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await workflow.execute();

      const output = workflow.getOutput();
      expect(output).toBeDefined();
      expect(output?.blob).toBe(mockBlob);
      expect(output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should set correct mimetype for JSON output', async () => {
      workflow.addFilePart('test.pdf').outputJson({ plainText: true });

      const mockJsonResponse = { text: 'extracted text' };
      mockSendRequest.mockResolvedValueOnce({
        data: mockJsonResponse,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.output?.blob).toBe(mockJsonResponse);
      expect(result.output?.mimeType).toBe('application/json');
    });

    it('should fallback to determined mimetype when content-type header is missing', async () => {
      workflow.addFilePart('test.pdf').outputPdf();

      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockSendRequest.mockResolvedValueOnce({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: {}, // No content-type header
      });

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.output?.blob).toBe(mockBlob);
      expect(result.output?.mimeType).toBe('application/pdf'); // Should be determined from output type
    });
  });

  describe('dryRun', () => {
    beforeEach(() => {
      workflow.addFilePart('test.pdf');
    });

    it('should analyze workflow using analyze_build API', async () => {
      const mockAnalysisResponse = {
        cost: 3.5,
        required_features: {
          ocr_api: [
            {
              unit_cost: 2,
              units: 1,
              cost: 2,
              usage: ['$.actions[0]']
            }
          ],
          annotation_api: [
            {
              unit_cost: 0.5,
              units: 3,
              cost: 1.5,
              usage: ['$.parts[0].actions[0]']
            }
          ]
        }
      };

      mockSendRequest.mockResolvedValueOnce({
        data: mockAnalysisResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.dryRun();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.analysis).toEqual(mockAnalysisResponse);
      expect(mockSendRequest).toHaveBeenCalledTimes(1);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/analyze_build',
          method: 'POST',
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  file: 'file_0',
                }),
              ]),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should analyze complex workflow with multiple parts and actions', async () => {
      workflow.addFilePart('file1.pdf');
      workflow.addFilePart('file2.pdf', {}, [BuildActions.rotate(90)]);
      workflow.applyActions([BuildActions.ocr('english')]);
      workflow.outputPdf();

      const mockAnalysisResponse = {
        cost: 5.5,
        required_features: {
          ocr_api: [
            {
              unit_cost: 2,
              units: 2,
              cost: 4,
              usage: ['$.actions[0]']
            }
          ],
          document_editor_api: [
            {
              unit_cost: 1.5,
              units: 1,
              cost: 1.5,
              usage: ['$.parts[1].actions[0]']
            }
          ]
        }
      };

      mockSendRequest.mockResolvedValueOnce({
        data: mockAnalysisResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await workflow.dryRun();

      expect(result.success).toBe(true);
      expect(result.analysis).toEqual(mockAnalysisResponse);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/analyze_build',
          method: 'POST',
          data: expect.objectContaining({
            instructions: expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  file: expect.any(String),
                }),
                expect.objectContaining({
                  file: expect.any(String),
                  actions: expect.arrayContaining([
                    expect.objectContaining({
                      type: 'rotate',
                    }),
                  ]),
                }),
              ]),
              actions: expect.arrayContaining([
                expect.objectContaining({
                  type: 'ocr',
                }),
              ]),
            }),
          }),
        }),
        mockClientOptions,
      );
    });

    it('should handle timeout option', async () => {
      const timeout = 30000;
      const mockAnalysisResponse = { cost: 1.5 };

      mockSendRequest.mockResolvedValueOnce({
        data: mockAnalysisResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await workflow.dryRun({ timeout });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout,
        }),
        mockClientOptions,
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Analyze API failed');
      mockSendRequest.mockRejectedValueOnce(error);

      const result = await workflow.dryRun();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBe(error);
      expect(mockSendRequest).toHaveBeenCalledTimes(1);
    });

    it('should validate workflow before dry run', async () => {
      // Clear all parts by creating a new workflow instance
      workflow = new WorkflowBuilder(mockClientOptions);

      await expect(workflow.dryRun()).rejects.toThrow(ValidationError);
      await expect(workflow.dryRun()).rejects.toThrow('Workflow has no parts to execute');
    });
  });
});
