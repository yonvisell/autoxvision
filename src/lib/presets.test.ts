import { describe, expect, it } from 'vitest';
import { applyPreset, defaultSettings, markCustom, savedPresetPayload } from './presets';

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
    expect(defaultSettings.T).toBe(10);
    expect(defaultSettings.galleryPlayback).toBe('sequence');
    expect(defaultSettings.galleryDelay).toBe(1);
    expect(defaultSettings.galleryLoopDelay).toBe(0.5);
    expect(defaultSettings.minForwardGap).toBe(1);
    expect(defaultSettings.maxForwardGap).toBe(50);
    expect(defaultSettings.playbackRate).toBe(4);
    expect(defaultSettings.mentalLapOrder).toBe('sequential');
    expect(defaultSettings.promptBlurEnabled).toBe(false);
    expect(defaultSettings.promptFadeEnabled).toBe(false);
  });

  it('preserves prompt masking across built-in presets and includes it in a saved preset', () => {
    const masked = {
      ...defaultSettings,
      promptBlurEnabled: true,
      promptBlurStrength: 35,
      promptBlurHeight: 60,
      promptFadeEnabled: true,
      promptFadeLevel: 45,
      promptFadeHeight: 25
    };
    const applied = applyPreset(masked, 'learning');
    const saved = savedPresetPayload(applied);

    expect(applied).toMatchObject({
      promptBlurEnabled: true,
      promptBlurStrength: 35,
      promptBlurHeight: 60,
      promptFadeEnabled: true,
      promptFadeLevel: 45,
      promptFadeHeight: 25
    });
    expect(saved).toMatchObject({
      promptBlurEnabled: true,
      promptBlurStrength: 35,
      promptBlurHeight: 60,
      promptFadeEnabled: true,
      promptFadeLevel: 45,
      promptFadeHeight: 25
    });
  });
});
