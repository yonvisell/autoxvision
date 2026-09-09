import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GalleryItem } from '../types';
import { Gallery } from './Gallery';

const items: GalleryItem[] = [
  { id: 'first', clip: { start: 10, end: 50 }, isCorrect: true },
  { id: 'second', clip: { start: 120, end: 160 }, isCorrect: false },
  { id: 'third', clip: { start: 240, end: 280 }, isCorrect: false }
];

function renderAllPlay(disabled: boolean) {
  return renderToStaticMarkup(
    <Gallery
      videoUrl="blob:test-video"
      items={items}
      playback="allLoop"
      activeSequenceIndex={null}
      playbackRate={4}
      loopDelay={0.5}
      instruction="Choose"
      disabled={disabled}
      hidden={false}
      collapsed={false}
      wrongIds={new Set()}
      revealCorrect={false}
      misses={[]}
      onRetryMiss={() => undefined}
      onToggleCollapsed={() => undefined}
      onSelect={() => undefined}
    />
  );
}

describe('Gallery all-play preparation', () => {
  it('preloads each choice and exposes the selected playback rate', () => {
    const markup = renderAllPlay(false);
    expect(markup.match(/preload="auto"/g)).toHaveLength(3);
    expect(markup.match(/data-playback-rate="4.00"/g)).toHaveLength(3);
    expect(markup).toContain('aria-busy="true"');
  });

  it('keeps every choice masked until the coordinated start', () => {
    const markup = renderAllPlay(true);
    expect(markup.match(/tile-blackout/g)).toHaveLength(3);
  });

  it('mounts only the active decoder during one-by-one playback', () => {
    const markup = renderToStaticMarkup(
      <Gallery
        videoUrl="blob:test-video"
        items={items}
        playback="sequence"
        activeSequenceIndex={1}
        playbackRate={14}
        loopDelay={0.5}
        instruction="Choose"
        disabled={false}
        hidden={false}
        collapsed={false}
        wrongIds={new Set()}
        revealCorrect={false}
        misses={[]}
        onRetryMiss={() => undefined}
        onToggleCollapsed={() => undefined}
        onSelect={() => undefined}
      />
    );

    expect(markup.match(/<video/g)).toHaveLength(1);
    expect(markup).toContain('data-playback-rate="14.00"');
  });
});
