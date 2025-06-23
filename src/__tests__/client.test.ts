import { NutrientClient } from '../client';
import type {
  FileInput,
  NutrientClientOptions,
  OutputTypeMap,
  TypedWorkflowResult,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
  WorkflowInitialStage,
  WorkflowWithActionsStage,
  WorkflowWithOutputStage,
  WorkflowWithPartsStage,
} from '../types';
import type { components } from '../generated/api-types';
import { ValidationError } from '../errors';
import * as workflowModule from '../workflow';
import * as inputsModule from '../inputs';
import * as httpModule from '../http';

// Mock dependencies
jest.mock('../inputs');
jest.mock('../http');
jest.mock('../workflow');

// Mock interfaces for workflow stages
interface MockWorkflowWithOutputStage<T extends keyof OutputTypeMap | undefined = undefined>
  extends WorkflowWithOutputStage<T> {
  execute: jest.MockedFunction<
    (options?: WorkflowExecuteOptions) => Promise<TypedWorkflowResult<T>>
  >;
  dryRun: jest.MockedFunction<
    (options?: Pick<WorkflowExecuteOptions, 'timeout'>) => Promise<WorkflowDryRunResult>
  >;
}

interface MockWorkflowWithPartsStage extends WorkflowWithPartsStage {
  addPart: jest.MockedFunction<(part: components['schemas']['Part']) => WorkflowWithPartsStage>;
  addFilePart: jest.MockedFunction<
    (
      file: FileInput,
      options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => WorkflowWithPartsStage
  >;
  addHtmlPart: jest.MockedFunction<
    (
      html: string | Blob,
      options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => WorkflowWithPartsStage
  >;
  addNewPage: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => WorkflowWithPartsStage
  >;
  addDocumentPart: jest.MockedFunction<
    (
      documentId: string,
      options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
        layer?: string;
      },
      actions?: components['schemas']['BuildAction'][],
    ) => WorkflowWithPartsStage
  >;
  applyActions: jest.MockedFunction<
    (actions: components['schemas']['BuildAction'][]) => WorkflowWithActionsStage
  >;
  applyAction: jest.MockedFunction<
    (action: components['schemas']['BuildAction']) => WorkflowWithActionsStage
  >;
  output: jest.MockedFunction<
    (output: components['schemas']['BuildOutput']) => WorkflowWithOutputStage
  >;
  outputPdf: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['PDFOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'pdf'>
  >;
  outputPdfA: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'pdfa'>
  >;
  outputImage: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['ImageOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'image'>
  >;
  outputOffice: jest.MockedFunction<
    <T extends 'docx' | 'xlsx' | 'pptx'>(format: T) => MockWorkflowWithOutputStage<T>
  >;
  outputJson: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['JSONContentOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'json-content'>
  >;
}

interface MockWorkflowInitialStage extends WorkflowInitialStage {
  addPart: jest.MockedFunction<(part: components['schemas']['Part']) => MockWorkflowWithPartsStage>;
  addFilePart: jest.MockedFunction<
    (
      file: FileInput,
      options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addHtmlPart: jest.MockedFunction<
    (
      html: string | Blob,
      options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addNewPage: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addDocumentPart: jest.MockedFunction<
    (
      documentId: string,
      options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
        layer?: string;
      },
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
}

const mockValidateFileInput = inputsModule.validateFileInput as jest.MockedFunction<
  typeof inputsModule.validateFileInput
>;
const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<
  typeof httpModule.sendRequest
>;
const mockWorkflow = workflowModule.workflow as jest.MockedFunction<typeof workflowModule.workflow>;

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
      const asyncApiKey = (): Promise<string> => Promise.resolve('async-key');
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
      expect(() => new NutrientClient({} as NutrientClientOptions)).toThrow('API key is required');
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
    let mockWorkflowInstance: MockWorkflowInitialStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = {
        addPart: jest.fn().mockReturnThis(),
        addFilePart: jest.fn().mockReturnThis(),
        addHtmlPart: jest.fn().mockReturnThis(),
        addNewPage: jest.fn().mockReturnThis(),
        addDocumentPart: jest.fn().mockReturnThis(),
      } as MockWorkflowInitialStage;
      mockWorkflow.mockReturnValue(mockWorkflowInstance);
    });

    it('should create workflow instance', () => {
      const workflow = client.workflow();

      expect(mockWorkflow).toHaveBeenCalledWith(validOptions);
      expect(workflow).toBe(mockWorkflowInstance);
    });

    it('should pass client options to workflow', () => {
      const customOptions = { apiKey: 'custom-key', baseUrl: 'https://custom.api.com' };
      const customClient = new NutrientClient(customOptions);

      customClient.workflow();

      expect(mockWorkflow).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('ocr()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: { buffer: new Uint8Array() } }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = {
        addPart: jest.fn().mockReturnThis(),
        addFilePart: jest.fn().mockReturnThis(),
        addHtmlPart: jest.fn().mockReturnThis(),
        addNewPage: jest.fn().mockReturnThis(),
        addDocumentPart: jest.fn().mockReturnThis(),
        applyActions: jest.fn().mockReturnThis(),
        applyAction: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        outputPdf: jest.fn().mockReturnValue(mockOutputStage),
        outputPdfA: jest.fn().mockReturnValue(mockOutputStage),
        outputImage: jest.fn().mockReturnValue(mockOutputStage),
        outputOffice: jest.fn().mockReturnValue(mockOutputStage),
        outputJson: jest.fn().mockReturnValue(mockOutputStage),
        execute: mockOutputStage.execute,
        dryRun: mockOutputStage.dryRun,
      } as MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;
      mockWorkflow.mockReturnValue(mockWorkflowInstance);
    });

    it('should perform OCR with single language and default PDF output', async () => {
      const file = 'test-file.pdf';
      const language = 'english';

      await client.ocr(file, language);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'ocr', language: 'english' },
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should perform OCR with multiple languages', async () => {
      const file = 'test-file.pdf';
      const languages = ['english', 'spanish'] as components['schemas']['OcrLanguage'][];

      await client.ocr(file, languages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'ocr', language: ['english', 'spanish'] },
      ]);
    });

