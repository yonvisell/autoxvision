import type { Preset, Settings } from '../types';

export const MAX_PROMPT_BLUR_PX = 60;

export const defaultSettings: Settings = {
  T: 10,
  N: 3,
  mode: 'random',
  mentalLapOrder: 'sequential',
  preset: 'custom',
  galleryPlayback: 'sequence',
  galleryDelay: 1,
  galleryLoopDelay: 0.5,
  minForwardGap: 1,
  maxForwardGap: 50,
  playbackRate: 4,
  replayEnabled: true,
  soundEnabled: true,
  promptBlurEnabled: false,
  promptBlurStrength: 24,
  promptBlurHeight: 50,
  promptFadeEnabled: false,
  promptFadeLevel: 70,
  promptFadeHeight: 50,
  t0: 0,
  t1: null
};

export type BuiltInPreset = Exclude<Preset, 'custom' | 'saved'>;

export const presetSettings: Record<BuiltInPreset, Partial<Settings>> = {
  encoding: { T: 2.5, N: 2, replayEnabled: true, galleryPlayback: 'sequence', galleryDelay: 2, minForwardGap: 1, maxForwardGap: 50, playbackRate: 1 },
  learning: { T: 2, N: 3, replayEnabled: true, galleryPlayback: 'sequence', galleryDelay: 1.5, minForwardGap: 1, maxForwardGap: 50, playbackRate: 1 },
  performance: { T: 1.25, N: 4, replayEnabled: false, galleryPlayback: 'hover', galleryDelay: 1, minForwardGap: 1, maxForwardGap: 50, playbackRate: 1 },
  pressure: { T: 0.75, N: 6, replayEnabled: false, galleryPlayback: 'hover', galleryDelay: 0.5, minForwardGap: 0.75, maxForwardGap: 50, playbackRate: 1 }
};

export function applyPreset(settings: Settings, preset: BuiltInPreset | 'custom'): Settings {
  if (preset === 'custom') {
    return { ...settings, preset };
  }
  return {
    ...settings,
    ...presetSettings[preset],
    preset
  };
}

export function markCustom(settings: Settings, patch: Partial<Settings>): Settings {
  return {
    ...settings,
    ...patch,
    preset: 'custom'
  };
}

export function savedPresetPayload(settings: Settings): Partial<Settings> {
  return {
    T: settings.T,
    N: settings.N,
    mode: settings.mode,
    mentalLapOrder: settings.mentalLapOrder,
    galleryPlayback: settings.galleryPlayback,
    galleryDelay: settings.galleryDelay,
    galleryLoopDelay: settings.galleryLoopDelay,
    minForwardGap: settings.minForwardGap,
    maxForwardGap: settings.maxForwardGap,
    playbackRate: settings.playbackRate,
    replayEnabled: settings.replayEnabled,
    soundEnabled: settings.soundEnabled,
    promptBlurEnabled: settings.promptBlurEnabled,
    promptBlurStrength: settings.promptBlurStrength,
    promptBlurHeight: settings.promptBlurHeight,
    promptFadeEnabled: settings.promptFadeEnabled,
    promptFadeLevel: settings.promptFadeLevel,
    promptFadeHeight: settings.promptFadeHeight
  };
}
