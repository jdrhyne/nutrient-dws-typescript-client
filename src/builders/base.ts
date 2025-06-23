import type { NutrientClientOptions } from '../types';
import { sendRequest } from '../http';

/**
 * Base builder class that all builders extend from.
 * Provides common functionality for API interaction.
 */
export abstract class BaseBuilder<TResult = unknown> {
  protected clientOptions: NutrientClientOptions;

  constructor(clientOptions: NutrientClientOptions) {
    this.clientOptions = clientOptions;
  }

  /**
   * Sends a request to the API
   */
  protected async sendRequest<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: unknown;
      files?: Map<string, unknown>;
      timeout?: number;
    } = {},
  ): Promise<T> {
    const config = {
      endpoint: path,
      method: options.method || 'POST',
      data: options.data,
      files: options.files,
      timeout: options.timeout,
    };
    
    const response = await sendRequest<T>(config, this.clientOptions);
    return response.data;
  }

  /**
   * Abstract method that child classes must implement for execution
   */
  abstract execute(): Promise<TResult>;
}