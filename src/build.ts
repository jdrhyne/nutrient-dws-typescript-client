import type { components } from './generated/api-types';
import type { FileInput } from './types';

const DEFAULT_DIMENSION = { value: 100, unit: '%' as const }

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
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {
      width: DEFAULT_DIMENSION,
      height: DEFAULT_DIMENSION,
      rotation: 0
    },
  ): components['schemas']['TextWatermarkAction'] {
    return {
      type: 'watermark',
      text,
      ...options,
      rotation: options.rotation ?? 0,
      width: options.width ?? DEFAULT_DIMENSION,
      height: options.height ?? DEFAULT_DIMENSION,
    };
  },

  /**
   * Create an image watermark action
   * @param image - Watermark image
   * @param options - Watermark options
   */
  watermarkImage(
    image: FileInput,
    options: Partial<Omit<components['schemas']['ImageWatermarkAction'], 'type' | 'image'>> = {
      width: DEFAULT_DIMENSION,
      height: DEFAULT_DIMENSION,
      rotation: 0,
    },
  ): components['schemas']['ImageWatermarkAction'] {
    return {
      type: 'watermark',
      image: image as components['schemas']['FileHandle'],
      ...options,
      rotation: options.rotation ?? 0,
      width: options.width ?? DEFAULT_DIMENSION,
      height: options.height ?? DEFAULT_DIMENSION,
    };
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
      file: file as components['schemas']['FileHandle'],
    };
  },

  /**
   * Create an apply XFDF action
   * @param file - XFDF file
   */
  applyXfdf(file: FileInput): components['schemas']['ApplyXfdfAction'] {
    return {
      type: 'applyXfdf',
      file: file as components['schemas']['FileHandle'],
    };
  },

  /**
   * Create redactions with text search
   * @param text - Text to search and redact
   * @param options - Redaction options
   */
  createRedactionsText(
    text: string,
    options?: Omit<components['schemas']['CreateRedactionsStrategyOptionsText'], 'text'>,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'text',
      strategyOptions: {
        text,
        ...options,
      },
    };
  },

  /**
   * Create redactions with regex pattern
   * @param regex - Regex pattern to search and redact
   * @param options - Redaction options
   */
  createRedactionsRegex(
    regex: string,
    options?: Omit<components['schemas']['CreateRedactionsStrategyOptionsRegex'], 'regex'>,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'regex',
      strategyOptions: {
        regex,
        ...options
      },
    };
  },

  /**
   * Create redactions with preset pattern
   * @param preset - Preset pattern to search and redact
   * @param options - Redaction options
   */
  createRedactionsPreset(
    preset: components['schemas']['SearchPreset'],
    options?: Omit<components['schemas']['CreateRedactionsStrategyOptionsPreset'], 'preset'>,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'preset',
      strategyOptions: {
        preset,
        ...options,
      },
    };
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
