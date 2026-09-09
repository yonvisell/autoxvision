import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from './persistence';
import { defaultSettings } from './presets';

describe('settings persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips prompt masking settings', () => {
    saveSettings({
      ...defaultSettings,
      promptBlurEnabled: true,
      promptBlurStrength: 41,
      promptBlurHeight: 62,
      promptFadeEnabled: true,
      promptFadeLevel: 53,
      promptFadeHeight: 37
    });

    expect(loadSettings(defaultSettings)).toMatchObject({
      promptBlurEnabled: true,
      promptBlurStrength: 41,
      promptBlurHeight: 62,
      promptFadeEnabled: true,
      promptFadeLevel: 53,
      promptFadeHeight: 37
    });
  });

  it('retains native playback rates through the 14x control limit', () => {
    saveSettings({ ...defaultSettings, playbackRate: 14 });
    expect(loadSettings(defaultSettings).playbackRate).toBe(14);
  });
});
