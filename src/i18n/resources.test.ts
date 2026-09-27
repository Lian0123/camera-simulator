import { describe, expect, it } from 'vitest';
import { resources } from './resources';

describe('interface translations', () => {
  it('keeps Traditional Chinese, English, and Japanese keys in sync', () => {
    expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.zh).sort());
    expect(Object.keys(resources.ja).sort()).toEqual(Object.keys(resources.zh).sort());
    for (const language of Object.values(resources)) {
      expect(Object.values(language).every((value) => value.trim().length > 0)).toBe(true);
    }
  });
});
