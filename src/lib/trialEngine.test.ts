import { describe, expect, it } from 'vitest';
import { createTrial, sampleUniform, updateAnchorStats } from './trialEngine';
import { clipsOverlap } from './clipMath';
import { defaultSettings } from './presets';

describe('trialEngine', () => {
  it('samples uniformly within bounds', () => {
    expect(sampleUniform(2, 4, () => 0)).toBe(2);
    expect(sampleUniform(2, 4, () => 1)).toBe(4);
    expect(sampleUniform(2, 4, () => 0.5)).toBe(3);
  });

  it('creates a forward-gap answer and one correct gallery item', () => {
    const trial = createTrial({
      duration: 20,
      settings: { ...defaultSettings, T: 1, N: 4, answerGap: 1 },
      random: () => 0.25
    });
    expect(trial.answer.start - trial.cue.end).toBeCloseTo(1);
    expect(trial.answer.end - trial.answer.start).toBeCloseTo(1);
    expect(trial.gallery).toHaveLength(4);
    expect(trial.gallery.filter((item) => item.isCorrect)).toHaveLength(1);
  });

  it('keeps feasible distractors away from cue and answer', () => {
    let i = 0;
    const values = [0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.9, 0.5];
    const trial = createTrial({
      duration: 30,
      settings: { ...defaultSettings, T: 1, N: 3 },
      random: () => values[i++ % values.length]
    });
    const distractors = trial.gallery.filter((item) => !item.isCorrect);
    for (const distractor of distractors) {
      expect(clipsOverlap(distractor.clip, trial.cue, 0.5)).toBe(false);
      expect(clipsOverlap(distractor.clip, trial.answer, 0.5)).toBe(false);
    }
  });

  it('advances sequential mode by T when possible', () => {
    const trial = createTrial({
      duration: 20,
      previousCueStart: 4,
      settings: { ...defaultSettings, mode: 'sequential', T: 0.5, answerGap: 1 },
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
