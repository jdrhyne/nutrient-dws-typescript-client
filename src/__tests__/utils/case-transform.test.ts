import {
  camelToSnake,
  snakeToCamel,
  objectCamelToSnake,
  objectSnakeToCamel,
} from '../../utils/case-transform';

describe('Case Transformation Utilities', () => {
  describe('camelToSnake', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
      expect(camelToSnake('somePropertyName')).toBe('some_property_name');
      // Note: Leading capitals get prefixed with underscore
      expect(camelToSnake('APIKey')).toBe('_a_p_i_key');
      expect(camelToSnake('HTTPSConnection')).toBe('_h_t_t_p_s_connection');
    });

    it('should handle single words', () => {
      expect(camelToSnake('word')).toBe('word');
      expect(camelToSnake('WORD')).toBe('_w_o_r_d'); // Each capital letter gets underscore
    });

    it('should handle empty strings', () => {
      expect(camelToSnake('')).toBe('');
    });

    it('should handle strings that are already snake_case', () => {
      expect(camelToSnake('already_snake_case')).toBe('already_snake_case');
    });

    it('should handle numbers in strings', () => {
      expect(camelToSnake('property123')).toBe('property123');
      expect(camelToSnake('property123Name')).toBe('property123_name');
      expect(camelToSnake('123property')).toBe('123property');
    });

    it('should handle consecutive capital letters', () => {
      expect(camelToSnake('XMLHttpRequest')).toBe('_x_m_l_http_request');
      expect(camelToSnake('IOError')).toBe('_i_o_error');
    });
  });

  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamel('snake_case')).toBe('snakeCase');
      expect(snakeToCamel('some_property_name')).toBe('somePropertyName');
      expect(snakeToCamel('api_key')).toBe('apiKey');
      expect(snakeToCamel('https_connection')).toBe('httpsConnection');
    });

    it('should handle single words', () => {
      expect(snakeToCamel('word')).toBe('word');
      expect(snakeToCamel('WORD')).toBe('WORD'); // No underscores, stays as is
    });

    it('should handle empty strings', () => {
      expect(snakeToCamel('')).toBe('');
    });

    it('should handle strings that are already camelCase', () => {
      expect(snakeToCamel('alreadyCamelCase')).toBe('alreadyCamelCase');
    });

    it('should handle numbers in strings', () => {
      // Note: The regex only matches lowercase letters after underscore
      expect(snakeToCamel('property_123')).toBe('property_123');
      expect(snakeToCamel('property_123_name')).toBe('property_123Name');
      expect(snakeToCamel('123_property')).toBe('123Property');
    });

    it('should handle leading underscores', () => {
      // Note: Leading underscore + lowercase letter gets capitalized
      expect(snakeToCamel('_private_property')).toBe('PrivateProperty');
      expect(snakeToCamel('__double_underscore')).toBe('_DoubleUnderscore');
    });

    it('should handle trailing underscores', () => {
      expect(snakeToCamel('property_')).toBe('property_');
      expect(snakeToCamel('property__')).toBe('property__');
    });

    it('should handle multiple consecutive underscores', () => {
      expect(snakeToCamel('property__name')).toBe('property_Name');
      expect(snakeToCamel('property___name')).toBe('property__Name');
    });
  });

  describe('objectCamelToSnake', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
      };

      const expected = {
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com',
      };

      expect(objectCamelToSnake(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        userProfile: {
          firstName: 'John',
          contactInfo: {
            emailAddress: 'john@example.com',
            phoneNumber: '123-456-7890',
          },
        },
      };

      const expected = {
        user_profile: {
          first_name: 'John',
          contact_info: {
            email_address: 'john@example.com',
            phone_number: '123-456-7890',
          },
        },
      };

      expect(objectCamelToSnake(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
      const input = {
        userNames: ['John', 'Jane'],
        userProfiles: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      };

      const expected = {
        user_names: ['John', 'Jane'],
        user_profiles: [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ],
      };

      expect(objectCamelToSnake(input)).toEqual(expected);
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      };

      const expected = {
        null_value: null,
        undefined_value: undefined,
        valid_value: 'test',
      };

      expect(objectCamelToSnake(input)).toEqual(expected);
    });

    it('should handle special types', () => {
      const date = new Date('2024-01-01');
      const input = {
        createdAt: date,
        isActive: true,
        itemCount: 42,
      };

      const result = objectCamelToSnake(input) as Record<string, unknown>;

      // Date objects are converted to plain objects due to recursion
      expect(result.created_at).toEqual({});
      expect(result.is_active).toBe(true);
      expect(result.item_count).toBe(42);
    });

    it('should handle empty objects', () => {
      expect(objectCamelToSnake({})).toEqual({});
    });

    it('should handle non-object inputs', () => {
      expect(objectCamelToSnake('string')).toBe('string');
      expect(objectCamelToSnake(123)).toBe(123);
      expect(objectCamelToSnake(true)).toBe(true);
      expect(objectCamelToSnake(null)).toBe(null);
      expect(objectCamelToSnake(undefined)).toBe(undefined);
    });
  });

  describe('objectSnakeToCamel', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = {
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com',
      };

      const expected = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
      };

      expect(objectSnakeToCamel(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        user_profile: {
          first_name: 'John',
          contact_info: {
            email_address: 'john@example.com',
            phone_number: '123-456-7890',
          },
        },
      };

      const expected = {
        userProfile: {
          firstName: 'John',
          contactInfo: {
            emailAddress: 'john@example.com',
            phoneNumber: '123-456-7890',
          },
        },
      };

      expect(objectSnakeToCamel(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
      const input = {
        user_names: ['John', 'Jane'],
        user_profiles: [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ],
      };

      const expected = {
        userNames: ['John', 'Jane'],
        userProfiles: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      };

      expect(objectSnakeToCamel(input)).toEqual(expected);
    });

    it('should handle null and undefined values', () => {
      const input = {
        null_value: null,
        undefined_value: undefined,
        valid_value: 'test',
      };

      const expected = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      };

      expect(objectSnakeToCamel(input)).toEqual(expected);
    });

    it('should handle special types', () => {
      const date = new Date('2024-01-01');
      const input = {
        created_at: date,
        is_active: true,
        item_count: 42,
      };

      const result = objectSnakeToCamel(input) as Record<string, unknown>;

      // Date objects are converted to plain objects due to recursion
      expect(result.createdAt).toEqual({});
      expect(result.isActive).toBe(true);
      expect(result.itemCount).toBe(42);
    });

    it('should handle empty objects', () => {
      expect(objectSnakeToCamel({})).toEqual({});
    });

    it('should handle non-object inputs', () => {
      expect(objectSnakeToCamel('string')).toBe('string');
      expect(objectSnakeToCamel(123)).toBe(123);
      expect(objectSnakeToCamel(true)).toBe(true);
      expect(objectSnakeToCamel(null)).toBe(null);
      expect(objectSnakeToCamel(undefined)).toBe(undefined);
    });
  });

  describe('Round-trip transformations', () => {
    it('should handle camelCase to snake_case and back', () => {
      const testCases = [
        { original: 'simpleProperty', expected: 'simpleProperty' },
        { original: 'complexPropertyName', expected: 'complexPropertyName' },
        // Leading capitals don't round-trip perfectly
        { original: 'APIKeyValue', expected: 'APIKeyValue' },
        { original: 'HTTPSConnectionURL', expected: 'HTTPSConnectionURL' },
        { original: 'property123Name', expected: 'property123Name' },
      ];

      testCases.forEach(({ original, expected }) => {
        const snake = camelToSnake(original);
        const backToCamel = snakeToCamel(snake);
        expect(backToCamel).toBe(expected);
      });
    });

    it('should handle object transformation round-trip', () => {
      const original = {
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          contactDetails: {
            emailAddress: 'john@example.com',
            phoneNumbers: ['123-456-7890', '098-765-4321'],
          },
          isActive: true,
          accountBalance: 1234.56,
        },
      };

      const toSnake = objectCamelToSnake(original) as Record<string, unknown>;
      const backToCamel = objectSnakeToCamel(toSnake) as typeof original;

      // Check structure is preserved (though type casting is needed)
      expect(backToCamel.userProfile.firstName).toBe('John');
      expect(backToCamel.userProfile.lastName).toBe('Doe');
      expect(backToCamel.userProfile.contactDetails.emailAddress).toBe('john@example.com');
      expect(backToCamel.userProfile.contactDetails.phoneNumbers).toEqual([
        '123-456-7890',
        '098-765-4321',
      ]);
      expect(backToCamel.userProfile.isActive).toBe(true);
      expect(backToCamel.userProfile.accountBalance).toBe(1234.56);
    });
  });
});
