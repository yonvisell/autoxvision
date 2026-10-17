import { act, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPanel } from './components/ControlPanel';
import type { CuePane } from './components/CuePane';
import type { Gallery } from './components/Gallery';
import type { NotesBox } from './components/NotesBox';
import { defaultSettings } from './lib/presets';
import { fingerprintFile } from './lib/videoFingerprint';
import { loadAnnotations, loadStats, saveSettings, saveStats } from './lib/persistence';
import type { Settings } from './types';
import App from './App';

const view = vi.hoisted(() => ({
  controls: null as unknown as ComponentProps<typeof ControlPanel>,
  cue: null as unknown as ComponentProps<typeof CuePane>,
  gallery: null as unknown as ComponentProps<typeof Gallery>,
  notes: null as unknown as ComponentProps<typeof NotesBox>
}));
vi.mock('./components/ControlPanel', () => ({ ControlPanel: (props: ComponentProps<typeof ControlPanel>) => { view.controls = props; return null; } }));
vi.mock('./components/CuePane', () => ({ CuePane: (props: ComponentProps<typeof CuePane>) => { view.cue = props; return null; } }));
vi.mock('./components/Gallery', () => ({ Gallery: (props: ComponentProps<typeof Gallery>) => { view.gallery = props; return null; } }));
vi.mock('./components/NotesBox', () => ({ NotesBox: (props: ComponentProps<typeof NotesBox>) => { view.notes = props; return null; } }));
vi.mock('./lib/sounds', () => ({ playTone: vi.fn() }));

describe('App drill transitions', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const file = new File(['course'], 'course.mp4', { type: 'video/mp4', lastModified: 1 });

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:course'), revokeObjectURL: vi.fn() });
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  async function advance(ms: number) {
    await act(async () => vi.advanceTimersByTime(ms));
  }

  async function load(duration = 600, patch: Partial<Settings> = {}) {
    saveSettings({ ...defaultSettings, mode: 'sequential', T: 1, playbackRate: 1, minForwardGap: 1, maxForwardGap: 1, ...patch });
    await act(async () => root.render(<App />));
    await act(async () => view.controls.onFileChange(file));
    const metadata = container.querySelector('video')!;
    Object.defineProperty(metadata, 'duration', { configurable: true, value: duration });
    await act(async () => metadata.dispatchEvent(new Event('loadedmetadata')));
    await advance(120);
    await advance(250);
  }

  async function answerPhase() {
    await act(async () => view.cue.onClipEnded());
    await advance(1000);
  }

  it('accepts a correct choice once, including rapid repeat before the reveal', async () => {
    await load();
    await answerPhase();
    const correct = view.gallery.items.find((item) => item.isCorrect)!;
    await act(async () => {
      view.gallery.onSelect(correct.id);
      view.gallery.onSelect(correct.id);
    });
    expect(container.querySelector('.score-badge strong')?.textContent).toBe('1');
    expect(view.gallery.disabled).toBe(true);
    expect(view.cue.canReplayPrompt).toBe(false);
    await act(async () => view.cue.onReplay());
    await advance(280);
    expect(view.cue.phase).toBe('revealing');
  });

  it('advances one-by-one choices only after the active clip completes', async () => {
    await load();
    await answerPhase();
    const first = view.gallery.items[0].id;
    expect(view.gallery.activeSequenceIndex).toBe(0);
    await advance(10_000);
    expect(view.gallery.activeSequenceIndex).toBe(0);
    await act(async () => view.gallery.onSequenceClipEnded?.('stale-item'));
    expect(view.gallery.activeSequenceIndex).toBe(0);
    await act(async () => {
      view.gallery.onSequenceClipEnded?.(first);
      view.gallery.onSequenceClipEnded?.(first);
    });
    expect(view.gallery.activeSequenceIndex).toBeNull();
    await advance(999);
    expect(view.gallery.activeSequenceIndex).toBeNull();
    await advance(1);
    expect(view.gallery.activeSequenceIndex).toBe(1);
    await act(async () => view.cue.onReplay());
    await advance(1000);
    expect(view.gallery.activeSequenceIndex).toBeNull();
  });

  it('keeps a just-edited note at its cue when the user moves immediately', async () => {
    await load();
    await act(async () => {
      view.notes.onChange('Look through the left gate ');
      view.controls.onSequentialPositionChange(5);
    });
    expect(view.notes.cueStart).toBe(5);
    expect(view.notes.value).toBe('');
    expect(loadAnnotations(fingerprintFile(file))).toEqual([expect.objectContaining({ t: 0, text: 'Look through the left gate' })]);
    await act(async () => view.controls.onSequentialPositionChange(0));
    expect(view.notes.value).toBe('Look through the left gate ');
  });

  it('saves notes to the original file during immediate file and mode changes', async () => {
    await load();
    const other = new File(['other'], 'other.mp4', { type: 'video/mp4', lastModified: 2 });
    await act(async () => {
      view.notes.onChange('Brake before the crest');
      view.controls.onSettingsChange({ mode: 'weakSpots' });
      view.controls.onFileChange(other);
    });
    expect(loadAnnotations(fingerprintFile(file))[0]?.text).toBe('Brake before the crest');
    expect(loadAnnotations(fingerprintFile(other))).toEqual([]);
    expect(view.notes.value).toBe('');
  });

  it('does not write the previous file statistics into a newly loaded file', async () => {
    await load();
    await answerPhase();
    await act(async () => view.gallery.onSelect(view.gallery.items.find((item) => item.isCorrect)!.id));
    const other = new File(['other'], 'other.mp4', { type: 'video/mp4', lastModified: 2 });
    const otherStats = { '12.00': { t: 12, attempts: 2, wrongs: 1, corrects: 1, totalReactionMs: 300, lastSeenAt: 1 } };
    saveStats(fingerprintFile(other), otherStats);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    await act(async () => view.controls.onFileChange(other));
    const otherWrites = writes.mock.calls.filter(([key]) => key === `autoxvision:v1:stats:${fingerprintFile(other)}`);
    expect(otherWrites.length).toBeGreaterThan(0);
    for (const [, value] of otherWrites) {
      expect(JSON.parse(value)).toEqual(otherStats);
    }
    expect(loadStats(fingerprintFile(file))['0.00']?.attempts).toBe(1);
    expect(loadStats(fingerprintFile(other))).toEqual(otherStats);
  });

  it('explains how to fit a one-minute video without silently changing settings', async () => {
    await load(60, { T: 10, playbackRate: 4 });
    expect(view.cue.phase).toBe('idle');
    expect(container.textContent).toContain('needs 81.0s');
    expect(container.textContent).toContain('lower Speed');
    expect(view.controls.settings.playbackRate).toBe(4);
  });

  it('does not turn a one-choice gallery into a scored quiz', async () => {
    await load(60, { T: 10, playbackRate: 1, minForwardGap: 39, maxForwardGap: 39 });
    expect(view.gallery.items).toHaveLength(0);
    expect(view.cue.phase).toBe('idle');
    expect(container.textContent).toContain('No distinct choices fit');
    expect(container.querySelector('.score-badge strong')?.textContent).toBe('0');
  });
});
