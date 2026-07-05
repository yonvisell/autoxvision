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
