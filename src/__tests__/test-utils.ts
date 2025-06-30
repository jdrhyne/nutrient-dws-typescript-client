// Test setup and utilities for Node.js only

// Mock FormData for Node.js tests
interface FormDataEntry {
  value: unknown;
  options?: unknown;
}

export class MockFormData {
  private data: Map<string, FormDataEntry> = new Map();

  append(key: string, value: unknown, options?: unknown): void {
    this.data.set(key, { value, options });
  }

  get(key: string): FormDataEntry | undefined {
    return this.data.get(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  getHeaders(): Record<string, string> {
    return {
      'content-type': 'multipart/form-data; boundary=----MockBoundary',
    };
  }

  // For test assertions
  getData(): Map<string, FormDataEntry> {
    return this.data;
  }
}

// Create test file data
export function createTestBuffer(content: string = 'test content'): Buffer {
  return Buffer.from(content);
}

export function createTestUint8Array(content: string = 'test content'): Uint8Array {
  return new TextEncoder().encode(content);
}