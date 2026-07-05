import { useEffect, useRef, useState } from 'react';
import type { Clip } from '../types';

type CuePaneProps = {
  videoUrl: string | null;
  clip: Clip | null;
  phase: 'idle' | 'cueDelay' | 'cuePlaying' | 'answering' | 'revealing';
  replayEnabled: boolean;
  onClipEnded: () => void;
  onReplay: () => void;
  onReveal: () => void;
};

export function CuePane({
  videoUrl,
  clip,
  phase,
  replayEnabled,
  onClipEnded,
  onReplay,
  onReveal
}: CuePaneProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const endedRef = useRef(onClipEnded);
  const [playError, setPlayError] = useState('');
  const showVideo = Boolean(videoUrl && clip && (phase === 'cuePlaying' || phase === 'revealing'));
  const isReveal = phase === 'revealing';
  const blackoutText = phase === 'idle' ? 'Choose a video to begin' : '';

  useEffect(() => {
    endedRef.current = onClipEnded;
  }, [onClipEnded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !clip || !showVideo) {
      return undefined;
    }

    let frame = 0;
    let stopped = false;
    setPlayError('');
    video.pause();
    video.currentTime = clip.start;

    const stopIfEnded = () => {
      if (stopped) {
        return;
      }
      if (video.currentTime >= clip.end - 0.015) {
        stopped = true;
        video.pause();
        video.currentTime = clip.end;
        endedRef.current();
        return;
      }
      frame = window.requestAnimationFrame(stopIfEnded);
    };

    const play = async () => {
      try {
        await video.play();
        frame = window.requestAnimationFrame(stopIfEnded);
      } catch {
        setPlayError('Playback is waiting for a click or key press.');
      }
    };

    const onSeeked = () => {
      void play();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    if (Math.abs(video.currentTime - clip.start) < 0.03) {
      void play();
    }

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [clip, showVideo, videoUrl]);

  const handleClick = () => {
    if (phase === 'answering' && replayEnabled) {
      onReplay();
    }
    if (phase === 'answering' && !replayEnabled) {
      return;
    }
    if (phase === 'cueDelay' || phase === 'cuePlaying') {
      return;
    }
  };

  return (
    <section className={`cue-pane ${isReveal ? 'cue-pane-reveal' : ''}`} aria-label="Prompt clip">
      <button className="cue-stage" type="button" onClick={handleClick} title="Click to replay the prompt when replay is enabled">
        {videoUrl ? (
          <video ref={videoRef} src={videoUrl} playsInline muted={phase === 'cuePlaying'} preload="metadata" />
        ) : null}
        {!showVideo ? (
          <div className="blackout">
            {blackoutText ? <span>{blackoutText}</span> : null}
          </div>
        ) : null}
      </button>
      <div className="cue-actions">
        <button
          className="cue-action cue-action-secondary"
          type="button"
          onClick={onReplay}
          disabled={!replayEnabled || !videoUrl || phase !== 'answering'}
        >
          Replay prompt
        </button>
        <button
          className="cue-action cue-action-primary"
          type="button"
          onClick={onReveal}
          disabled={!videoUrl || phase !== 'answering'}
        >
          Show answer
        </button>
        {playError ? <span className="inline-warn">{playError}</span> : null}
      </div>
    </section>
  );
}
