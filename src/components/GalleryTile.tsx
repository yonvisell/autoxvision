import { useCallback, useEffect, useRef, useState } from 'react';
import { applyNativePlaybackRate, syncMediaToWallClock } from '../lib/mediaPlayback';
import type { GalleryItem, GalleryPlayback } from '../types';

type GalleryTileProps = {
  item: GalleryItem;
  index: number;
  videoUrl: string;
  playback: GalleryPlayback;
  isSequenceActive: boolean;
  allLoopCycle: number;
  allLoopPlaying: boolean;
  playbackRate: number;
  loopDelay: number;
  disabled: boolean;
  isWrong: boolean;
  isCorrectReveal: boolean;
  onAllLoopReady: (id: string, cycle: number) => void;
  onVideoElement: (id: string, element: HTMLVideoElement | null) => void;
  onSelect: (id: string) => void;
};

export function GalleryTile({
  item,
  index,
  videoUrl,
  playback,
  isSequenceActive,
  allLoopCycle,
  allLoopPlaying,
  playbackRate,
  loopDelay,
  disabled,
  isWrong,
  isCorrectReveal,
  onAllLoopReady,
  onVideoElement,
  onSelect
}: GalleryTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const assignVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      onVideoElement(item.id, element);
    },
    [item.id, onVideoElement]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playback !== 'allLoop') {
      return undefined;
    }

    let active = true;
    let announced = false;
    video.pause();
    applyNativePlaybackRate(video, playbackRate);
    setClipReady(false);

    const markReady = () => {
      if (
        !active ||
        announced ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        Math.abs(video.currentTime - item.clip.start) > 0.05
      ) {
        return;
      }
      announced = true;
      setClipReady(true);
      onAllLoopReady(item.id, allLoopCycle);
    };

    const seekToAssignedTime = () => {
      if (!active || video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return;
      }
      if (Math.abs(video.currentTime - item.clip.start) <= 0.015) {
        markReady();
      } else {
        video.currentTime = item.clip.start;
      }
    };

    video.addEventListener('loadedmetadata', seekToAssignedTime);
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('seeked', markReady);
    seekToAssignedTime();

    return () => {
      active = false;
      video.pause();
      video.removeEventListener('loadedmetadata', seekToAssignedTime);
      video.removeEventListener('loadeddata', markReady);
      video.removeEventListener('canplay', markReady);
      video.removeEventListener('seeked', markReady);
    };
  }, [allLoopCycle, item.clip.start, item.id, onAllLoopReady, playback, playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playback === 'allLoop') {
      return undefined;
    }

    let frame = 0;
    let active = true;
    let started = false;
    let loopTimer: number | null = null;
    let wallStartMs = 0;
    const shouldPlay = (playback === 'hover' && hovered) || (playback === 'sequence' && isSequenceActive);
    applyNativePlaybackRate(video, playbackRate);
    video.pause();
    setClipReady(false);

    let tick: () => void;
    const restartLoop = () => {
      if (!active || !shouldPlay || disabled) {
        return;
      }
      video.currentTime = item.clip.start;
      wallStartMs = performance.now();
      void video.play().catch(() => undefined);
      frame = window.requestAnimationFrame(tick);
    };

    tick = () => {
      if (!active) {
        return;
      }
      if (syncMediaToWallClock(video, item.clip.start, item.clip.end, playbackRate, wallStartMs)) {
        if (playback === 'hover' && shouldPlay) {
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
        wallStartMs = performance.now();
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
      data-playback-rate={playbackRate.toFixed(2)}
      data-loop-state={playback === 'allLoop' ? (allLoopPlaying ? 'playing' : 'waiting') : playback}
      title={`Choose video ${index + 1} as the nearest upcoming continuation`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Choose continuation video ${index + 1}`}
    >
      {playback !== 'sequence' || isSequenceActive ? (
        <video
          ref={assignVideoRef}
          src={videoUrl}
          muted
          playsInline
          disablePictureInPicture
          preload={playback === 'allLoop' ? 'auto' : 'metadata'}
        />
      ) : null}
      {disabled || !clipReady || (playback === 'sequence' && !isSequenceActive) || (playback === 'allLoop' && !allLoopPlaying) ? (
        <span className="tile-blackout" />
      ) : null}
      <span className="tile-number">{index + 1}</span>
    </button>
  );
}
