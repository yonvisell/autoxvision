import type { Clip } from '../types';

export const EPS = 1 / 30;

export function roundTime(value: number, places = 3): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function maxCueStart(duration: number, T: number, t0 = 0): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return t0;
  }
  return Math.max(t0, duration - 2 * T - EPS);
}

export function clampT1(
  duration: number,
  T: number,
  t0: number,
  userT1: number | null | undefined
): number {
  const upper = maxCueStart(duration, T, t0);
  if (userT1 === null || userT1 === undefined || !Number.isFinite(userT1)) {
    return upper;
  }
  return clamp(userT1, t0, upper);
}

export function isVideoLongEnough(duration: number, T: number): boolean {
  return Number.isFinite(duration) && duration >= 2 * T + EPS;
}

export function clip(start: number, duration: number): Clip {
  return {
    start: roundTime(start),
    end: roundTime(start + duration)
  };
}

export function clipsOverlap(a: Clip, b: Clip, guard = 0): boolean {
  return a.start < b.end + guard && b.start < a.end + guard;
}

export function anchorTime(t: number): number {
  return Math.round(t / 0.25) * 0.25;
}
