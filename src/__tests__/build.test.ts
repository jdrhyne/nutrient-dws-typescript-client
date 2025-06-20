import { BuildApiBuilder, BuildActions, BuildOutputs } from '../build';
import type { NutrientClientOptions } from '../types';
import { sendRequest } from '../http';
import { ValidationError } from '../errors';

// Mock dependencies
jest.mock('../http');
jest.mock('../inputs', () => ({
  validateFileInput: jest.fn().mockReturnValue(true),
  processFileInput: jest.fn().mockResolvedValue({
    data: Buffer.from('test file content'),
    filename: 'test.pdf',
    contentType: 'application/pdf',
  }),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('BuildApiBuilder', () => {
  const mockOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty parts', () => {
      const builder = new BuildApiBuilder(mockOptions);
      expect(() => builder.getInstructions()).toThrow(ValidationError);
      expect(() => builder.getInstructions()).toThrow(
        'At least one part must be added to build a document',
      );
    });
  });

  describe('addFile', () => {
    it('should add a file part to instructions', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addFile('test.pdf');

      const instructions = builder.getInstructions();
      expect(instructions.parts).toHaveLength(1);
      expect(instructions.parts[0]).toMatchObject({
        file: 'test.pdf',
      });
    });

    it('should add file with options', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addFile('test.pdf', {
        password: 'secret',
        pages: { start: 0, end: 5 },
        contentType: 'application/pdf',
      });

      const instructions = builder.getInstructions();
      expect(instructions.parts[0]).toMatchObject({
        file: 'test.pdf',
        password: 'secret',
        pages: { start: 0, end: 5 },
        content_type: 'application/pdf',
      });
    });

    it('should support method chaining', () => {
      const builder = new BuildApiBuilder(mockOptions);
      const result = builder.addFile('file1.pdf').addFile('file2.pdf');

      expect(result).toBe(builder);
      expect(builder.getInstructions().parts).toHaveLength(2);
    });
  });

  describe('addHtml', () => {
    it('should add an HTML part to instructions', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addHtml('<h1>Test</h1>');

      const instructions = builder.getInstructions();
      expect(instructions.parts).toHaveLength(1);
      expect(instructions.parts[0]).toMatchObject({
        html: '<h1>Test</h1>',
      });
    });

    it('should add HTML with assets and layout', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addHtml('<h1>Test</h1>', {
        assets: ['style.css', 'script.js'],
        layout: {
          orientation: 'landscape',
          size: 'A4',
        },
      });

      const instructions = builder.getInstructions();
      expect(instructions.parts[0]).toMatchObject({
        html: '<h1>Test</h1>',
        assets: ['style.css', 'script.js'],
        layout: {
          orientation: 'landscape',
          size: 'A4',
        },
      });
    });
  });

  describe('addNewPages', () => {
    it('should add new blank pages', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addNewPages(3);

      const instructions = builder.getInstructions();
      expect(instructions.parts).toHaveLength(1);
      expect(instructions.parts[0]).toMatchObject({
        page: 'new',
        pageCount: 3,
      });
    });

    it('should add single page by default', () => {
      const builder = new BuildApiBuilder(mockOptions);
      builder.addNewPages();

      const instructions = builder.getInstructions();
      expect(instructions.parts[0]).toMatchObject({
        page: 'new',
      });
    });
  });

  describe('withActions', () => {
    it('should add actions to instructions', () => {
      const builder = new BuildApiBuilder(mockOptions);
      const ocrAction = BuildActions.ocr('english');
      const rotateAction = BuildActions.rotate(90);

      builder.addFile('test.pdf').withActions([ocrAction, rotateAction]);

      const instructions = builder.getInstructions();
      expect(instructions.actions).toEqual([ocrAction, rotateAction]);
    });

    it('should append to existing actions', () => {
      const builder = new BuildApiBuilder(mockOptions);
      const action1 = BuildActions.ocr('english');
      const action2 = BuildActions.rotate(90);

      builder.addFile('test.pdf').withActions([action1]).withActions([action2]);

      const instructions = builder.getInstructions();
      expect(instructions.actions).toEqual([action1, action2]);
    });
  });

  describe('setOutput', () => {
    it('should set output configuration', () => {
      const builder = new BuildApiBuilder(mockOptions);
      const pdfOutput = BuildOutputs.pdf({ optimize: { linearize: true } });

      builder.addFile('test.pdf').setOutput(pdfOutput);

      const instructions = builder.getInstructions();
      expect(instructions.output).toEqual(pdfOutput);
    });
  });

  describe('execute', () => {
    it('should send request with processed instructions', async () => {
      const mockResponse = {
        data: new Blob(['result']),
        status: 200,
        statusText: 'OK',
        headers: {},
      };
      mockSendRequest.mockResolvedValueOnce(mockResponse);

      const builder = new BuildApiBuilder(mockOptions);
      const result = await builder.addFile('test.pdf').execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/build',
          method: 'POST',
          files: { file0: 'test.pdf' },
          data: {
            instructions: expect.objectContaining({
              parts: [{ file: 'file0' }],
            }) as unknown,
          },
        }),
        mockOptions,
      );
      expect(result).toBe(mockResponse.data);
    });

    it('should handle multiple files', async () => {
      const mockResponse = {
        data: new Blob(['result']),
        status: 200,
        statusText: 'OK',
        headers: {},
      };
      mockSendRequest.mockResolvedValueOnce(mockResponse);

      const builder = new BuildApiBuilder(mockOptions);
      await builder.addFile('file1.pdf').addHtml('<h1>Title</h1>').addFile('file2.pdf').execute();

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          files: {
            file0: 'file1.pdf',
            html1: '<h1>Title</h1>',
            file2: 'file2.pdf',
          },
          data: {
            instructions: expect.objectContaining({
              parts: [{ file: 'file0' }, { html: 'html1' }, { file: 'file2' }],
            }) as unknown,
          },
        }),
        mockOptions,
      );
    });

    it('should throw if no parts added', async () => {
      const builder = new BuildApiBuilder(mockOptions);
      await expect(builder.execute()).rejects.toThrow(ValidationError);
      await expect(builder.execute()).rejects.toThrow(
        'At least one part must be added to build a document',
      );
    });
  });
});

