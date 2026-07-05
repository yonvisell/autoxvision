import { useEffect, useRef, useState } from 'react';
import type { GalleryItem, GalleryPlayback } from '../types';

type GalleryTileProps = {
  item: GalleryItem;
  index: number;
  videoUrl: string;
  playback: GalleryPlayback;
  isSequenceActive: boolean;
  disabled: boolean;
  isWrong: boolean;
  isCorrectReveal: boolean;
  onSelect: (id: string) => void;
};

export function GalleryTile({
  item,
  index,
  videoUrl,
  playback,
  isSequenceActive,
  disabled,
  isWrong,
  isCorrectReveal,
  onSelect
}: GalleryTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    let frame = 0;
    let active = true;
    const shouldPlay = playback === 'allLoop' || (playback === 'hover' && hovered) || (playback === 'sequence' && isSequenceActive);
    video.currentTime = item.clip.start;

    const tick = () => {
      if (!active) {
        return;
      }
      if (video.currentTime >= item.clip.end - 0.015) {
        if (playback === 'allLoop' || (playback === 'hover' && shouldPlay)) {
          video.currentTime = item.clip.start;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
          video.currentTime = item.clip.end;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    if (shouldPlay && !disabled) {
      void video.play().catch(() => undefined);
      frame = window.requestAnimationFrame(tick);
    } else {
      video.pause();
      video.currentTime = item.clip.start;
    }

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [disabled, hovered, isSequenceActive, item.clip.end, item.clip.start, playback]);

  return (
    <button
      type="button"
      className={`gallery-tile ${isWrong ? 'tile-wrong' : ''} ${isCorrectReveal ? 'tile-correct' : ''}`}
      onClick={() => onSelect(item.id)}
      disabled={disabled}
      data-gallery-index={index}
      data-correct={item.isCorrect ? 'true' : 'false'}
      data-clip-start={item.clip.start.toFixed(3)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Gallery clip ${index + 1}`}
    >
      <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" />
      {playback === 'sequence' && !isSequenceActive ? <span className="tile-blackout" /> : null}
      <span className="tile-number">{index + 1}</span>
    </button>
  );
}
