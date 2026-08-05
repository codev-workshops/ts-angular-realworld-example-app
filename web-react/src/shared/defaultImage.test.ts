import { describe, expect, it } from 'vitest';
import { defaultImage } from './defaultImage';

const DEFAULT = '/assets/images/default-avatar.svg';

describe('defaultImage', () => {
  it('returns the image when one is provided', () => {
    expect(defaultImage('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('falls back to the default avatar for null, undefined and empty string', () => {
    expect(defaultImage(null)).toBe(DEFAULT);
    expect(defaultImage(undefined)).toBe(DEFAULT);
    expect(defaultImage('')).toBe(DEFAULT);
  });
});