describe('BuildActions', () => {
  describe('ocr', () => {
    it('should create OCR action with single language', () => {
      const action = BuildActions.ocr('english');
      expect(action).toEqual({
        type: 'ocr',
        language: 'english',
      });
    });

    it('should create OCR action with multiple languages', () => {
      const action = BuildActions.ocr(['english', 'spanish', 'french']);
      expect(action).toEqual({
        type: 'ocr',
        language: ['english', 'spanish', 'french'],
      });
    });
  });

  describe('rotate', () => {
    it('should create rotation action', () => {
      const action = BuildActions.rotate(90);
      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 90,
      });
    });
  });

  describe('watermarkText', () => {
    it('should create text watermark action', () => {
      const action = BuildActions.watermarkText('CONFIDENTIAL', {
        width: { value: 100, unit: 'pt' },
        height: { value: 50, unit: 'pt' },
        opacity: 0.5,
        fontSize: 36,
      });

      expect(action.type).toBe('watermark');
      expect(action.text).toBe('CONFIDENTIAL');
      expect(action.opacity).toBe(0.5);
      expect(action.fontSize).toBe(36);
    });
  });

  describe('flatten', () => {
    it('should create flatten action', () => {
      const action = BuildActions.flatten();
      expect(action).toEqual({ type: 'flatten' });
    });

    it('should create flatten action with specific annotations', () => {
      const action = BuildActions.flatten(['annotation1', 123, 'annotation3']);
      expect(action).toEqual({
        type: 'flatten',
        annotationIds: ['annotation1', 123, 'annotation3'],
      });
    });
  });

  describe('redaction actions', () => {
    it('should create text redaction action', () => {
      const action = BuildActions.createRedactionsText('SSN: 123-45-6789', {
        caseSensitive: false,
        includeAnnotations: true,
      });

      expect(action).toMatchObject({
        type: 'createRedactions',
        strategy: 'text',
        strategyOptions: {
          text: 'SSN: 123-45-6789',
          caseSensitive: false,
          includeAnnotations: true,
        },
      });
    });

    it('should create regex redaction action', () => {
      const action = BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}', {
        caseSensitive: true,
      });

      expect(action).toMatchObject({
        type: 'createRedactions',
        strategy: 'regex',
        strategyOptions: {
          regex: '\\d{3}-\\d{2}-\\d{4}',
          caseSensitive: true,
        },
      });
    });

    it('should create preset redaction action', () => {
      const action = BuildActions.createRedactionsPreset('social-security-number');

      expect(action).toMatchObject({
        type: 'createRedactions',
        strategy: 'preset',
        strategyOptions: {
          preset: 'social-security-number',
        },
      });
    });

    it('should create apply redactions action', () => {
      const action = BuildActions.applyRedactions();
      expect(action).toEqual({ type: 'applyRedactions' });
    });
  });
});

describe('BuildOutputs', () => {
  describe('pdf', () => {
    it('should create PDF output with defaults', () => {
      const output = BuildOutputs.pdf();
      expect(output).toEqual({ type: 'pdf' });
    });

    it('should create PDF output with options', () => {
      const output = BuildOutputs.pdf({
        metadata: { title: 'Test PDF', author: 'Test Author' },
        userPassword: 'user123',
        ownerPassword: 'owner123',
        optimize: { linearize: true },
      });

      expect(output).toEqual({
        type: 'pdf',
        metadata: { title: 'Test PDF', author: 'Test Author' },
        user_password: 'user123',
        owner_password: 'owner123',
        optimize: { linearize: true },
      });
    });
  });

  describe('pdfa', () => {
    it('should create PDF/A output', () => {
      const output = BuildOutputs.pdfa({
        conformance: 'pdfa-2b',
        vectorization: true,
      });

      expect(output).toEqual({
        type: 'pdfa',
        conformance: 'pdfa-2b',
        vectorization: true,
      });
    });
  });

  describe('image', () => {
    it('should create image output', () => {
      const output = BuildOutputs.image({
        format: 'png',
        width: 800,
        height: 600,
        dpi: 150,
      });

      expect(output).toEqual({
        type: 'image',
        format: 'png',
        width: 800,
        height: 600,
        dpi: 150,
      });
    });
  });

  describe('jsonContent', () => {
    it('should create JSON content output', () => {
      const output = BuildOutputs.jsonContent({
        plainText: true,
        structuredText: true,
        tables: true,
        language: 'english',
      });

      expect(output).toEqual({
        type: 'json-content',
        plainText: true,
        structuredText: true,
        tables: true,
        language: 'english',
      });
    });
  });

  describe('office', () => {
    it('should create office output', () => {
      const docx = BuildOutputs.office('docx');
      const xlsx = BuildOutputs.office('xlsx');
      const pptx = BuildOutputs.office('pptx');

      expect(docx).toEqual({ type: 'docx' });
      expect(xlsx).toEqual({ type: 'xlsx' });
      expect(pptx).toEqual({ type: 'pptx' });
    });
  });
});
