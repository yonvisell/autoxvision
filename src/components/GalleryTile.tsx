import { useEffect, useRef, useState } from 'react';
import type { GalleryItem, GalleryPlayback } from '../types';

type GalleryTileProps = {
  item: GalleryItem;
  index: number;
  videoUrl: string;
  playback: GalleryPlayback;
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
    const shouldPlay = playback === 'loop' || hovered;
    video.currentTime = item.clip.start;

    const tick = () => {
      if (!active) {
        return;
      }
      if (video.currentTime >= item.clip.end - 0.015) {
        if (shouldPlay) {
          video.currentTime = item.clip.start;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
          video.currentTime = item.clip.start;
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
  }, [disabled, hovered, item.clip.end, item.clip.start, playback]);

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
      <span className="tile-number">{index + 1}</span>
    </button>
  );
}
