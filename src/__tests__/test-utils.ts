// Test setup and utilities

// Type for global with test properties
interface TestGlobal extends NodeJS.Global {
  window?: {
    document: object;
    navigator: { userAgent: string };
  };
  self?: {
    importScripts?: jest.Mock;
    postMessage?: jest.Mock;
  };
  document?: object;
  navigator?: { userAgent: string };
  WorkerGlobalScope?: object;
}

const testGlobal = global as TestGlobal;

// Mock browser globals for environment detection tests
export function setupBrowserEnvironment(): void {
  testGlobal.window = {
    document: {},
    navigator: { userAgent: 'TestBrowser/1.0' },
  };
  testGlobal.self = testGlobal.window as TestGlobal['self'];
  testGlobal.document = testGlobal.window.document;
  testGlobal.navigator = testGlobal.window.navigator;
}

export function setupWebWorkerEnvironment(): void {
  delete testGlobal.window;
  delete testGlobal.document;
  testGlobal.self = {
    importScripts: jest.fn(),
    postMessage: jest.fn(),
  };
  testGlobal.WorkerGlobalScope = {};
}

export function setupNodeEnvironment(): void {
  delete testGlobal.window;
  delete testGlobal.document;
  delete testGlobal.self;
  delete testGlobal.WorkerGlobalScope;
}

export function resetEnvironment(): void {
  setupNodeEnvironment();
}

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

// Mock File class for Node.js tests
export class MockFile {
  public name: string;
  public type: string;
  public size: number;
  private content: Buffer;

  constructor(content: Buffer | string, name: string, options?: { type?: string }) {
    this.content = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.name = name;
    this.type = options?.type ?? 'application/octet-stream';
    this.size = this.content.length;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(this.content.buffer);
  }

  text(): Promise<string> {
    return Promise.resolve(this.content.toString());
  }
}

// Mock Blob class for Node.js tests
export class MockBlob {
  public type: string;
  public size: number;
  private content: Buffer;

  constructor(parts: Array<string | Buffer | Uint8Array>, options?: { type?: string }) {
    this.type = options?.type ?? '';
    this.content = Buffer.concat(
      parts.map((part) => {
        if (typeof part === 'string') return Buffer.from(part);
        if (Buffer.isBuffer(part)) return part;
        if (part instanceof Uint8Array) return Buffer.from(part);
        return Buffer.from('');
      }),
    );
    this.size = this.content.length;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(this.content.buffer);
  }

  text(): Promise<string> {
    return Promise.resolve(this.content.toString());
  }
}

// Create test file data
export function createTestFile(filename: string, content: string = 'test content'): MockFile {
  return new MockFile(content, filename, { type: 'text/plain' });
}

export function createTestBlob(content: string = 'test content', type?: string): MockBlob {
  return new MockBlob([content], { type });
}

export function createTestBuffer(content: string = 'test content'): Buffer {
  return Buffer.from(content);
}

export function createTestUint8Array(content: string = 'test content'): Uint8Array {
  return new TextEncoder().encode(content);
}
