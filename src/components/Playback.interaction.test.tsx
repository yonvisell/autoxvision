import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../lib/presets';
import { CuePane } from './CuePane';
import { Gallery } from './Gallery';

const items = [{ id: 'choice', clip: { start: 10, end: 12 }, isCorrect: true }];

describe('Playback startup and cancellation', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const ended = vi.fn();
  const selected = vi.fn();

  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      window.setTimeout(() => callback(performance.now()), 16)
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => window.clearTimeout(handle));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
    vi.spyOn(HTMLMediaElement.prototype, 'seeking', 'get').mockReturnValue(false);
    ended.mockClear();
    selected.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function renderGallery(disabled = false) {
    await act(async () => root.render(
      <Gallery
        videoUrl="blob:test" items={items} playback="sequence" activeSequenceIndex={0}
        playbackRate={1} loopDelay={0.5} instruction="Choose" disabled={disabled}
        hidden={false} collapsed={false} wrongIds={new Set()} revealCorrect={false} misses={[]}
        onRetryMiss={vi.fn()} onToggleCollapsed={vi.fn()} onSelect={selected} onSequenceClipEnded={ended}
      />
    ));
  }

  async function seekReady() {
    await act(async () => container.querySelector('video')?.dispatchEvent(new Event('seeked')));
  }

  async function advance(ms: number) {
    await act(async () => vi.advanceTimersByTimeAsync(ms));
  }

  it('gives a sequence choice its complete interval after delayed playback starts', async () => {
    let start!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(new Promise<void>((resolve) => { start = resolve; }));
    await renderGallery();
    await seekReady();
    await advance(6000);
    expect(ended).not.toHaveBeenCalled();
    await act(async () => start());
    await advance(1980);
    expect(ended).not.toHaveBeenCalled();
    await advance(40);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith('choice');
  });

  it('cancels a pending choice and removes its decoder when the gallery is disabled', async () => {
    let start!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(new Promise<void>((resolve) => { start = resolve; }));
    await renderGallery();
    await seekReady();
    await renderGallery(true);
    expect(container.querySelector('video')).toBeNull();
    await act(async () => start());
    await advance(12000);
    expect(ended).not.toHaveBeenCalled();
  });

  it('does not restart a one-by-one choice when the user focuses it', async () => {
    await renderGallery();
    await seekReady();
    await advance(1000);
    await act(async () => container.querySelector<HTMLButtonElement>('.gallery-tile')?.focus());
    await advance(1020);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('retries a blocked choice on tap without counting the tap as an answer', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    await renderGallery();
    await seekReady();
    const retry = container.querySelector<HTMLButtonElement>('[aria-label="Retry continuation video 1"]');
    expect(retry).not.toBeNull();
    await act(async () => retry?.click());
    expect(selected).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    await advance(2020);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith('choice');
  });

  it('offers a working retry during an unmuted answer reveal', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    await act(async () => root.render(
      <CuePane
        videoUrl="blob:test" clip={{ start: 10, end: 12 }} phase="revealing" replayEnabled
        playbackRate={1} promptMask={defaultSettings} canReveal={false} canReplayPrompt={false}
        canReplayFullAnswer={false} canRestartCourse={false} canStartNext={false}
        onClipEnded={ended} onRequestFile={vi.fn()} onReplay={vi.fn()} onReplayFullAnswer={vi.fn()}
        onReveal={vi.fn()} onRestartCourse={vi.fn()} onStartNext={vi.fn()}
      />
    ));
    await seekReady();
    const retry = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Retry playback');
    expect(retry).toBeDefined();
    await act(async () => retry?.click());
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    await advance(2020);
    expect(ended).toHaveBeenCalledTimes(1);
  });
});
