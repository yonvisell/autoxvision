import { EPS, anchorTime, clampT1, clip, roundTime } from './clipMath';
import type { AnchorStats, GalleryItem, Mode, Settings, Trial } from '../types';

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
  const forwardGap = normalizeForwardGapRange(settings);
  const t1 = clampT1(duration, settings.T, t0, settings.t1, forwardGap.max);
  const cueStart = pickCueStart(settings.mode, t0, t1, settings.T, forwardGap.min, stats, previousCueStart, random);
  const cue = clip(cueStart, settings.T);
  const gallery = createContinuationGallery({
    duration,
    T: settings.T,
    count: settings.mode === 'mentalLap' ? 1 : settings.N,
    cueEnd: cue.end,
    minGap: forwardGap.min,
    maxGap: forwardGap.max,
    random
  });
  const answer = gallery.find((item) => item.isCorrect)?.clip ?? gallery[0].clip;

  return {
    id: `trial-${cueStart.toFixed(3)}-${Date.now()}-${Math.floor(random() * 1_000_000)}`,
    cue,
    answer,
    cueStart: roundTime(cueStart),
    createdAt: Date.now(),
    gallery
  };
}

function pickCueStart(
  mode: Mode,
  t0: number,
  t1: number,
  T: number,
  minForwardGap: number,
  stats: Record<string, AnchorStats>,
  previousCueStart: number | null,
  random: Random
): number {
  if (mode === 'sequential' || mode === 'mentalLap') {
    if (previousCueStart !== null && Number.isFinite(previousCueStart)) {
      const next = previousCueStart + T + minForwardGap;
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

function normalizeForwardGapRange(settings: Settings): { min: number; max: number } {
  const min = Math.min(10, Math.max(0, settings.minForwardGap));
  const visibleMax = Math.min(10, Math.max(min, settings.maxForwardGap));
  const effectiveMin = Math.max(EPS, min);
  return {
    min: effectiveMin,
    max: Math.max(effectiveMin, visibleMax)
  };
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

function createContinuationGallery({
  duration,
  T,
  count,
  cueEnd,
  minGap,
  maxGap,
  random
}: {
  duration: number;
  T: number;
  count: number;
  cueEnd: number;
  minGap: number;
  maxGap: number;
  random: Random;
}): GalleryItem[] {
  const lowerStart = cueEnd + minGap;
  const upperStart = Math.max(lowerStart, Math.min(cueEnd + maxGap, duration - T));
  const starts: number[] = [];
  const maxAttempts = Math.max(80, count * 60);
  const guard = Math.min(0.35, Math.max(0.05, (upperStart - lowerStart) / Math.max(2, count * 2)));
  let attempts = 0;

  while (starts.length < count && attempts < maxAttempts) {
    attempts += 1;
    const start = sampleUniform(lowerStart, upperStart, random);
    if (starts.every((existing) => Math.abs(existing - start) >= guard)) {
      starts.push(start);
    }
  }

  while (starts.length < count) {
    starts.push(sampleUniform(lowerStart, upperStart, random));
  }

  const correctIndex = starts.reduce((bestIndex, start, index) => (start < starts[bestIndex] ? index : bestIndex), 0);
  const items = starts.map((start, index) => ({
    id: `${index === correctIndex ? 'correct' : 'future'}-${index}-${start.toFixed(3)}-${Date.now()}`,
    clip: clip(start, T),
    isCorrect: index === correctIndex
  }));

  return shuffle(items, random);
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
