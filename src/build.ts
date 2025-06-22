import type { components } from './types/nutrient-api';
import type { FileInput } from './types';

/**
 * Factory functions for creating common build actions
 */
export const BuildActions = {
  /**
   * Create an OCR action
   * @param language - Language(s) for OCR
   */
  ocr(
    language: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][],
  ): components['schemas']['OcrAction'] {
    return {
      type: 'ocr',
      language,
    };
  },

  /**
   * Create a rotation action
   * @param rotateBy - Rotation angle (90, 180, or 270)
   */
  rotate(rotateBy: 90 | 180 | 270): components['schemas']['RotateAction'] {
    return {
      type: 'rotate',
      rotateBy,
    };
  },

  /**
   * Create a text watermark action
   * @param text - Watermark text
   * @param options - Watermark options
   */
  watermarkText(
    text: string,
    options: {
      width: components['schemas']['WatermarkDimension'];
      height: components['schemas']['WatermarkDimension'];
      opacity?: number;
      rotation?: number;
      fontSize?: number;
      fontColor?: string;
      fontFamily?: string;
      fontStyle?: ('bold' | 'italic')[];
      top?: components['schemas']['WatermarkDimension'];
      left?: components['schemas']['WatermarkDimension'];
      right?: components['schemas']['WatermarkDimension'];
      bottom?: components['schemas']['WatermarkDimension'];
    },
  ): components['schemas']['TextWatermarkAction'] {
    const action: components['schemas']['TextWatermarkAction'] = {
      type: 'watermark',
      text,
      width: {} as Record<string, never> & typeof options.width,
      height: {} as Record<string, never> & typeof options.height,
      ...(options.opacity !== undefined && { opacity: options.opacity }),
      ...(options.rotation !== undefined && { rotation: options.rotation }),
      ...(options.fontSize !== undefined && { fontSize: options.fontSize }),
      ...(options.fontColor && { fontColor: options.fontColor }),
      ...(options.fontFamily && { fontFamily: options.fontFamily }),
      ...(options.fontStyle && { fontStyle: options.fontStyle }),
      ...(options.top && { top: {} as Record<string, never> & typeof options.top }),
      ...(options.left && { left: {} as Record<string, never> & typeof options.left }),
      ...(options.right && { right: {} as Record<string, never> & typeof options.right }),
      ...(options.bottom && { bottom: {} as Record<string, never> & typeof options.bottom }),
    };
    // Override with proper values
    (action.width as components['schemas']['WatermarkDimension']) = options.width;
    (action.height as components['schemas']['WatermarkDimension']) = options.height;
    if (options.top) (action.top as components['schemas']['WatermarkDimension']) = options.top;
    if (options.left) (action.left as components['schemas']['WatermarkDimension']) = options.left;
    if (options.right)
      (action.right as components['schemas']['WatermarkDimension']) = options.right;
    if (options.bottom)
      (action.bottom as components['schemas']['WatermarkDimension']) = options.bottom;
    return action;
  },

  /**
   * Create an image watermark action
   * @param image - Watermark image
   * @param options - Watermark options
   */
  watermarkImage(
    image: FileInput,
    options: {
      width: components['schemas']['WatermarkDimension'];
      height: components['schemas']['WatermarkDimension'];
      opacity?: number;
      rotation?: number;
      top?: components['schemas']['WatermarkDimension'];
      left?: components['schemas']['WatermarkDimension'];
      right?: components['schemas']['WatermarkDimension'];
      bottom?: components['schemas']['WatermarkDimension'];
    },
  ): components['schemas']['ImageWatermarkAction'] {
    const action: components['schemas']['ImageWatermarkAction'] = {
      type: 'watermark',
      image: image as components['schemas']['FileHandle'],
      width: {} as Record<string, never> & typeof options.width,
      height: {} as Record<string, never> & typeof options.height,
      ...(options.opacity !== undefined && { opacity: options.opacity }),
      ...(options.rotation !== undefined && { rotation: options.rotation }),
      ...(options.top && { top: {} as Record<string, never> & typeof options.top }),
      ...(options.left && { left: {} as Record<string, never> & typeof options.left }),
      ...(options.right && { right: {} as Record<string, never> & typeof options.right }),
      ...(options.bottom && { bottom: {} as Record<string, never> & typeof options.bottom }),
    };
    // Override with proper values
    (action.width as components['schemas']['WatermarkDimension']) = options.width;
    (action.height as components['schemas']['WatermarkDimension']) = options.height;
    if (options.top) (action.top as components['schemas']['WatermarkDimension']) = options.top;
    if (options.left) (action.left as components['schemas']['WatermarkDimension']) = options.left;
    if (options.right)
      (action.right as components['schemas']['WatermarkDimension']) = options.right;
    if (options.bottom)
      (action.bottom as components['schemas']['WatermarkDimension']) = options.bottom;
    return action;
  },

  /**
   * Create a flatten action
   * @param annotationIds - Optional annotation IDs to flatten (all if not specified)
   */
  flatten(annotationIds?: (string | number)[]): components['schemas']['FlattenAction'] {
    return {
      type: 'flatten',
      ...(annotationIds && { annotationIds }),
    };
  },

  /**
   * Create an apply Instant JSON action
   * @param file - Instant JSON file
   */
  applyInstantJson(file: FileInput): components['schemas']['ApplyInstantJsonAction'] {
    return {
      type: 'applyInstantJson',
      file: file as never, // Will be processed by sendRequest
    };
  },

  /**
   * Create an apply XFDF action
   * @param file - XFDF file
   */
  applyXfdf(file: FileInput): components['schemas']['ApplyXfdfAction'] {
    return {
      type: 'applyXfdf',
      file: file as never, // Will be processed by sendRequest
    };
  },

  /**
   * Create redactions with text search
   * @param text - Text to search and redact
   * @param options - Redaction options
   */
  createRedactionsText(
    text: string,
    options?: {
      caseSensitive?: boolean;
      includeAnnotations?: boolean;
      start?: number;
      limit?: number;
      content?: Partial<components['schemas']['RedactionAnnotation']>;
    },
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'text',
      strategyOptions: {
        text,
        caseSensitive: options?.caseSensitive,
        includeAnnotations: options?.includeAnnotations,
        start: options?.start,
        limit: options?.limit,
      },
      ...(options?.content && { content: options.content }),
    } as components['schemas']['CreateRedactionsAction'];
  },

  /**
   * Create redactions with regex pattern
   * @param regex - Regex pattern to search and redact
   * @param options - Redaction options
   */
  createRedactionsRegex(
    regex: string,
    options?: {
      caseSensitive?: boolean;
      includeAnnotations?: boolean;
      start?: number;
      limit?: number;
      content?: Partial<components['schemas']['RedactionAnnotation']>;
    },
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'regex',
      strategyOptions: {
        regex,
        caseSensitive: options?.caseSensitive,
        includeAnnotations: options?.includeAnnotations,
        start: options?.start,
        limit: options?.limit,
      },
      ...(options?.content && { content: options.content }),
    } as components['schemas']['CreateRedactionsAction'];
  },

  /**
   * Create redactions with preset pattern
   * @param preset - Preset pattern to search and redact
   * @param options - Redaction options
   */
  createRedactionsPreset(
    preset: components['schemas']['SearchPreset'],
    options?: {
      includeAnnotations?: boolean;
      start?: number;
      limit?: number;
      content?: Partial<components['schemas']['RedactionAnnotation']>;
    },
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'preset',
      strategyOptions: {
        preset,
        includeAnnotations: options?.includeAnnotations,
        start: options?.start,
        limit: options?.limit,
      },
      ...(options?.content && { content: options.content }),
    } as components['schemas']['CreateRedactionsAction'];
  },

  /**
   * Apply previously created redactions
   */
  applyRedactions(): components['schemas']['ApplyRedactionsAction'] {
    return {
      type: 'applyRedactions',
    };
  },
};

