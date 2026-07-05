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
  onSelect
}: GalleryProps) {
  if (hidden) {
    return (
      <section className="gallery gallery-empty" aria-label="Gallery">
        <div>
          <strong>Mental lap</strong>
          <span>Gallery hidden. Press Space or Reveal answer when your mental continuation is ready.</span>
        </div>
      </section>
    );
  }

  if (!videoUrl || items.length === 0) {
    return (
      <section className="gallery gallery-empty" aria-label="Gallery">
        <div>
          <strong>No clips yet</strong>
          <span>Load a video and start a trial.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="gallery" aria-label="Gallery">
      {instruction ? <div className="gallery-instruction">{instruction}</div> : null}
      <div className="gallery-strip">
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
