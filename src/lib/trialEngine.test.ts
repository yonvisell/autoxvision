import { describe, expect, it } from 'vitest';
import { createTrial, sampleUniform, updateAnchorStats } from './trialEngine';
import { defaultSettings } from './presets';

describe('trialEngine', () => {
  it('samples uniformly within bounds', () => {
    expect(sampleUniform(2, 4, () => 0)).toBe(2);
    expect(sampleUniform(2, 4, () => 1)).toBe(4);
    expect(sampleUniform(2, 4, () => 0.5)).toBe(3);
  });

  it('samples the correct continuation inside the forward-gap range', () => {
    let i = 0;
    const values = [0.25, 0.9, 0.2, 0.65, 0.45, 0.8, 0.1, 0.3, 0.7];
    const trial = createTrial({
      duration: 20,
      settings: { ...defaultSettings, T: 1, N: 4, minForwardGap: 1, maxForwardGap: 4 },
      random: () => values[i++ % values.length]
    });

    const correct = trial.gallery.find((item) => item.isCorrect);
    const correctGap = (correct?.clip.start ?? 0) - trial.cue.end;

    expect(trial.gallery).toHaveLength(4);
    expect(trial.gallery.filter((item) => item.isCorrect)).toHaveLength(1);
    expect(correctGap).toBeGreaterThanOrEqual(0.999);
    expect(correctGap).toBeLessThanOrEqual(4.001);
    expect(trial.answer.start).toBe(correct?.clip.start);
    expect(trial.answer.end - trial.answer.start).toBeCloseTo(1);
  });

  it('samples random-recall wrong choices away from the correct answer neighborhood', () => {
    let i = 0;
    const values = [0.45, 0.25, 0.1, 0.8, 0.35, 0.9, 0.6, 0.15, 0.55, 0.75, 0.95, 0.2];
    const trial = createTrial({
      duration: 120,
      settings: { ...defaultSettings, mode: 'random', T: 2, N: 4, minForwardGap: 1, maxForwardGap: 4 },
      random: () => values[i++ % values.length]
    });

    const correct = trial.gallery.find((item) => item.isCorrect);
    const forbiddenStart = trial.cue.start - 2;
    const forbiddenEnd = (correct?.clip.end ?? 0) + 2;

    expect(correct).toBeDefined();
    for (const item of trial.gallery.filter((entry) => !entry.isCorrect)) {
      expect(Math.abs(item.clip.start - (correct?.clip.start ?? 0))).toBeGreaterThanOrEqual(9.999);
      expect(item.clip.start < trial.cue.start - 9.999 || item.clip.start > (correct?.clip.start ?? 0) + 9.999).toBe(true);
      expect(item.clip.start <= forbiddenStart || item.clip.start >= forbiddenEnd).toBe(true);
    }
  });

  it('never samples wrong choices between the prompt and buffered answer region', () => {
    let i = 0;
    const values = [0.5, 0.45, 0.15, 0.55, 0.75, 0.95, 0.25, 0.65, 0.35, 0.85];
    const trial = createTrial({
      duration: 14,
      forcedCueStart: 3,
      settings: { ...defaultSettings, mode: 'random', T: 2, N: 4, minForwardGap: 1, maxForwardGap: 1 },
      random: () => values[i++ % values.length]
    });
    const correct = trial.gallery.find((item) => item.isCorrect);
    const forbiddenStart = trial.cue.start - 2;
    const forbiddenEnd = (correct?.clip.end ?? 0) + 2;

    expect(correct?.clip.start).toBe(6);
    for (const item of trial.gallery.filter((entry) => !entry.isCorrect)) {
      expect(item.clip.start <= forbiddenStart || item.clip.start >= forbiddenEnd).toBe(true);
      expect(item.clip.start > trial.cue.start && item.clip.start < (correct?.clip.start ?? 0)).toBe(false);
    }
  });

  it('keeps every wrong clip wholly outside the protected prompt-to-answer window', () => {
    let state = 0x9e3779b9;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };

    for (let index = 0; index < 2000; index += 1) {
      const T = 0.25 + (index % 40) * 0.25;
      const minForwardGap = index % 10;
      const maxForwardGap = minForwardGap + (index % (61 - minForwardGap));
      const trial = createTrial({
        duration: 360,
        settings: { ...defaultSettings, mode: index % 2 === 0 ? 'random' : 'sequential', T, N: 8, minForwardGap, maxForwardGap },
        previousCueStart: index % 2 === 0 ? null : 90,
        random
      });
      const correct = trial.gallery.find((item) => item.isCorrect);

      expect(correct).toBeDefined();
      expect(trial.gallery).toHaveLength(8);
      for (const item of trial.gallery.filter((entry) => !entry.isCorrect)) {
        const whollyBefore = item.clip.end <= trial.cue.start - T + 0.001;
        const whollyAfter = item.clip.start >= (correct?.clip.end ?? 0) + T - 0.001;
        expect(whollyBefore || whollyAfter).toBe(true);
      }
    }
  });

  it('samples sequential-recall wrong choices from other course times', () => {
    let i = 0;
    const values = [0.5, 0.2, 0.85, 0.4, 0.92, 0.7, 0.15, 0.6, 0.25, 0.95];
    const trial = createTrial({
      duration: 150,
      previousCueStart: 40,
      settings: { ...defaultSettings, mode: 'sequential', T: 2, N: 4, minForwardGap: 1, maxForwardGap: 5 },
      random: () => values[i++ % values.length]
    });
    const correct = trial.gallery.find((item) => item.isCorrect);
    const forbiddenStart = trial.cue.start - 2;
    const forbiddenEnd = (correct?.clip.end ?? 0) + 2;

    expect(trial.cueStart).toBe(43);
    expect(correct).toBeDefined();
    for (const item of trial.gallery.filter((entry) => !entry.isCorrect)) {
      expect(Math.abs(item.clip.start - (correct?.clip.start ?? 0))).toBeGreaterThanOrEqual(9.999);
      expect(item.clip.start <= forbiddenStart || item.clip.start >= forbiddenEnd).toBe(true);
    }
  });

  it('keeps the correct option after the prompt when the visible min gap is zero', () => {
    let i = 0;
    const values = [0.1, 0, 0.2, 0.5, 0.9];
    const trial = createTrial({
      duration: 20,
      settings: { ...defaultSettings, T: 1, N: 3, minForwardGap: 0, maxForwardGap: 2 },
      random: () => values[i++ % values.length]
    });

    const correct = trial.gallery.find((item) => item.isCorrect);

    expect(trial.gallery).toHaveLength(3);
    expect(correct?.clip.start).toBeGreaterThan(trial.cue.end);
  });

  it('allows the correct continuation to use long forward windows beyond the old ten-second limit', () => {
    let i = 0;
    const values = [0, 0.9, 0.7, 0.8, 0.6, 0.4];
    const trial = createTrial({
      duration: 80,
      settings: { ...defaultSettings, T: 1, N: 3, minForwardGap: 20, maxForwardGap: 30 },
      random: () => values[i++ % values.length]
    });

    const correct = trial.gallery.find((item) => item.isCorrect);
    const gap = (correct?.clip.start ?? 0) - trial.cue.end;

    expect(gap).toBeGreaterThanOrEqual(19.999);
    expect(gap).toBeLessThanOrEqual(30.001);
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

  it('can force progressive modes back to the course start', () => {
    const trial = createTrial({
      duration: 40,
      previousCueStart: 20,
      forcedCueStart: 3,
      settings: { ...defaultSettings, mode: 'sequential', t0: 3, T: 1, minForwardGap: 1, maxForwardGap: 4 },
      random: () => 0.8
    });

    expect(trial.cueStart).toBe(3);
  });

  it('makes the mental-lap continuation immediate and equal in length to the prompt', () => {
    const trial = createTrial({
      duration: 30,
      settings: { ...defaultSettings, mode: 'mentalLap', T: 2, minForwardGap: 1, maxForwardGap: 3 },
      random: () => 0.5
    });
    expect(trial.answer.start).toBe(trial.cue.end);
    expect(trial.answer.end - trial.answer.start).toBe(trial.cue.end - trial.cue.start);
  });

  it('supports sequential and random mental-lap prompt progression', () => {
    const sequential = createTrial({
      duration: 40,
      previousCueStart: 10,
      settings: { ...defaultSettings, mode: 'mentalLap', mentalLapOrder: 'sequential', T: 2 },
      random: () => 0.8
    });
    const random = createTrial({
      duration: 40,
      previousCueStart: 10,
      settings: { ...defaultSettings, mode: 'mentalLap', mentalLapOrder: 'random', T: 2 },
      random: () => 0.25
    });

    expect(sequential.cueStart).toBe(12);
    expect(random.cueStart).toBe(8.992);
  });

  it('updates weak-spot anchor stats', () => {
    const stats = updateAnchorStats({}, 1.12, false, 1200);
    const stat = Object.values(stats)[0];
    expect(stat.t).toBe(1);
    expect(stat.wrongs).toBe(1);
    expect(stat.attempts).toBe(1);
  });
});