/**
 * Factory functions for creating output configurations
 */
export const BuildOutputs = {
  /**
   * PDF output configuration
   * @param options - PDF output options
   */
  pdf(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): components['schemas']['PDFOutput'] {
    return {
      type: 'pdf',
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.labels && { labels: options.labels }),
      ...(options?.userPassword && { user_password: options.userPassword }),
      ...(options?.ownerPassword && { owner_password: options.ownerPassword }),
      ...(options?.userPermissions && { user_permissions: options.userPermissions }),
      ...(options?.optimize && { optimize: options.optimize }),
    };
  },

  /**
   * PDF/A output configuration
   * @param options - PDF/A output options
   */
  pdfa(options?: {
    conformance?: components['schemas']['PDFAOutput']['conformance'];
    vectorization?: boolean;
    rasterization?: boolean;
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): components['schemas']['PDFAOutput'] {
    return {
      type: 'pdfa',
      ...(options?.conformance && { conformance: options.conformance }),
      ...(options?.vectorization !== undefined && { vectorization: options.vectorization }),
      ...(options?.rasterization !== undefined && { rasterization: options.rasterization }),
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.labels && { labels: options.labels }),
      ...(options?.userPassword && { user_password: options.userPassword }),
      ...(options?.ownerPassword && { owner_password: options.ownerPassword }),
      ...(options?.userPermissions && { user_permissions: options.userPermissions }),
      ...(options?.optimize && { optimize: options.optimize }),
    };
  },

  /**
   * Image output configuration
   * @param options - Image output options
   */
  image(options?: {
    format?: 'png' | 'jpeg' | 'jpg' | 'webp';
    pages?: components['schemas']['PageRange'];
    width?: number;
    height?: number;
    dpi?: number;
  }): components['schemas']['ImageOutput'] {
    return {
      type: 'image',
      ...(options?.format && { format: options.format }),
      ...(options?.pages && { pages: options.pages }),
      ...(options?.width && { width: options.width }),
      ...(options?.height && { height: options.height }),
      ...(options?.dpi && { dpi: options.dpi }),
    };
  },

  /**
   * JSON content output configuration
   * @param options - JSON content extraction options
   */
  jsonContent(options?: {
    plainText?: boolean;
    structuredText?: boolean;
    keyValuePairs?: boolean;
    tables?: boolean;
    language?: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][];
  }): components['schemas']['JSONContentOutput'] {
    return {
      type: 'json-content',
      ...(options?.plainText !== undefined && { plainText: options.plainText }),
      ...(options?.structuredText !== undefined && { structuredText: options.structuredText }),
      ...(options?.keyValuePairs !== undefined && { keyValuePairs: options.keyValuePairs }),
      ...(options?.tables !== undefined && { tables: options.tables }),
      ...(options?.language && { language: options.language }),
    };
  },

  /**
   * Office document output configuration
   * @param type - Office document type
   */
  office(type: 'docx' | 'xlsx' | 'pptx'): components['schemas']['OfficeOutput'] {
    return {
      type,
    };
  },
};
