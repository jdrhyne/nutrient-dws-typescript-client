/**
 * Converts a string from camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts a string from snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Type for objects that can be transformed
 */
type TransformableValue = string | number | boolean | null | undefined | TransformableObject | TransformableValue[];
type TransformableObject = { [key: string]: TransformableValue };

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 */
export function objectCamelToSnake<T extends TransformableObject>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return objectCamelToSnake(item as TransformableObject);
      }
      return item;
    });
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const transformed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    
    if (value === null || value === undefined) {
      transformed[snakeKey] = value;
    } else if (Array.isArray(value)) {
      transformed[snakeKey] = value.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return objectCamelToSnake(item as TransformableObject);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      transformed[snakeKey] = objectCamelToSnake(value as TransformableObject);
    } else {
      transformed[snakeKey] = value;
    }
  }

  return transformed;
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
export function objectSnakeToCamel<T extends TransformableObject>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return objectSnakeToCamel(item as TransformableObject);
      }
      return item;
    });
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const transformed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    
    if (value === null || value === undefined) {
      transformed[camelKey] = value;
    } else if (Array.isArray(value)) {
      transformed[camelKey] = value.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return objectSnakeToCamel(item as TransformableObject);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      transformed[camelKey] = objectSnakeToCamel(value as TransformableObject);
    } else {
      transformed[camelKey] = value;
    }
  }

  return transformed;
}