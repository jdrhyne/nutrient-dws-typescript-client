import { BuildActions, BuildOutputs } from '../build';
import type { components } from '../generated/api-types';
import type { FileInput } from '../types';

describe('BuildActions', () => {
  describe('ocr()', () => {
    it('should create OCR action with single language', () => {
      const action = BuildActions.ocr('english');

      expect(action).toEqual({
        type: 'ocr',
        language: 'english',
      });
    });

    it('should create OCR action with multiple languages', () => {
      const languages: components['schemas']['OcrLanguage'][] = ['english', 'spanish'];
      const action = BuildActions.ocr(languages);

      expect(action).toEqual({
        type: 'ocr',
        language: ['english', 'spanish'],
      });
    });
  });

  describe('rotate()', () => {
    it('should create rotation action for 90 degrees', () => {
      const action = BuildActions.rotate(90);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 90,
      });
    });

    it('should create rotation action for 180 degrees', () => {
      const action = BuildActions.rotate(180);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 180,
      });
    });

    it('should create rotation action for 270 degrees', () => {
      const action = BuildActions.rotate(270);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 270,
      });
    });
  });

  describe('watermarkText()', () => {
    const defaultDimensions = {
      width: { value: 100, unit: '%' as const },
      height: { value: 100, unit: '%' as const },
    };

    it('should create text watermark action with minimal options', () => {
      const action = BuildActions.watermarkText('CONFIDENTIAL', defaultDimensions);

      expect(action).toEqual({
        type: 'watermark',
        text: 'CONFIDENTIAL',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        rotation: 0,
      });
    });

    it('should create text watermark action with all options', () => {
      const options = {
        ...defaultDimensions,
        opacity: 0.5,
        rotation: 45,
        fontSize: 24,
        fontColor: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: ['bold', 'italic'] as ('bold' | 'italic')[],
        top: { value: 10, unit: 'pt' as const },
        left: { value: 20, unit: 'pt' as const },
        right: { value: 30, unit: 'pt' as const },
        bottom: { value: 40, unit: 'pt' as const },
      };

      const action = BuildActions.watermarkText('DRAFT', options);

      expect(action).toEqual({
        type: 'watermark',
        text: 'DRAFT',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        opacity: 0.5,
        rotation: 45,
        fontSize: 24,
        fontColor: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: ['bold', 'italic'],
        top: { value: 10, unit: 'pt' },
        left: { value: 20, unit: 'pt' },
        right: { value: 30, unit: 'pt' },
        bottom: { value: 40, unit: 'pt' },
      });
    });
  });

  describe('watermarkImage()', () => {
    const defaultDimensions = {
      width: { value: 100, unit: '%' as const },
      height: { value: 100, unit: '%' as const },
    };

    it('should create image watermark action with minimal options', () => {
      const image = 'logo.png';
      const action = BuildActions.watermarkImage(image, defaultDimensions);

      expect(action).toEqual({
        type: 'watermark',
        image: { url: 'logo.png' },
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        rotation: 0,
      });
    });

    it('should create image watermark action with all options', () => {
      const image = 'watermark.png';
      const options = {
        ...defaultDimensions,
        opacity: 0.3,
        rotation: 30,
        top: { value: 10, unit: 'pt' as const },
        left: { value: 20, unit: 'pt' as const },
        right: { value: 30, unit: 'pt' as const },
        bottom: { value: 40, unit: 'pt' as const },
      };

      const action = BuildActions.watermarkImage(image, options);

      expect(action).toEqual({
        type: 'watermark',
        image: { url: 'watermark.png' },
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        opacity: 0.3,
        rotation: 30,
        top: { value: 10, unit: 'pt' },
        left: { value: 20, unit: 'pt' },
        right: { value: 30, unit: 'pt' },
        bottom: { value: 40, unit: 'pt' },
      });
    });
  });

  describe('flatten()', () => {
    it('should create flatten action without annotation IDs', () => {
      const action = BuildActions.flatten();

      expect(action).toEqual({
        type: 'flatten',
      });
    });

    it('should create flatten action with annotation IDs', () => {
      const annotationIds = ['ann1', 'ann2', 123];
      const action = BuildActions.flatten(annotationIds);

      expect(action).toEqual({
        type: 'flatten',
        annotationIds: ['ann1', 'ann2', 123],
      });
    });
  });

  describe('applyInstantJson()', () => {
    it('should create apply Instant JSON action with file registration', () => {
      const file: FileInput = 'annotations.json';
      const action = BuildActions.applyInstantJson(file);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('annotations.json');
      expect(action.createAction('file_0')).toEqual({
        type: 'applyInstantJson',
        file: 'file_0',
      });
    });
  });

  describe('applyXfdf()', () => {
    it('should create apply XFDF action with file registration', () => {
      const file: FileInput = 'annotations.xfdf';
      const action = BuildActions.applyXfdf(file);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('annotations.xfdf');
      expect(action.createAction('file_1')).toEqual({
        type: 'applyXfdf',
        file: 'file_1',
      });
    });
  });

  describe('applyRedactions()', () => {
    it('should create apply redactions action', () => {
      const action = BuildActions.applyRedactions();

      expect(action).toEqual({
        type: 'applyRedactions',
      });
    });
  });
});

describe('BuildOutputs', () => {
  describe('pdf()', () => {
    it('should create PDF output with no options', () => {
      const output = BuildOutputs.pdf();

      expect(output).toEqual({
        type: 'pdf',
      });
    });

    it('should create PDF output with all options', () => {
      const options = {
        metadata: { title: 'Test Document' },
        labels: [{ prefix: 'Page', style: 'decimal' as const }],
        userPassword: 'user123',
        ownerPassword: 'owner123',
        userPermissions: ['print' as const],
        optimize: { print: true } as components['schemas']['OptimizePdf'],
      };

      const output = BuildOutputs.pdf(options);

      expect(output).toEqual({
        type: 'pdf',
        metadata: { title: 'Test Document' },
        labels: [{ prefix: 'Page', style: 'decimal' }],
        user_password: 'user123',
        owner_password: 'owner123',
        user_permissions: ['print'],
        optimize: { print: true },
      });
    });
  });

  describe('pdfa()', () => {
    it('should create PDF/A output with no options', () => {
      const output = BuildOutputs.pdfa();

      expect(output).toEqual({
        type: 'pdfa',
      });
    });

    it('should create PDF/A output with all options', () => {
      const options = {
        conformance: 'pdfa-1b' as const,
        vectorization: true,
        rasterization: false,
        metadata: { title: 'Test Document' },
        userPassword: 'user123',
        ownerPassword: 'owner123',
      };

      const output = BuildOutputs.pdfa(options);

      expect(output).toEqual({
        type: 'pdfa',
        conformance: 'pdfa-1b',
        vectorization: true,
        rasterization: false,
        metadata: { title: 'Test Document' },
        user_password: 'user123',
        owner_password: 'owner123',
      });
    });
  });

  describe('image()', () => {
    it('should create image output with default options', () => {
      const output = BuildOutputs.image();

      expect(output).toEqual({
        type: 'image',
      });
    });

    it('should create image output with custom options', () => {
      const options = {
        format: 'png' as const,
        dpi: 300,
        pages: { start: 1, end: 5 },
      };

      const output = BuildOutputs.image(options);

      expect(output).toEqual({
        type: 'image',
        format: 'png',
        dpi: 300,
        pages: { start: 1, end: 5 },
      });
    });
  });
});
