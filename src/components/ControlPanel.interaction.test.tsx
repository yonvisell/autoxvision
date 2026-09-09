import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../lib/presets';
import type { Settings } from '../types';
import { ControlPanel } from './ControlPanel';

describe('ControlPanel interactions', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let changes: Array<Partial<Settings>>;

  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    changes = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderPanel() {
    await act(async () => {
      root.render(
        <ControlPanel
          settings={defaultSettings}
          videoName="course.mp4"
          duration={120}
          sequentialPosition={0}
          sequentialPositionMax={39}
          disabled={false}
          collapsed={false}
          onFileChange={vi.fn()}
          onSettingsChange={(patch) => changes.push(patch)}
          onPresetChange={vi.fn()}
          onSavePreset={vi.fn()}
          onResetScore={vi.fn()}
          onSequentialPositionChange={vi.fn()}
          onToggleCollapsed={vi.fn()}
        />
      );
    });
  }

  async function moveRange(ariaLabel: string, value: number) {
    const input = container.querySelector<HTMLInputElement>(`input[aria-label="${ariaLabel}"]`);
    expect(input).not.toBeNull();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(input, String(value));
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  it('emits the requested 14x native playback rate', async () => {
    await renderPanel();
    await moveRange('Playback speed', 14);
    expect(changes.at(-1)).toEqual({ playbackRate: 14 });
  });

  it('emits independent course-range start and end changes', async () => {
    await renderPanel();
    await moveRange('Course range start', 20);
    await moveRange('Course range end', 100);

    expect(changes).toContainEqual({ t0: 20 });
    expect(changes).toContainEqual({ t1: 100 });
  });

  it('keeps both answer-gap handles ordered', async () => {
    await renderPanel();
    await moveRange('Minimum answer gap', 55);
    await moveRange('Maximum answer gap', 0.5);

    expect(changes[0]).toEqual({ minForwardGap: 55, maxForwardGap: 55 });
    expect(changes[1]).toEqual({ minForwardGap: 0.5, maxForwardGap: 0.5 });
  });
});
