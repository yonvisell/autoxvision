import { useEffect, useRef, useState } from 'react';
import type { Clip, Settings } from '../types';

type PromptMaskSettings = Pick<
  Settings,
  | 'promptBlurEnabled'
  | 'promptBlurStrength'
  | 'promptBlurHeight'
  | 'promptFadeEnabled'
  | 'promptFadeLevel'
  | 'promptFadeHeight'
>;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

type CuePaneProps = {
  videoUrl: string | null;
  clip: Clip | null;
  phase: 'idle' | 'cueDelay' | 'cuePlaying' | 'answering' | 'revealing' | 'nextReady';
  replayEnabled: boolean;
  playbackRate: number;
  promptMask: PromptMaskSettings;
  canReveal: boolean;
  canReplayPrompt: boolean;
  canReplayFullAnswer: boolean;
  canRestartCourse: boolean;
  canStartNext: boolean;
  onClipEnded: () => void;
  onRequestFile: () => void;
  onReplay: () => void;
  onReplayFullAnswer: () => void;
  onReveal: () => void;
  onRestartCourse: () => void;
  onStartNext: () => void;
};

export function CuePane({
  videoUrl,
  clip,
  phase,
  replayEnabled,
  playbackRate,
  promptMask,
  canReveal,
  canReplayPrompt,
  canReplayFullAnswer,
  canRestartCourse,
  canStartNext,
  onClipEnded,
  onRequestFile,
  onReplay,
  onReplayFullAnswer,
  onReveal,
  onRestartCourse,
  onStartNext
}: CuePaneProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const endedRef = useRef(onClipEnded);
  const [playError, setPlayError] = useState('');
  const showVideo = Boolean(videoUrl && clip && (phase === 'cuePlaying' || phase === 'revealing'));
  const isReveal = phase === 'revealing';
  const showPromptBlur =
    phase === 'cuePlaying' &&
    promptMask.promptBlurEnabled &&
    promptMask.promptBlurStrength > 0 &&
    promptMask.promptBlurHeight > 0;
  const showPromptFade =
    phase === 'cuePlaying' &&
    promptMask.promptFadeEnabled &&
    promptMask.promptFadeLevel > 0 &&
    promptMask.promptFadeHeight > 0;
  const blackoutText = phase === 'idle' ? 'Choose a video to begin' : phase === 'nextReady' ? 'Click for next prompt' : '';

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
    video.playbackRate = playbackRate;
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
  }, [clip, playbackRate, showVideo, videoUrl]);

  useEffect(() => {
    const video = videoRef.current as FrameCallbackVideo | null;
    const canvas = blurCanvasRef.current;
    if (!video || !canvas || !clip || !showPromptBlur) {
      return undefined;
    }

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      return undefined;
    }

    let stopped = false;
    let animationFrame = 0;
    let videoFrame: number | null = null;

    const schedule = () => {
      if (stopped) {
        return;
      }
      if (video.requestVideoFrameCallback) {
        videoFrame = video.requestVideoFrameCallback(drawFrame);
      } else {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    };

    const drawFrame = () => {
      if (stopped) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const resolutionScale = Math.min(1, Math.max(0.5, window.devicePixelRatio / 2));
      const width = Math.max(1, Math.round(bounds.width * resolutionScale));
      const height = Math.max(1, Math.round(bounds.height * resolutionScale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      }

      schedule();
    };

    drawFrame();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      if (videoFrame !== null && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(videoFrame);
      }
    };
  }, [clip, showPromptBlur, videoUrl]);

  const handleClick = () => {
    if (!videoUrl) {
      onRequestFile();
      return;
    }
    if (phase === 'nextReady' && canStartNext) {
      onStartNext();
      return;
    }
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
      <button
        className="cue-stage"
        type="button"
        onClick={handleClick}
        title={videoUrl ? 'Click to replay the prompt when replay is enabled' : 'Choose a local video'}
      >
        {videoUrl ? (
          <video ref={videoRef} src={videoUrl} playsInline muted={phase === 'cuePlaying'} preload="metadata" />
        ) : null}
        {showPromptBlur ? (
          <canvas
            ref={blurCanvasRef}
            className="prompt-mask prompt-mask-blur"
            aria-hidden="true"
            style={{
              clipPath: `inset(${100 - promptMask.promptBlurHeight}% 0 0 0)`,
              filter: `blur(${promptMask.promptBlurStrength}px)`
            }}
          />
        ) : null}
        {showPromptFade ? (
          <span
            className="prompt-mask prompt-mask-fade"
            aria-hidden="true"
            style={{
              height: `${promptMask.promptFadeHeight}%`,
              backgroundColor: `rgba(0, 0, 0, ${promptMask.promptFadeLevel / 100})`
            }}
          />
        ) : null}
        {!showVideo ? (
          <div className="blackout">
            {blackoutText ? (
              <span className="blackout-copy">
                <span>{blackoutText}</span>
                {phase === 'nextReady' ? <small>(key: space)</small> : null}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
      <div className="cue-actions">
        <button
          className="cue-action cue-action-secondary"
          type="button"
          onClick={onReplay}
          disabled={!videoUrl || (!canStartNext && !canReplayPrompt)}
          title={canStartNext ? 'Start the next prompt' : 'Replay the prompt clip before choosing'}
        >
          {canStartNext ? 'Next prompt' : 'Replay prompt (R)'}
        </button>
        {canReplayFullAnswer ? (
          <button
            className="cue-action cue-action-secondary"
            type="button"
            onClick={onReplayFullAnswer}
            title="Replay the complete prompt-through-answer sequence"
          >
            Replay full answer
          </button>
        ) : null}
        {canRestartCourse ? (
          <button
            className="cue-action cue-action-secondary"
            type="button"
            onClick={onRestartCourse}
            disabled={!videoUrl}
            title="Restart sequential or mental-lap practice from the course start"
          >
            Course start (S)
          </button>
        ) : null}
        <button
          className="cue-action cue-action-primary"
          type="button"
          onClick={onReveal}
          disabled={!videoUrl || !canReveal}
          title="Reveal and play the correct continuation"
        >
          Show answer (A)
        </button>
        {playError ? <span className="inline-warn">{playError}</span> : null}
      </div>
    </section>
  );
}
