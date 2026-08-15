import { describe, expect, it } from 'vitest';
import { applyPreset, defaultSettings, markCustom } from './presets';

describe('presets', () => {
  it('applies preset values', () => {
    const settings = applyPreset(defaultSettings, 'pressure');
    expect(settings.T).toBe(0.75);
    expect(settings.N).toBe(6);
    expect(settings.replayEnabled).toBe(false);
    expect(settings.galleryPlayback).toBe('hover');
    expect(settings.preset).toBe('pressure');
  });

  it('marks direct edits as custom', () => {
    const edited = markCustom(applyPreset(defaultSettings, 'encoding'), { N: 5 });
    expect(edited.N).toBe(5);
    expect(edited.preset).toBe('custom');
  });

  it('uses a longer cue and sequential gallery playback by default', () => {
    expect(defaultSettings.T).toBe(2.5);
    expect(defaultSettings.galleryPlayback).toBe('sequence');
    expect(defaultSettings.galleryDelay).toBe(2);
    expect(defaultSettings.minForwardGap).toBe(1);
    expect(defaultSettings.maxForwardGap).toBe(50);
    expect(defaultSettings.playbackRate).toBe(1);
    expect(defaultSettings.mentalLapOrder).toBe('sequential');
  });
});
