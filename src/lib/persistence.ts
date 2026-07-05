import type { AnchorStats, Annotation, Mode, Settings } from '../types';
import { MAX_FORWARD_GAP_SECONDS } from './clipMath';

const prefix = 'autoxvision:v1';

export function loadSettings(defaults: Settings): Settings {
  const loaded = read<Partial<Settings> & { answerGap?: number }>(`${prefix}:settings`, {});
  const migrated = { ...loaded };
  if (!Number.isFinite(migrated.minForwardGap)) {
    migrated.minForwardGap = Number.isFinite(loaded.answerGap) ? Math.max(0, loaded.answerGap as number) : defaults.minForwardGap;
  }
  const minForwardGap = migrated.minForwardGap ?? defaults.minForwardGap;
  if (!Number.isFinite(migrated.maxForwardGap)) {
    migrated.maxForwardGap = Math.max(minForwardGap, defaults.maxForwardGap);
  }
  const merged = { ...defaults, ...migrated };
  if ((merged.galleryPlayback as string) === 'loop') {
    merged.galleryPlayback = 'allLoop';
  }
  if (!Number.isFinite(merged.galleryDelay)) {
    merged.galleryDelay = defaults.galleryDelay;
  }
  if (!Number.isFinite(merged.playbackRate)) {
    merged.playbackRate = defaults.playbackRate;
  }
  // Previous sequence-mode default was 1s; move saved default-shaped sessions to the calmer current wait.
  if (loaded.galleryDelay === 1 && loaded.galleryPlayback === 'sequence') {
    merged.galleryDelay = defaults.galleryDelay;
  }
  if (loaded.minForwardGap === 1 && loaded.maxForwardGap === 2) {
    merged.maxForwardGap = defaults.maxForwardGap;
  }
  merged.minForwardGap = Math.min(MAX_FORWARD_GAP_SECONDS, Math.max(0, merged.minForwardGap));
  merged.maxForwardGap = Math.min(MAX_FORWARD_GAP_SECONDS, Math.max(merged.minForwardGap, merged.maxForwardGap));
  merged.playbackRate = Math.min(10, Math.max(0.25, merged.playbackRate));
  if (merged.preset === 'saved' && !loadSavedPreset()) {
    merged.preset = 'custom';
  }
  return merged;
}

export function saveSettings(settings: Settings): void {
  write(`${prefix}:settings`, settings);
}

export function loadAnnotations(videoFingerprint: string): Annotation[] {
  return read(`${prefix}:annotations:${videoFingerprint}`, []);
}

export function saveAnnotations(videoFingerprint: string, annotations: Annotation[]): void {
  write(`${prefix}:annotations:${videoFingerprint}`, annotations);
}

export function highScoreKey(videoFingerprint: string, mode: Mode): string {
  return `${prefix}:highScore:${videoFingerprint}:${mode}`;
}

export function loadHighScore(videoFingerprint: string, mode: Mode): number {
  return read(highScoreKey(videoFingerprint, mode), 0);
}

export function saveHighScore(videoFingerprint: string, mode: Mode, score: number): void {
  write(highScoreKey(videoFingerprint, mode), score);
}

export function loadStats(videoFingerprint: string): Record<string, AnchorStats> {
  return read(`${prefix}:stats:${videoFingerprint}`, {});
}

export function saveStats(videoFingerprint: string, stats: Record<string, AnchorStats>): void {
  write(`${prefix}:stats:${videoFingerprint}`, stats);
}

export function loadSavedPreset(): Partial<Settings> | null {
  return read<Partial<Settings> | null>(`${prefix}:savedPreset`, null);
}

export function saveSavedPreset(settings: Partial<Settings>): void {
  write(`${prefix}:savedPreset`, settings);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort local persistence should never block the drill.
  }
}
