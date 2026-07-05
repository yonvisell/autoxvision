import { anchorTime, clampT1, clip, clipsOverlap, roundTime } from './clipMath';
import type { AnchorStats, Clip, GalleryItem, Mode, Settings, Trial } from '../types';

type Random = () => number;

export type TrialContext = {
  duration: number;
  settings: Settings;
  stats?: Record<string, AnchorStats>;
  previousCueStart?: number | null;
  random?: Random;
};

export function createTrial({
  duration,
  settings,
  stats = {},
  previousCueStart = null,
  random = Math.random
}: TrialContext): Trial {
  const t0 = Math.max(0, settings.t0);
  const t1 = clampT1(duration, settings.T, t0, settings.t1);
  const cueStart = pickCueStart(settings.mode, t0, t1, settings.T, stats, previousCueStart, random);
  const cue = clip(cueStart, settings.T);
  const answer = clip(cueStart + settings.T, settings.T);
  const correct: GalleryItem = {
    id: `correct-${cueStart.toFixed(3)}-${Date.now()}`,
    clip: answer,
    isCorrect: true
  };
  const distractors = createDistractors(duration, settings.T, settings.N - 1, cue, answer, random);

  return {
    id: `trial-${cueStart.toFixed(3)}-${Date.now()}-${Math.floor(random() * 1_000_000)}`,
    cue,
    answer,
    cueStart: roundTime(cueStart),
    createdAt: Date.now(),
    gallery: shuffle([correct, ...distractors], random)
  };
}

function pickCueStart(
  mode: Mode,
  t0: number,
  t1: number,
  T: number,
  stats: Record<string, AnchorStats>,
  previousCueStart: number | null,
  random: Random
): number {
  if (mode === 'sequential' || mode === 'mentalLap') {
    if (previousCueStart !== null && Number.isFinite(previousCueStart)) {
      const next = previousCueStart + T;
      if (next <= t1) {
        return roundTime(next);
      }
    }
  }

  if (mode === 'weakSpots') {
    const weighted = pickWeakSpot(stats, t0, t1, random);
    if (weighted !== null) {
      return weighted;
    }
  }

  return sampleUniform(t0, t1, random);
}

function pickWeakSpot(
  stats: Record<string, AnchorStats>,
  t0: number,
  t1: number,
  random: Random
): number | null {
  const anchors = Object.values(stats).filter((stat) => stat.attempts >= 1 && stat.t >= t0 && stat.t <= t1);
  if (anchors.length < 3) {
    return null;
  }

  const now = Date.now();
  const weighted = anchors.map((stat) => {
    const wrongRate = stat.wrongs / Math.max(1, stat.attempts);
    const avgReaction = stat.totalReactionMs / Math.max(1, stat.attempts);
    const recencyBoost = Math.max(0, 1 - (now - stat.lastSeenAt) / (1000 * 60 * 60));
    const weight = 1 + wrongRate * 4 + Math.min(avgReaction / 2500, 2) + recencyBoost;
    return { stat, weight };
  });

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let pick = random() * total;
  for (const entry of weighted) {
    pick -= entry.weight;
    if (pick <= 0) {
      return entry.stat.t;
    }
  }
  return weighted[weighted.length - 1]?.stat.t ?? null;
}

export function sampleUniform(t0: number, t1: number, random: Random = Math.random): number {
  if (t1 <= t0) {
    return roundTime(t0);
  }
  return roundTime(t0 + random() * (t1 - t0));
}

export function createDistractors(
  duration: number,
  T: number,
  count: number,
  cue: Clip,
  answer: Clip,
  random: Random = Math.random
): GalleryItem[] {
  const maxStart = Math.max(0, duration - T);
  const forbidden = [cue, answer];
  let separation = Math.max(0.5, 2 * T);
  const items: GalleryItem[] = [];
  let attempts = 0;
  const maxAttempts = Math.max(120, count * 100);

  while (items.length < count && attempts < maxAttempts) {
    attempts += 1;
    if (attempts === Math.floor(maxAttempts * 0.55)) {
      separation = Math.max(0.15, separation / 2);
    }
    if (attempts === Math.floor(maxAttempts * 0.82)) {
      separation = 0;
    }

    const start = sampleUniform(0, maxStart, random);
    const candidate = clip(start, T);
    const tooNearRequired = forbidden.some((existing) => clipsOverlap(candidate, existing, separation));
    const tooNearGallery = items.some((item) => clipsOverlap(candidate, item.clip, Math.max(0.05, separation / 2)));
    if (!tooNearRequired && !tooNearGallery) {
      items.push({
        id: `distractor-${items.length}-${start.toFixed(3)}-${attempts}`,
        clip: candidate,
        isCorrect: false
      });
    }
  }

  while (items.length < count) {
    const start = sampleUniform(0, maxStart, random);
    items.push({
      id: `fallback-${items.length}-${start.toFixed(3)}`,
      clip: clip(start, T),
      isCorrect: false
    });
  }

  return items;
}

export function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function updateAnchorStats(
  stats: Record<string, AnchorStats>,
  cueStart: number,
  wasCorrect: boolean,
  reactionMs: number
): Record<string, AnchorStats> {
  const t = anchorTime(cueStart);
  const key = t.toFixed(2);
  const previous = stats[key] ?? {
    t,
    attempts: 0,
    wrongs: 0,
    corrects: 0,
    totalReactionMs: 0,
    lastSeenAt: 0
  };

  return {
    ...stats,
    [key]: {
      ...previous,
      attempts: previous.attempts + 1,
      wrongs: previous.wrongs + (wasCorrect ? 0 : 1),
      corrects: previous.corrects + (wasCorrect ? 1 : 0),
      totalReactionMs: previous.totalReactionMs + Math.max(0, reactionMs),
      lastSeenAt: Date.now()
    }
  };
}
