import type { Preset, Settings } from '../types';

export const defaultSettings: Settings = {
  T: 0.5,
  N: 3,
  mode: 'random',
  preset: 'custom',
  galleryPlayback: 'loop',
  replayEnabled: true,
  soundEnabled: true,
  t0: 0,
  t1: null
};

export const presetSettings: Record<Exclude<Preset, 'custom'>, Partial<Settings>> = {
  encoding: { T: 2, N: 2, replayEnabled: true, galleryPlayback: 'loop' },
  learning: { T: 1, N: 3, replayEnabled: true, galleryPlayback: 'loop' },
  performance: { T: 0.5, N: 4, replayEnabled: false, galleryPlayback: 'hover' },
  pressure: { T: 0.5, N: 6, replayEnabled: false, galleryPlayback: 'hover' }
};

export function applyPreset(settings: Settings, preset: Preset): Settings {
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
