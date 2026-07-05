import { describe, expect, it } from 'vitest';
import { clampT1, clip, clipsOverlap, isVideoLongEnough } from './clipMath';

describe('clipMath', () => {
  it('clamps t1 so cue and answer fit', () => {
    expect(clampT1(10, 1, 0, null)).toBeCloseTo(7.967, 3);
    expect(clampT1(10, 1, 2, 9)).toBeCloseTo(7.967, 3);
    expect(clampT1(10, 1, 0, null, 1)).toBeCloseTo(6.967, 3);
    expect(clampT1(10, 1, 2, 1)).toBe(2);
  });

  it('checks minimum playable quiz duration', () => {
    expect(isVideoLongEnough(1, 0.5)).toBe(false);
    expect(isVideoLongEnough(1.1, 0.5)).toBe(true);
    expect(isVideoLongEnough(2.5, 1, 1)).toBe(false);
    expect(isVideoLongEnough(3.1, 1, 1)).toBe(true);
  });

  it('detects clip overlap with guard intervals', () => {
    expect(clipsOverlap(clip(0, 1), clip(1.2, 1), 0.1)).toBe(false);
    expect(clipsOverlap(clip(0, 1), clip(1.05, 1), 0.1)).toBe(true);
  });
});
