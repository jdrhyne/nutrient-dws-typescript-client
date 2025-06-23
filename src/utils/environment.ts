/**
 * Environment detection utilities for isomorphic operation
 */

/**
 * Detects if running in a browser environment
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.navigator !== 'undefined'
  );
}

/**
 * Detects if running in a Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null;
}

/**
 * Detects if running in a Web Worker environment
 */
export function isWebWorker(): boolean {
  return (
    typeof self !== 'undefined' &&
    typeof (globalThis as unknown as { importScripts?: unknown }).importScripts === 'function' &&
    typeof (globalThis as unknown as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !==
      'undefined'
  );
}

/**
 * Gets the current environment type
 */
export type Environment = 'browser' | 'node' | 'webworker' | 'unknown';

export function getEnvironment(): Environment {
  if (isNode()) {
    return 'node';
  }
  if (isWebWorker()) {
    return 'webworker';
  }
  if (isBrowser()) {
    return 'browser';
  }
  return 'unknown';
}

/**
 * Checks if Fetch API is available
 */
export function hasFetch(): boolean {
  return typeof fetch !== 'undefined';
}

/**
 * Checks if FormData is available
 */
export function hasFormData(): boolean {
  return typeof FormData !== 'undefined';
}

/**
 * Checks if File API is available
 */
export function hasFileAPI(): boolean {
  return typeof File !== 'undefined' && typeof Blob !== 'undefined';
}

/**
 * Checks if Node.js fs module is available
 */
export function hasNodeFS(): boolean {
  try {
    return isNode() && typeof require !== 'undefined' && !!require('fs');
  } catch {
    return false;
  }
}

/**
 * Environment capabilities detection
 */
export interface EnvironmentCapabilities {
  environment: Environment;
  hasFetch: boolean;
  hasFormData: boolean;
  hasFileAPI: boolean;
  hasNodeFS: boolean;
}

/**
 * Gets comprehensive environment capabilities
 */
export function getEnvironmentCapabilities(): EnvironmentCapabilities {
  return {
    environment: getEnvironment(),
    hasFetch: hasFetch(),
    hasFormData: hasFormData(),
    hasFileAPI: hasFileAPI(),
    hasNodeFS: hasNodeFS(),
  };
}