    it('should perform OCR with PDF/A output format', async () => {
      const file = 'test-file.pdf';
      const language = 'english';

      await client.ocr(file, language, 'pdfa');

      expect(mockWorkflowInstance.outputPdfA).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdf).not.toHaveBeenCalled();
    });
  });

  describe('watermark()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: { buffer: new Uint8Array() } }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = {
        addPart: jest.fn().mockReturnThis(),
        addFilePart: jest.fn().mockReturnThis(),
        addHtmlPart: jest.fn().mockReturnThis(),
        addNewPage: jest.fn().mockReturnThis(),
        addDocumentPart: jest.fn().mockReturnThis(),
        applyActions: jest.fn().mockReturnThis(),
        applyAction: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        outputPdf: jest.fn().mockReturnValue(mockOutputStage),
        outputPdfA: jest.fn().mockReturnValue(mockOutputStage),
        outputImage: jest.fn().mockReturnValue(mockOutputStage),
        outputOffice: jest.fn().mockReturnValue(mockOutputStage),
        outputJson: jest.fn().mockReturnValue(mockOutputStage),
        execute: mockOutputStage.execute,
        dryRun: mockOutputStage.dryRun,
      } as MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;
      mockWorkflow.mockReturnValue(mockWorkflowInstance);
    });

    it('should add text watermark with default options', async () => {
      const file = 'test-file.pdf';
      const text = 'CONFIDENTIAL';

      await client.watermark(file, text);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'watermark',
          text: 'CONFIDENTIAL',
          width: { value: 100, unit: '%' },
          height: { value: 100, unit: '%' },
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
    });

    it('should add text watermark with custom options', async () => {
      const file = 'test-file.pdf';
      const text = 'DRAFT';
      const options = {
        opacity: 0.5,
        fontSize: 24,
        fontColor: '#ff0000',
        rotation: 45,
      };

      await client.watermark(file, text, options);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'watermark',
          text: 'DRAFT',
          opacity: 0.5,
          fontSize: 24,
          fontColor: '#ff0000',
          rotation: 45,
        }),
      ]);
    });

    it('should add watermark with PDF/A output format', async () => {
      const file = 'test-file.pdf';
      const text = 'CONFIDENTIAL';

      await client.watermark(file, text, {}, 'pdfa');

      expect(mockWorkflowInstance.outputPdfA).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdf).not.toHaveBeenCalled();
    });
  });

  describe('convert()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: { buffer: new Uint8Array() } }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = {
        addPart: jest.fn().mockReturnThis(),
        addFilePart: jest.fn().mockReturnThis(),
        addHtmlPart: jest.fn().mockReturnThis(),
        addNewPage: jest.fn().mockReturnThis(),
        addDocumentPart: jest.fn().mockReturnThis(),
        applyActions: jest.fn().mockReturnThis(),
        applyAction: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        outputPdf: jest.fn().mockReturnValue(mockOutputStage),
        outputPdfA: jest.fn().mockReturnValue(mockOutputStage),
        outputImage: jest.fn().mockReturnValue(mockOutputStage),
        outputOffice: jest.fn().mockReturnValue(mockOutputStage),
        outputJson: jest.fn().mockReturnValue(mockOutputStage),
        execute: mockOutputStage.execute,
        dryRun: mockOutputStage.dryRun,
      } as MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;
      mockWorkflow.mockReturnValue(mockWorkflowInstance);
    });

    it('should convert to PDF', async () => {
      const file = 'test-file.docx';

      await client.convert(file, 'pdf');

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should convert to PDF/A', async () => {
      const file = 'test-file.docx';

      await client.convert(file, 'pdfa');

      expect(mockWorkflowInstance.outputPdfA).toHaveBeenCalled();
    });

    it('should convert to DOCX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'docx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('docx');
    });

    it('should convert to XLSX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'xlsx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('xlsx');
    });

    it('should convert to PPTX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'pptx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('pptx');
    });

    it('should convert to image', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'image');

      expect(mockWorkflowInstance.outputImage).toHaveBeenCalled();
    });

    it('should throw ValidationError for unsupported format', async () => {
      const file = 'test-file.pdf';

      await expect(
        client.convert(file, 'unsupported' as 'pdf' | 'pdfa' | 'docx' | 'xlsx' | 'pptx' | 'image'),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.convert(file, 'unsupported' as 'pdf' | 'pdfa' | 'docx' | 'xlsx' | 'pptx' | 'image'),
      ).rejects.toThrow('Unsupported target format: unsupported');
    });
  });
});
