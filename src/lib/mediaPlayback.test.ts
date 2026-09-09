import { describe, expect, it } from 'vitest';
import { applyNativePlaybackRate, syncMediaToWallClock } from './mediaPlayback';

describe('applyNativePlaybackRate', () => {
  it('configures native playback through 14x without pitch processing', () => {
    const video = document.createElement('video');
    expect(applyNativePlaybackRate(video, 14)).toBe(14);
    expect(video.defaultPlaybackRate).toBe(14);
    expect(video.playbackRate).toBe(14);
    expect(video.preservesPitch).toBe(false);
  });

  it('clamps unsupported requested values to the application range', () => {
    const video = document.createElement('video');
    expect(applyNativePlaybackRate(video, 20)).toBe(14);
    expect(applyNativePlaybackRate(video, 0.1)).toBe(0.25);
  });

  it('skips lagging high-rate media toward the wall-clock position', () => {
    const video = document.createElement('video');
    video.currentTime = 2;

    expect(syncMediaToWallClock(video, 0, 30, 14, 1000, 2000)).toBe(false);
    expect(video.currentTime).toBe(14);
    expect(syncMediaToWallClock(video, 0, 20, 14, 1000, 2500)).toBe(true);
  });

  it('leaves ordinary native playback untouched between endpoints', () => {
    const video = document.createElement('video');
    video.currentTime = 0.5;

    expect(syncMediaToWallClock(video, 0, 10, 4, 1000, 2000)).toBe(false);
    expect(video.currentTime).toBe(0.5);
  });
});
