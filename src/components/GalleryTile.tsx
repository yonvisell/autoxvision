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
  onSequenceClipEnded: (id: string) => void;
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
  onSelect,
  onSequenceClipEnded
}: GalleryTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const [playError, setPlayError] = useState('');
  const retryPlaybackRef = useRef<(() => void) | null>(null);
  const sequenceEndedRef = useRef(onSequenceClipEnded);
  const mountVideo = !disabled && (playback !== 'sequence' || isSequenceActive);
  sequenceEndedRef.current = onSequenceClipEnded;
  const assignVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      if (videoRef.current && videoRef.current !== element) {
        videoRef.current.pause();
      }
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
    setPlayError('');

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
  }, [allLoopCycle, item.clip.start, item.id, mountVideo, onAllLoopReady, playback, playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playback === 'allLoop') {
      return undefined;
    }

    let frame = 0;
    let active = true;
    let started = false;
    let loopTimer: number | null = null;
    let startupTimer: number | null = null;
    let wallStartMs = 0;
    const shouldPlay = (playback === 'hover' && hovered) || (playback === 'sequence' && isSequenceActive);
    applyNativePlaybackRate(video, playbackRate);
    video.pause();
    setClipReady(false);
    setPlayError('');

    let tick: () => void;
    const restartLoop = () => {
      if (!active || !shouldPlay || disabled) {
        return;
      }
      video.currentTime = item.clip.start;
      started = false;
      setClipReady(false);
      armStartupTimer();
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
          if (playback === 'sequence') {
            sequenceEndedRef.current(item.id);
          }
        }
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const startAtAssignedTime = async () => {
      if (!active || started || video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      started = true;
      setClipReady(true);
      if (shouldPlay && !disabled) {
        try {
          await video.play();
          if (!active) {
            return;
          }
          if (startupTimer !== null) window.clearTimeout(startupTimer);
          setPlayError('');
          wallStartMs = performance.now();
          frame = window.requestAnimationFrame(tick);
        } catch {
          if (active) {
            started = false;
            setPlayError('Tap to retry playback');
          }
        }
      }
    };

    const seekToAssignedTime = () => {
      if (!active || video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return;
      }
      if (Math.abs(video.currentTime - item.clip.start) <= 0.015) {
        void startAtAssignedTime();
        return;
      }
      video.currentTime = item.clip.start;
    };

    const handleSeeked = () => {
      if (Math.abs(video.currentTime - item.clip.start) <= 0.05) {
        void startAtAssignedTime();
      }
    };

    const armStartupTimer = () => {
      if (startupTimer !== null) window.clearTimeout(startupTimer);
      if (shouldPlay) {
        startupTimer = window.setTimeout(() => {
          if (active) setPlayError('Video is still loading. Tap to retry');
        }, 10000);
      }
    };
    retryPlaybackRef.current = () => {
      started = false;
      setPlayError('');
      armStartupTimer();
      seekToAssignedTime();
    };

    video.addEventListener('loadedmetadata', seekToAssignedTime);
    video.addEventListener('loadeddata', handleSeeked);
    video.addEventListener('canplay', handleSeeked);
    video.addEventListener('seeked', handleSeeked);
    armStartupTimer();
    seekToAssignedTime();

    return () => {
      active = false;
      video.pause();
      retryPlaybackRef.current = null;
      window.cancelAnimationFrame(frame);
      if (loopTimer !== null) {
        window.clearTimeout(loopTimer);
      }
      if (startupTimer !== null) window.clearTimeout(startupTimer);
      video.removeEventListener('loadedmetadata', seekToAssignedTime);
      video.removeEventListener('loadeddata', handleSeeked);
      video.removeEventListener('canplay', handleSeeked);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [disabled, hovered, isSequenceActive, item.clip.end, item.clip.start, item.id, loopDelay, mountVideo, playback, playbackRate]);

  return (
    <button
      type="button"
      className={`gallery-tile ${isWrong ? 'tile-wrong' : ''} ${isCorrectReveal ? 'tile-correct' : ''}`}
      onClick={() => playError ? retryPlaybackRef.current?.() : onSelect(item.id)}
      disabled={disabled}
      data-gallery-index={index}
      data-correct={item.isCorrect ? 'true' : 'false'}
      data-clip-start={item.clip.start.toFixed(3)}
      data-playback-rate={playbackRate.toFixed(2)}
      data-loop-state={playback === 'allLoop' ? (allLoopPlaying ? 'playing' : 'waiting') : playback}
      title={`Choose video ${index + 1} as the nearest upcoming continuation`}
      onMouseEnter={() => playback === 'hover' && setHovered(true)}
      onMouseLeave={() => playback === 'hover' && setHovered(false)}
      onFocus={() => playback === 'hover' && setHovered(true)}
      onBlur={() => playback === 'hover' && setHovered(false)}
      aria-label={playError ? `Retry continuation video ${index + 1}` : `Choose continuation video ${index + 1}`}
    >
      {mountVideo ? (
        <video
          ref={assignVideoRef}
          src={videoUrl}
          muted
          playsInline
          disablePictureInPicture
          preload={playback === 'hover' ? 'metadata' : 'auto'}
        />
      ) : null}
      {disabled || !clipReady || (playback === 'sequence' && !isSequenceActive) || (playback === 'allLoop' && !allLoopPlaying) ? (
        <span className="tile-blackout" />
      ) : null}
      {playError ? <span className="tile-blackout tile-play-error" role="status">{playError}</span> : null}
      <span className="tile-number">{index + 1}</span>
    </button>
  );
}
