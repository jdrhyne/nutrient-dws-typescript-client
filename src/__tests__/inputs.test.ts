import { processFileInput, validateFileInput } from '../inputs';
import { ValidationError } from '../errors';
import { createTestBuffer, createTestUint8Array } from './test-utils';
import { Readable } from 'stream';

// Mock fs for file path tests
const mockCreateReadStream = jest.fn();
const mockAccess = jest.fn();

jest.mock('fs', () => ({
  promises: {
    access: mockAccess,
  },
  constants: {
    F_OK: 0,
  },
  createReadStream: mockCreateReadStream,
}));

// Mock path module
const mockBasename = jest.fn((path: string) => path.split('/').pop());
jest.mock('path', () => ({
  basename: mockBasename,
}));

// Mock fetch for URL tests
global.fetch = jest.fn();

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

      mockAccess.mockResolvedValue(undefined);
      mockCreateReadStream.mockReturnValue(mockStream);
      mockBasename.mockReturnValue('test.pdf');

      const result = await processFileInput('/path/to/test.pdf');

      expect(result).toEqual({
        data: mockStream,
        filename: 'test.pdf',
      });
      expect(mockAccess).toHaveBeenCalledWith('/path/to/test.pdf', 0);
      expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/test.pdf');
    });

    it('should throw error for non-existent file', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));

      await expect(processFileInput('/path/to/nonexistent.pdf')).rejects.toThrow(ValidationError);
    });
  });

  describe('processFileInput - URL', () => {
    it('should process URL input', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(10)),
        headers: {
          get: (header: string): string | null => header === 'content-type' ? 'application/pdf' : null,
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as unknown as Response);

      const result = await processFileInput('https://example.com/test.pdf');

      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('test.pdf');
      expect(result.contentType).toBe('application/pdf');
    });

    it('should handle URL without filename', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(10)),
        headers: {
          get: (): string | null => null,
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as unknown as Response);

      const result = await processFileInput('https://example.com/');

      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('download');
      expect(result.contentType).toBeUndefined();
    });

    it('should throw error for failed URL fetch', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as unknown as Response);

      await expect(processFileInput('https://example.com/nonexistent.pdf')).rejects.toThrow(ValidationError);
    });
  });

  describe('processFileInput - Invalid inputs', () => {
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
});