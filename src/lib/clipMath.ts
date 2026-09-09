import type { Clip } from '../types';

export const EPS = 1 / 30;
export const MAX_RESPONSE_GAP_SECONDS = 60;
export const MIN_PLAYBACK_RATE = 0.25;
export const MAX_PLAYBACK_RATE = 14;

export function roundTime(value: number, places = 3): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

export function sourceDurationForPlayback(displayDuration: number, playbackRate: number): number {
  return roundTime(Math.max(0, displayDuration) * clamp(playbackRate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveCourseEnd(duration: number, t0 = 0, userT1?: number | null): number {
  const start = clamp(Number.isFinite(t0) ? t0 : 0, 0, Math.max(0, duration));
  if (userT1 === null || userT1 === undefined || !Number.isFinite(userT1)) {
    return Math.max(start, duration);
  }
  return clamp(userT1, start, Math.max(start, duration));
}

export function requiredResponseGap(gap: number): number {
  return Math.max(EPS, Math.min(MAX_RESPONSE_GAP_SECONDS, Math.max(0, gap)));
}

export function maxCueStartInRange(t0: number, t1: number, T: number, minForwardGap = 0): number {
  const start = Math.max(0, t0);
  const end = Math.max(start, t1);
  return Math.max(start, end - 2 * Math.max(0, T) - Math.max(0, minForwardGap));
}

export function isCourseRangeLongEnough(t0: number, t1: number, T: number, minForwardGap = 0): boolean {
  const start = Math.max(0, t0);
  const end = Math.max(start, t1);
  return Number.isFinite(end) && end - start + 0.001 >= 2 * Math.max(0, T) + Math.max(0, minForwardGap);
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
