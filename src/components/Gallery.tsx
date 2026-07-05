import type { CSSProperties } from 'react';
import type { GalleryItem, GalleryPlayback } from '../types';
import { GalleryTile } from './GalleryTile';

type GalleryProps = {
  videoUrl: string | null;
  items: GalleryItem[];
  playback: GalleryPlayback;
  activeSequenceIndex: number | null;
  instruction: string;
  disabled: boolean;
  hidden: boolean;
  wrongIds: Set<string>;
  revealCorrect: boolean;
  misses: Array<{
    id: string;
    label: string;
    resolved: boolean;
    active: boolean;
  }>;
  onRetryMiss: (id: string) => void;
  onSelect: (id: string) => void;
};

export function Gallery({
  videoUrl,
  items,
  playback,
  activeSequenceIndex,
  instruction,
  disabled,
  hidden,
  wrongIds,
  revealCorrect,
  misses,
  onRetryMiss,
  onSelect
}: GalleryProps) {
  const choiceColumns = items.length > 4 ? Math.ceil(items.length / 2) : Math.max(1, items.length);

  if (hidden) {
    return (
      <section className="choices choices-empty" aria-label="Answer choices">
        <div>
          <strong>Mental lap</strong>
          <span>Choices hidden. Press Space or Show answer when your mental continuation is ready.</span>
        </div>
      </section>
    );
  }

  if (!videoUrl || items.length === 0) {
    return (
      <section className="choices choices-empty" aria-label="Answer choices">
        <div>
          <strong>No clips yet</strong>
          <span>Load a video and start a trial.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="choices" aria-label="Answer choices">
      <div className="choices-topline">
        {instruction ? <div className="gallery-instruction">{instruction}</div> : <span />}
        {misses.length > 0 ? (
          <div className="miss-history" aria-label="Miss history">
            <span>Misses</span>
            {misses.map((miss) => (
              <button
                type="button"
                key={miss.id}
                className={`miss-chip${miss.active ? ' active' : ''}${miss.resolved ? ' resolved' : ''}`}
                onClick={() => onRetryMiss(miss.id)}
                title={`Replay missed prompt at ${miss.label}`}
              >
                {miss.resolved ? '✓ ' : ''}
                {miss.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="gallery-strip" style={{ '--choice-columns': choiceColumns } as CSSProperties}>
        {items.map((item, index) => (
          <GalleryTile
            key={item.id}
            item={item}
            index={index}
            videoUrl={videoUrl}
            playback={playback}
            isSequenceActive={playback !== 'sequence' || activeSequenceIndex === index}
            disabled={disabled}
            isWrong={wrongIds.has(item.id)}
            isCorrectReveal={revealCorrect && item.isCorrect}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
