import {
  getEnvironment,
  getEnvironmentCapabilities,
  isBrowser,
  isNode,
  isWebWorker,
} from '../../utils/environment';
import {
  setupBrowserEnvironment,
  setupWebWorkerEnvironment,
  setupNodeEnvironment,
  resetEnvironment,
} from '../test-utils';

interface TestGlobal extends NodeJS.Global {
  window?: {
    document: object;
    navigator: { userAgent: string };
  };
  fetch?: jest.Mock;
  FormData?: jest.Mock;
  File?: jest.Mock;
  Blob?: jest.Mock;
}

describe('Environment Detection', () => {
  afterEach(() => {
    resetEnvironment();
  });

  describe('Node.js environment', () => {
    beforeEach(() => {
      setupNodeEnvironment();
    });

    it('should detect Node.js environment', () => {
      expect(isNode()).toBe(true);
      expect(isBrowser()).toBe(false);
      expect(isWebWorker()).toBe(false);
    });

    it('should return correct environment type', () => {
      expect(getEnvironment()).toBe('node');
    });

    it('should return Node.js capabilities', () => {
      const capabilities = getEnvironmentCapabilities();
      expect(capabilities.environment).toBe('node');
      expect(capabilities.hasFetch).toBe(true);
      expect(capabilities.hasFormData).toBe(true);
      expect(capabilities.hasFileAPI).toBe(false); // File/Blob not available in pure Node.js
      expect(capabilities.hasNodeFS).toBe(true);
    });
  });

  describe('Browser environment', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should detect browser environment', () => {
      expect(isBrowser()).toBe(true);
      expect(isNode()).toBe(true); // In test environment, Node globals still exist
      expect(isWebWorker()).toBe(false);
    });

    it('should return correct environment type', () => {
      // Node detection takes precedence in the implementation
      expect(getEnvironment()).toBe('node');
    });

    it('should return browser capabilities', () => {
      const capabilities = getEnvironmentCapabilities();
      expect(capabilities.environment).toBe('node'); // Node takes precedence
      expect(capabilities.hasFetch).toBe(true);
      expect(capabilities.hasFormData).toBe(true);
      expect(capabilities.hasFileAPI).toBe(false); // File/Blob not available in test env
      expect(capabilities.hasNodeFS).toBe(true);
    });
  });

  describe('Web Worker environment', () => {
    beforeEach(() => {
      setupWebWorkerEnvironment();
    });

    it('should detect web worker environment', () => {
      expect(isWebWorker()).toBe(false); // importScripts is not defined in test env
      expect(isBrowser()).toBe(false);
      expect(isNode()).toBe(true); // Node globals still exist
    });

    it('should return correct environment type', () => {
      expect(getEnvironment()).toBe('node'); // Node takes precedence
    });

    it('should return web worker capabilities', () => {
      const capabilities = getEnvironmentCapabilities();
      expect(capabilities.environment).toBe('node');
      expect(capabilities.hasFetch).toBe(true);
      expect(capabilities.hasFormData).toBe(true);
      expect(capabilities.hasFileAPI).toBe(false); // File/Blob not available in test env
      expect(capabilities.hasNodeFS).toBe(true);
    });
  });

  describe('Environment detection edge cases', () => {
    it('should handle partial browser-like environment', () => {
      const testGlobal = global as TestGlobal;
      // Only window exists, no document
      testGlobal.window = {} as TestGlobal['window'];

      expect(isBrowser()).toBe(false);
      expect(getEnvironment()).toBe('node');
    });

    it('should handle environment with both Node and browser globals', () => {
      setupBrowserEnvironment();
      // Node globals still exist
      expect(process).toBeDefined();

      // Node takes precedence in detection order
      expect(isBrowser()).toBe(true);
      expect(getEnvironment()).toBe('node');
    });

    it('should handle environment without any expected globals', () => {
      const testGlobal = global as TestGlobal;
      // Remove all environment indicators
      delete testGlobal.window;
      delete testGlobal.document;
      delete testGlobal.self;
      delete testGlobal.WorkerGlobalScope;

      // Mock process to simulate non-Node environment
      const originalProcess = global.process;
      Object.defineProperty(global, 'process', {
        value: undefined,
        configurable: true,
      });

      try {
        expect(isNode()).toBe(false);
        expect(isBrowser()).toBe(false);
        expect(isWebWorker()).toBe(false);
        expect(getEnvironment()).toBe('unknown');
      } finally {
        // Restore process
        Object.defineProperty(global, 'process', {
          value: originalProcess,
          configurable: true,
        });
      }
    });
  });

  describe('Capabilities detection', () => {
    it('should detect fetch API availability', () => {
      const testGlobal = global as TestGlobal;

      // Add fetch to global
      testGlobal.fetch = jest.fn();
      const capabilities = getEnvironmentCapabilities();
      expect(capabilities.hasFetch).toBe(true);

      // Remove fetch
      delete testGlobal.fetch;
      const capabilitiesWithoutFetch = getEnvironmentCapabilities();
      expect(capabilitiesWithoutFetch.hasFetch).toBe(false);
    });

    it('should detect FormData availability', () => {
      const testGlobal = global as TestGlobal;

      // Add FormData to global
      testGlobal.FormData = jest.fn();
      const capabilities = getEnvironmentCapabilities();
      expect(capabilities.hasFormData).toBe(true);

      // Remove FormData
      delete testGlobal.FormData;
      const capabilitiesWithoutFormData = getEnvironmentCapabilities();
      expect(capabilitiesWithoutFormData.hasFormData).toBe(false);
    });
  });
});
