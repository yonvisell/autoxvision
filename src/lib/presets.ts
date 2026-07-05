import type { Preset, Settings } from '../types';

export const defaultSettings: Settings = {
  T: 2.5,
  N: 3,
  mode: 'random',
  preset: 'custom',
  galleryPlayback: 'sequence',
  galleryDelay: 1,
  replayEnabled: true,
  soundEnabled: true,
  t0: 0,
  t1: null
};

export type BuiltInPreset = Exclude<Preset, 'custom' | 'saved'>;

export const presetSettings: Record<BuiltInPreset, Partial<Settings>> = {
  encoding: { T: 2.5, N: 2, replayEnabled: true, galleryPlayback: 'sequence', galleryDelay: 1 },
  learning: { T: 2, N: 3, replayEnabled: true, galleryPlayback: 'sequence', galleryDelay: 0.75 },
  performance: { T: 1.25, N: 4, replayEnabled: false, galleryPlayback: 'hover', galleryDelay: 0.75 },
  pressure: { T: 0.75, N: 6, replayEnabled: false, galleryPlayback: 'hover', galleryDelay: 0.5 }
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
    galleryPlayback: settings.galleryPlayback,
    galleryDelay: settings.galleryDelay,
    replayEnabled: settings.replayEnabled,
    soundEnabled: settings.soundEnabled,
    t0: settings.t0,
    t1: settings.t1
  };
}
