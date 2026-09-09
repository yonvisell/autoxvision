import { MAX_PLAYBACK_RATE, MIN_PLAYBACK_RATE, clamp } from './clipMath';

export const HIGH_RATE_SYNC_THRESHOLD = 4;

type PitchControlledMedia = HTMLMediaElement & {
  webkitPreservesPitch?: boolean;
};

export function applyNativePlaybackRate(media: HTMLMediaElement, requestedRate: number): number {
  const rate = clamp(requestedRate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
  const pitchControlled = media as PitchControlledMedia;

  media.preservesPitch = false;
  if ('webkitPreservesPitch' in pitchControlled) {
    pitchControlled.webkitPreservesPitch = false;
  }

  try {
    media.defaultPlaybackRate = rate;
    media.playbackRate = rate;
  } catch {
    media.defaultPlaybackRate = media.playbackRate;
  }

  return media.playbackRate;
}

export function syncMediaToWallClock(
  media: HTMLMediaElement,
  clipStart: number,
  clipEnd: number,
  requestedRate: number,
  wallStartMs: number,
  nowMs: number = performance.now()
): boolean {
  const rate = clamp(requestedRate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
  const expectedTime = clipStart + (Math.max(0, nowMs - wallStartMs) / 1000) * rate;
  if (expectedTime >= clipEnd - 0.015) {
    return true;
  }

  const lag = expectedTime - media.currentTime;
  // High-rate decode may fall behind its nominal media clock; skip stale frames at bounded intervals.
  const correctionThreshold = Math.max(0.5, rate * 0.2);
  if (rate > HIGH_RATE_SYNC_THRESHOLD && !media.seeking && lag > correctionThreshold) {
    media.currentTime = Math.min(clipEnd, expectedTime);
  }
  return false;
}
