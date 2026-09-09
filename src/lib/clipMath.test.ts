import { describe, expect, it } from 'vitest';
import {
  EPS,
  isCourseRangeLongEnough,
  maxCueStartInRange,
  requiredResponseGap,
  resolveCourseEnd,
  sourceDurationForPlayback
} from './clipMath';

describe('clipMath', () => {
  it('treats the selected end as a course boundary', () => {
    expect(resolveCourseEnd(100, 10, null)).toBe(100);
    expect(resolveCourseEnd(100, 10, 80)).toBe(80);
    expect(resolveCourseEnd(100, 10, 4)).toBe(10);
    expect(resolveCourseEnd(100, 10, 140)).toBe(100);
  });

  it('derives the latest prompt start from the minimum required gap', () => {
    expect(maxCueStartInRange(0, 100, 10, 5)).toBe(75);
    expect(maxCueStartInRange(20, 80, 10, 5)).toBe(55);
    expect(maxCueStartInRange(20, 35, 10, 5)).toBe(20);
  });

  it('checks whether a selected course range can contain a complete trial', () => {
    expect(isCourseRangeLongEnough(0, 20, 10, 0)).toBe(true);
    expect(isCourseRangeLongEnough(0, 20, 10, EPS)).toBe(false);
    expect(isCourseRangeLongEnough(10, 30, 10, 1)).toBe(false);
    expect(isCourseRangeLongEnough(10, 31.1, 10, 1)).toBe(true);
  });

  it('keeps a zero setting strictly after the prompt in recall modes', () => {
    expect(requiredResponseGap(0)).toBe(EPS);
    expect(requiredResponseGap(2)).toBe(2);
    expect(requiredResponseGap(90)).toBe(60);
  });

  it('scales source-video span to preserve displayed duration through 14x', () => {
    expect(sourceDurationForPlayback(5, 0.5)).toBe(2.5);
    expect(sourceDurationForPlayback(5, 1)).toBe(5);
    expect(sourceDurationForPlayback(5, 4)).toBe(20);
    expect(sourceDurationForPlayback(5, 14)).toBe(70);
    expect(sourceDurationForPlayback(5, 20)).toBe(70);
  });
});
