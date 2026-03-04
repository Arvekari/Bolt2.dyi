import { describe, expect, it } from 'vitest';
import { isAllowedUrl, isValidUrl } from '~/utils/url';

describe('url utils', () => {
  describe('isValidUrl', () => {
    it('accepts http and https URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
    });

    it('rejects invalid and unsupported protocols', () => {
      expect(isValidUrl('notaurl')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('isAllowedUrl', () => {
    it('allows public http/https hosts', () => {
      expect(isAllowedUrl('https://example.com')).toBe(true);
      expect(isAllowedUrl('http://8.8.8.8')).toBe(true);
    });

    it('blocks localhost and private IP ranges', () => {
      expect(isAllowedUrl('http://localhost:3000')).toBe(false);
      expect(isAllowedUrl('http://127.0.0.1')).toBe(false);
      expect(isAllowedUrl('http://10.1.2.3')).toBe(false);
      expect(isAllowedUrl('http://172.16.0.1')).toBe(false);
      expect(isAllowedUrl('http://192.168.1.8')).toBe(false);
      expect(isAllowedUrl('http://169.254.10.10')).toBe(false);
      expect(isAllowedUrl('http://0.0.0.0')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isAllowedUrl('not-a-url')).toBe(false);
    });
  });
});
