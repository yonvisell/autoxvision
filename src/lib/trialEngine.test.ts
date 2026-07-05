import { describe, expect, it } from 'vitest';
import { createTrial, sampleUniform, updateAnchorStats } from './trialEngine';
import { defaultSettings } from './presets';

describe('trialEngine', () => {
  it('samples uniformly within bounds', () => {
    expect(sampleUniform(2, 4, () => 0)).toBe(2);
    expect(sampleUniform(2, 4, () => 1)).toBe(4);
    expect(sampleUniform(2, 4, () => 0.5)).toBe(3);
  });

  it('samples future continuations inside the forward-gap range', () => {
    let i = 0;
    const values = [0.25, 0.9, 0.2, 0.65, 0.45, 0.8, 0.1, 0.3, 0.7];
    const trial = createTrial({
      duration: 20,
      settings: { ...defaultSettings, T: 1, N: 4, minForwardGap: 1, maxForwardGap: 4 },
      random: () => values[i++ % values.length]
    });

    const starts = trial.gallery.map((item) => item.clip.start);
    const gaps = starts.map((start) => start - trial.cue.end);
    const correct = trial.gallery.find((item) => item.isCorrect);

    expect(trial.gallery).toHaveLength(4);
    expect(trial.gallery.filter((item) => item.isCorrect)).toHaveLength(1);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeGreaterThanOrEqual(0.999);
      expect(gap).toBeLessThanOrEqual(4.001);
    }
    expect(correct?.clip.start).toBe(Math.min(...starts));
    expect(trial.answer.start).toBe(correct?.clip.start);
    expect(trial.answer.end - trial.answer.start).toBeCloseTo(1);
  });

  it('keeps sampled gallery starts separated by the configured lapse formula', () => {
    let i = 0;
    const values = [0, 0.03, 0.06, 0.1, 0.2, 0.35, 0.52, 0.78, 0.95, 0.4, 0.6];
    const minForwardGap = 1;
    const maxForwardGap = 9;
    const count = 4;
    const minLapse = (maxForwardGap - minForwardGap) / (2 * count);
    const trial = createTrial({
      duration: 30,
      settings: { ...defaultSettings, T: 1, N: count, minForwardGap, maxForwardGap },
      random: () => values[i++ % values.length]
    });

    const starts = trial.gallery.map((item) => item.clip.start).sort((a, b) => a - b);
    for (let index = 1; index < starts.length; index += 1) {
      expect(starts[index] - starts[index - 1]).toBeGreaterThanOrEqual(minLapse - 0.001);
    }
  });

  it('keeps every gallery option after the prompt when the visible min gap is zero', () => {
    let i = 0;
    const values = [0.1, 0, 0.2, 0.5, 0.9];
    const trial = createTrial({
      duration: 20,
      settings: { ...defaultSettings, T: 1, N: 3, minForwardGap: 0, maxForwardGap: 2 },
      random: () => values[i++ % values.length]
    });

    expect(trial.gallery).toHaveLength(3);
    for (const item of trial.gallery) {
      expect(item.clip.start).toBeGreaterThan(trial.cue.end);
    }
  });

  it('allows long forward windows beyond the old ten-second limit', () => {
    let i = 0;
    const values = [0, 0.9, 0.7, 0.8, 0.6, 0.4];
    const trial = createTrial({
      duration: 80,
      settings: { ...defaultSettings, T: 1, N: 3, minForwardGap: 20, maxForwardGap: 30 },
      random: () => values[i++ % values.length]
    });

    for (const item of trial.gallery) {
      const gap = item.clip.start - trial.cue.end;
      expect(gap).toBeGreaterThanOrEqual(19.999);
      expect(gap).toBeLessThanOrEqual(30.001);
    }
  });

  it('advances sequential mode by prompt length plus the minimum forward gap when possible', () => {
    const trial = createTrial({
      duration: 20,
      previousCueStart: 4,
      settings: { ...defaultSettings, mode: 'sequential', T: 0.5, minForwardGap: 1, maxForwardGap: 2 },
      random: () => 0
    });
    expect(trial.cueStart).toBe(5.5);
  });

  it('updates weak-spot anchor stats', () => {
    const stats = updateAnchorStats({}, 1.12, false, 1200);
    const stat = Object.values(stats)[0];
    expect(stat.t).toBe(1);
    expect(stat.wrongs).toBe(1);
    expect(stat.attempts).toBe(1);
  });
});
