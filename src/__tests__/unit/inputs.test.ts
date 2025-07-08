import { getPdfPageCount, isRemoteFileInput, processFileInput, validateFileInput } from '../../inputs';
import { ValidationError } from '../../errors';
import { Readable } from 'stream';
import fs from 'fs';
import type { FileInput } from '../../types';
import { samplePDF, TestDocumentGenerator } from '../helpers';

// Mock fetch for URL tests
global.fetch = jest.fn();

// Create test file data
function createTestBuffer(content: string = 'test content'): Buffer {
  return Buffer.from(content);
}

function createTestUint8Array(content: string = 'test content'): Uint8Array {
  return new TextEncoder().encode(content);
}

describe('Input Processing (Node.js only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileInput', () => {
    it('should validate string inputs', () => {
      expect(validateFileInput('test.pdf')).toBe(true);
      expect(validateFileInput('https://example.com/file.pdf')).toBe(true);
    });

    it('should validate Buffer objects', () => {
      const buffer = createTestBuffer();
      expect(validateFileInput(buffer)).toBe(true);
    });

    it('should validate Uint8Array objects', () => {
      const uint8Array = createTestUint8Array();
      expect(validateFileInput(uint8Array)).toBe(true);
    });

    it('should validate structured input objects', () => {
      expect(validateFileInput({ type: 'file-path', path: 'test.pdf' })).toBe(true);
      expect(validateFileInput({ type: 'buffer', buffer: Buffer.from('test'), filename: 'test.bin' })).toBe(true);
      expect(validateFileInput({ type: 'uint8array', data: new Uint8Array([1, 2, 3]), filename: 'test.bin' })).toBe(true);
      expect(validateFileInput({ type: 'url', url: 'https://example.com/test.pdf' })).toBe(true);
    });

    it('should reject invalid inputs', () => {
      expect(validateFileInput(null)).toBe(false);
      expect(validateFileInput(undefined)).toBe(false);
      expect(validateFileInput(123)).toBe(false);
      expect(validateFileInput({})).toBe(false);
      expect(validateFileInput({ type: 'invalid' })).toBe(false);
    });
  });

  describe('processFileInput - Buffer', () => {
    it('should process Buffer object', async () => {
      const buffer = createTestBuffer('test content');
      const result = await processFileInput(buffer);

      expect(result).toEqual({
        data: buffer,
        filename: 'buffer',
      });
    });

    it('should process structured buffer input with custom filename', async () => {
      const buffer = createTestBuffer('test content');
      const input = { type: 'buffer' as const, buffer, filename: 'custom.pdf' };
      const result = await processFileInput(input);

      expect(result).toEqual({
        data: buffer,
        filename: 'custom.pdf',
      });
    });
  });

  describe('processFileInput - Uint8Array', () => {
    it('should process Uint8Array object', async () => {
      const uint8Array = createTestUint8Array('test content');
      const result = await processFileInput(uint8Array);

      expect(result).toEqual({
        data: uint8Array,
        filename: 'data.bin',
      });
    });

    it('should process structured uint8array input with custom filename', async () => {
      const uint8Array = createTestUint8Array('test content');
      const input = { type: 'uint8array' as const, data: uint8Array, filename: 'custom.bin' };
      const result = await processFileInput(input);

      expect(result).toEqual({
        data: uint8Array,
        filename: 'custom.bin',
      });
    });
  });

  describe('processFileInput - File Path', () => {
    it('should process file path', async () => {
      const mockStream = new Readable();

      const mockAccess = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined as never)
      const mockCreateReadStream  = jest.spyOn(fs, 'createReadStream').mockReturnValue(mockStream as fs.ReadStream);

      const result = await processFileInput('/path/to/test.pdf');

      expect(result).toEqual({
        data: mockStream,
        filename: 'test.pdf',
      });
      expect(mockAccess).toHaveBeenCalledWith('/path/to/test.pdf', 0);
      expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/test.pdf');
    });

    it('should throw error for non-existent file', async () => {
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found') as never);

      await expect(processFileInput('/path/to/nonexistent.pdf')).rejects.toThrow(ValidationError);
    });
  });

  describe('isRemoteFileInput', () => {
    const cases = [
      { name: 'URL string', input: 'https://example.com/test.pdf', expected: true },
      { name: 'File Path string', input: 'test.pdf', expected: false },
      { name: 'Buffer', input: Buffer.from('test'), expected: false },
      { name: 'Uint8Array', input:  Uint8Array.from('test'), expected: false },
      { name: 'URL Input', input: { type: 'url', url: 'https://example.com/test.pdf' }, expected: true },
      { name: 'File Path Input', input: { type: 'file-path', path: 'test.pdf' }, expected: false },
      { name: 'Buffer Input', input: { type: 'buffer', buffer: Buffer.from('test') }, expected: false },
      { name: 'Uint8Array Input', input: { type: 'uint8array', data: Uint8Array.from('test') }, expected: false },
    ]

    it.each(cases)('should return $expected for $name', (testCase) => {
      expect(isRemoteFileInput(testCase.input as FileInput)).toBe(testCase.expected);
    })
  })

  describe('processFileInput - Invalid inputs', () => {
    it('should throw for URL', async () => {
      await expect(processFileInput('https://example.com/test.pdf')).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput({ type: "url", url: 'https://example.com/test.pdf' } as any)).rejects.toThrow(ValidationError);
    });

    it('should throw for null or undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(null as any)).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw for unsupported types', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(123 as any)).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput({} as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('getPdfPageCount', () => {
    const cases = [
      { name: 'PDF with 1 page', input: TestDocumentGenerator.generateSimplePdf("Text"), expected: 1 },
      { name: 'PDF with 6 pages', input: samplePDF, expected: 6 },
    ]

    it.each(cases)('should return $expected for $name', async (testCase) => {
      await expect(getPdfPageCount(testCase.input)).resolves.toEqual(testCase.expected);
    })
  })
});