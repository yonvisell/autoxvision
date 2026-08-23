import { useEffect, useRef, useState } from 'react';
import type { GalleryItem, GalleryPlayback } from '../types';

type GalleryTileProps = {
  item: GalleryItem;
  index: number;
  videoUrl: string;
  playback: GalleryPlayback;
  isSequenceActive: boolean;
  playbackRate: number;
  loopDelay: number;
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
  playbackRate,
  loopDelay,
  disabled,
  isWrong,
  isCorrectReveal,
  onSelect
}: GalleryTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [clipReady, setClipReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    let frame = 0;
    let active = true;
    let started = false;
    let loopTimer: number | null = null;
    const shouldPlay = playback === 'allLoop' || (playback === 'hover' && hovered) || (playback === 'sequence' && isSequenceActive);
    video.playbackRate = playbackRate;
    video.pause();
    setClipReady(false);

    let tick: () => void;
    const restartLoop = () => {
      if (!active || !shouldPlay || disabled) {
        return;
      }
      video.currentTime = item.clip.start;
      void video.play().catch(() => undefined);
      frame = window.requestAnimationFrame(tick);
    };

    tick = () => {
      if (!active) {
        return;
      }
      if (video.currentTime >= item.clip.end - 0.015) {
        if (playback === 'allLoop' || (playback === 'hover' && shouldPlay)) {
          video.pause();
          if (loopDelay > 0) {
            loopTimer = window.setTimeout(restartLoop, loopDelay * 1000);
          } else {
            restartLoop();
          }
        } else {
          video.pause();
          video.currentTime = item.clip.end;
        }
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const startAtAssignedTime = () => {
      if (!active || started) {
        return;
      }
      started = true;
      setClipReady(true);
      if (shouldPlay && !disabled) {
        void video.play().catch(() => undefined);
        frame = window.requestAnimationFrame(tick);
      }
    };

    const seekToAssignedTime = () => {
      if (!active || video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return;
      }
      if (Math.abs(video.currentTime - item.clip.start) <= 0.015) {
        startAtAssignedTime();
        return;
      }
      video.currentTime = item.clip.start;
    };

    const handleSeeked = () => {
      if (Math.abs(video.currentTime - item.clip.start) <= 0.05) {
        startAtAssignedTime();
      }
    };

    video.addEventListener('loadedmetadata', seekToAssignedTime);
    video.addEventListener('seeked', handleSeeked);
    seekToAssignedTime();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      if (loopTimer !== null) {
        window.clearTimeout(loopTimer);
      }
      video.removeEventListener('loadedmetadata', seekToAssignedTime);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [disabled, hovered, isSequenceActive, item.clip.end, item.clip.start, loopDelay, playback, playbackRate]);

  return (
    <button
      type="button"
      className={`gallery-tile ${isWrong ? 'tile-wrong' : ''} ${isCorrectReveal ? 'tile-correct' : ''}`}
      onClick={() => onSelect(item.id)}
      disabled={disabled}
      data-gallery-index={index}
      data-correct={item.isCorrect ? 'true' : 'false'}
      data-clip-start={item.clip.start.toFixed(3)}
      title={`Choose video ${index + 1} as the nearest upcoming continuation`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Choose continuation video ${index + 1}`}
    >
      <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" />
      {!clipReady || (playback === 'sequence' && !isSequenceActive) ? <span className="tile-blackout" /> : null}
      <span className="tile-number">{index + 1}</span>
    </button>
  );
}
