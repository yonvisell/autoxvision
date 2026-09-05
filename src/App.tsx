import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CuePane } from './components/CuePane';
import { Gallery } from './components/Gallery';
import { NotesBox } from './components/NotesBox';
import { ScoreBadge } from './components/ScoreBadge';
import { StatusLine } from './components/StatusLine';
import {
  clampT1,
  isVideoLongEnough,
  MAX_RESPONSE_GAP_SECONDS,
  maxForwardGapLimit,
  sourceDurationForPlayback
} from './lib/clipMath';
import { applyPreset, defaultSettings, markCustom } from './lib/presets';
import {
  loadAnnotations,
  loadHighScore,
  loadSavedPreset,
  loadSettings,
  loadStats,
  saveAnnotations,
  saveHighScore,
  saveSavedPreset,
  saveSettings,
  saveStats
} from './lib/persistence';
import { playTone } from './lib/sounds';
import {
  addMissOnce,
  createTrial,
  isFirstTrialOutcome,
  nextSequentialCueStart,
  updateAnchorStats
} from './lib/trialEngine';
import type { TrialSettings } from './lib/trialEngine';
import { fingerprintFile } from './lib/videoFingerprint';
import { savedPresetPayload } from './lib/presets';
import { nearestAnnotation, upsertAnnotation } from './lib/annotations';
import type { AnchorStats, Annotation, GalleryItem, MissAttempt, Settings, Trial } from './types';

type Phase = 'idle' | 'cueDelay' | 'cuePlaying' | 'answering' | 'revealing' | 'nextReady';
type VideoState = {
  file: File | null;
  url: string | null;
  fingerprint: string;
  duration: number | null;
  error: string;
};

const cueDelayMs = 250;
const correctDelayMs = 280;
const minLowerHeight = 170;
const maxLowerHeight = 470;

function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(defaultSettings));
  const [savedPreset, setSavedPreset] = useState<Partial<Settings> | null>(() => loadSavedPreset());
  const [video, setVideo] = useState<VideoState>({
    file: null,
    url: null,
    fingerprint: '',
    duration: null,
    error: ''
  });
  const [trial, setTrial] = useState<Trial | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [noteText, setNoteText] = useState('');
  const [stats, setStats] = useState<Record<string, AnchorStats>>({});
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [missHistory, setMissHistory] = useState<MissAttempt[]>([]);
  const [activeMissId, setActiveMissId] = useState<string | null>(null);
  const [lowerHeight, setLowerHeight] = useState(300);
  const [choicesReady, setChoicesReady] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(true);
  const [galleryCollapsed, setGalleryCollapsed] = useState(false);
  const [status, setStatus] = useState<{ message: string; tone: 'neutral' | 'good' | 'bad' | 'warn' }>({
    message: 'Choose a local course-walk video to begin.',
    tone: 'neutral'
  });
  const [lastCueStart, setLastCueStart] = useState<number | null>(null);
  const [gallerySequenceIndex, setGallerySequenceIndex] = useState<number | null>(null);
  const reactionStartRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);
  const statsRef = useRef<Record<string, AnchorStats>>({});
  const committedOutcomeTrialIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceClipDuration = sourceDurationForPlayback(settings.T, settings.playbackRate);
  const forwardGapLimit = Math.min(MAX_RESPONSE_GAP_SECONDS, maxForwardGapLimit(video.duration, sourceClipDuration));
  const effectiveMinForwardGap = Math.min(settings.minForwardGap, forwardGapLimit);
  const effectiveMaxForwardGap = Math.min(Math.max(settings.maxForwardGap, effectiveMinForwardGap), forwardGapLimit);
  const requiredForwardGap = settings.mode === 'mentalLap' ? 0 : effectiveMinForwardGap;
  const effectiveTrialSettings = useMemo<TrialSettings>(
    () => ({
      T: sourceClipDuration,
      N: settings.N,
      mode: settings.mode,
      mentalLapOrder: settings.mentalLapOrder,
      minForwardGap: effectiveMinForwardGap,
      maxForwardGap: effectiveMaxForwardGap,
      t0: settings.t0,
      t1: settings.t1
    }),
    [
      effectiveMaxForwardGap,
      effectiveMinForwardGap,
      settings.N,
      settings.mentalLapOrder,
      settings.mode,
      settings.t0,
      settings.t1,
      sourceClipDuration
    ]
  );

  const canRunTrial = Boolean(
    video.url &&
      video.duration !== null &&
      isVideoLongEnough(video.duration, sourceClipDuration, requiredForwardGap) &&
      !video.error
  );
  const revealClip = useMemo(() => {
    if (!trial) {
      return null;
    }
    if (settings.mode === 'random' || settings.mode === 'sequential' || settings.mode === 'mentalLap') {
      return {
        start: trial.cue.start,
        end: trial.answer.end
      };
    }
    return trial.answer;
  }, [settings.mode, trial]);
  const currentClip = phase === 'revealing' ? revealClip : trial?.cue ?? null;
  const canRevealAnswer = Boolean(
    video.url &&
      trial &&
      (phase === 'answering' || (settings.mode === 'mentalLap' && phase !== 'idle' && phase !== 'revealing'))
  );
  const canRestartCourse = Boolean(video.url && canRunTrial && (settings.mode === 'sequential' || settings.mode === 'mentalLap'));
  const canReplayFullAnswer = Boolean(video.url && trial && settings.mode === 'sequential' && phase === 'nextReady');
  const sequentialCueClampGap =
    video.duration !== null && isVideoLongEnough(video.duration, sourceClipDuration, effectiveMaxForwardGap)
      ? effectiveMaxForwardGap
      : effectiveMinForwardGap;
  const sequentialCueStartMax =
    video.duration === null
      ? Math.max(0, settings.t0)
      : clampT1(video.duration, sourceClipDuration, Math.max(0, settings.t0), settings.t1, sequentialCueClampGap);
  const sequentialRangeEnd =
    video.duration === null
      ? Math.max(0, settings.t0)
      : Math.max(settings.t0, Math.min(settings.t1 ?? video.duration, video.duration));
  const sequentialPosition = Math.min(
    sequentialCueStartMax,
    Math.max(settings.t0, trial?.cueStart ?? settings.t0)
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (video.duration === null) {
      return;
    }
    const limit = Math.min(MAX_RESPONSE_GAP_SECONDS, maxForwardGapLimit(video.duration, sourceClipDuration));
    const minForwardGap = Math.min(settings.minForwardGap, limit);
    const maxForwardGap = Math.min(Math.max(settings.maxForwardGap, minForwardGap), limit);
    if (minForwardGap !== settings.minForwardGap || maxForwardGap !== settings.maxForwardGap) {
      setSettings((previous) => ({
        ...previous,
        minForwardGap,
        maxForwardGap
      }));
    }
  }, [settings.maxForwardGap, settings.minForwardGap, sourceClipDuration, video.duration]);

  useEffect(() => {
    if (!video.url) {
      setControlsCollapsed(false);
      return;
    }
    if (settings.mode === 'mentalLap') {
      setGalleryCollapsed(true);
      setControlsCollapsed(true);
      setNotesCollapsed(true);
    }
  }, [settings.mode, video.url]);

  useEffect(() => {
    if (!video.fingerprint) {
      setAnnotations([]);
      setStats({});
      setHighScore(0);
      return;
    }
    setAnnotations(loadAnnotations(video.fingerprint));
    setStats(loadStats(video.fingerprint));
    setHighScore(loadHighScore(video.fingerprint, settings.mode));
    setScore(0);
  }, [settings.mode, video.fingerprint]);

  useEffect(() => {
    if (!video.fingerprint) {
      return;
    }
    saveAnnotations(video.fingerprint, annotations);
  }, [annotations, video.fingerprint]);

  useEffect(() => {
    if (!video.fingerprint) {
      return;
    }
    saveStats(video.fingerprint, stats);
    statsRef.current = stats;
  }, [stats, video.fingerprint]);

  useEffect(() => {
    if (!trial) {
      setNoteText('');
      return;
    }
    const existing = nearestAnnotation(annotations, trial.cueStart);
    setNoteText(existing?.text ?? '');
  }, [annotations, trial]);

  useEffect(() => {
    if (!trial || !video.fingerprint) {
      return undefined;
    }
    const handle = window.setTimeout(() => {
      setAnnotations((previous) => upsertAnnotation(previous, video.fingerprint, trial.cueStart, noteText));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [noteText, trial, video.fingerprint]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (video.url) {
        URL.revokeObjectURL(video.url);
      }
    },
    [video.url]
  );

  const beginTrial = useCallback(
    (previousCueStart: number | null = null, forcedCueStart: number | null = null) => {
      if (!video.duration || !canRunTrial) {
        setTrial(null);
        setPhase('idle');
        return;
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      const nextTrial = createTrial({
        duration: video.duration,
        settings: effectiveTrialSettings,
        stats: statsRef.current,
        previousCueStart,
        forcedCueStart
      });
      setTrial(nextTrial);
      committedOutcomeTrialIdRef.current = null;
      setWrongIds(new Set());
      setActiveMissId(null);
      setChoicesReady(false);
      setLastCueStart(nextTrial.cueStart);
      setPhase('cueDelay');
      setStatus({ message: '', tone: 'neutral' });
      timeoutRef.current = window.setTimeout(() => {
        setPhase('cuePlaying');
      }, cueDelayMs);
    },
    [canRunTrial, effectiveTrialSettings, video.duration]
  );

  const restartCourseStart = useCallback(() => {
    if (settings.mode !== 'sequential' && settings.mode !== 'mentalLap') {
      return;
    }
    beginTrial(null, Math.max(0, effectiveTrialSettings.t0));
    setStatus({ message: 'Restarted at course start.', tone: 'neutral' });
  }, [beginTrial, effectiveTrialSettings.t0, settings.mode]);

  const startNextPrompt = useCallback(() => {
    if (!trial && lastCueStart === null) {
      return;
    }
    if (settings.mode === 'sequential' && trial) {
      const nextCueStart = nextSequentialCueStart(
        trial.answer.start,
        effectiveTrialSettings.t0,
        sequentialCueStartMax
      );
      beginTrial(null, nextCueStart);
      return;
    }
    beginTrial(trial?.cueStart ?? lastCueStart);
  }, [beginTrial, effectiveTrialSettings.t0, lastCueStart, sequentialCueStartMax, settings.mode, trial]);

  useEffect(() => {
    if (!video.url || video.duration === null || video.error) {
      return;
    }
    if (!isVideoLongEnough(video.duration, sourceClipDuration, requiredForwardGap)) {
      setTrial(null);
      setPhase('idle');
      setStatus({ message: 'Video is too short for the current prompt length and minimum forward gap.', tone: 'warn' });
      return;
    }
    const forcedCueStart = settings.mode === 'sequential' ? (lastCueStart ?? effectiveTrialSettings.t0) : null;
    beginTrial(null, forcedCueStart);
  }, [
    beginTrial,
    settings.T,
    settings.N,
    requiredForwardGap,
    settings.minForwardGap,
    settings.mode,
    settings.playbackRate,
    settings.t0,
    settings.t1,
    sourceClipDuration,
    video.duration,
    video.error,
    video.url
  ]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    if (video.url) {
      URL.revokeObjectURL(video.url);
    }
    const url = URL.createObjectURL(file);
    setVideo({
      file,
      url,
      fingerprint: fingerprintFile(file),
      duration: null,
      error: ''
    });
    setTrial(null);
    committedOutcomeTrialIdRef.current = null;
    setPhase('idle');
    setScore(0);
    setLastCueStart(null);
    setSettings((previous) => ({ ...previous, t0: 0, t1: null }));
    setMissHistory([]);
    setActiveMissId(null);
    setChoicesReady(false);
    setStatus({ message: 'Loading video metadata...', tone: 'neutral' });
  };

  const requestFile = () => {
    fileInputRef.current?.click();
  };

  const handleVideoMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const duration = event.currentTarget.duration;
    setVideo((previous) => ({ ...previous, duration, error: '' }));
    setStatus({ message: `Loaded ${video.file?.name ?? 'video'} (${duration.toFixed(1)}s).`, tone: 'good' });
  };

  const handleVideoError = () => {
    setVideo((previous) => ({ ...previous, error: 'Browser cannot load or decode this video.' }));
    setStatus({ message: 'Browser cannot load or decode this video. Try another browser-playable file.', tone: 'bad' });
  };

  const updateSettings = (patch: Partial<Settings>) => {
    if (
      (patch.mode !== undefined && patch.mode !== settings.mode) ||
      (patch.t0 !== undefined && settings.mode === 'sequential')
    ) {
      setLastCueStart(null);
    }
    setSettings((previous) => markCustom(previous, patch));
  };

  const selectPreset = (preset: Settings['preset']) => {
    if (preset === 'saved') {
      if (!savedPreset) {
        setStatus({ message: 'No saved preset yet. Tune controls, then press Save preset.', tone: 'warn' });
        return;
      }
      setLastCueStart(null);
      setSettings((previous) => ({
        ...previous,
        ...savedPreset,
        t0: previous.t0,
        t1: previous.t1,
        preset: 'saved'
      }));
      return;
    }
    setLastCueStart(null);
    setSettings((previous) => applyPreset(previous, preset));
  };

  const handleSavePreset = () => {
    const payload = savedPresetPayload(settings);
    setSavedPreset(payload);
    saveSavedPreset(payload);
    setSettings((previous) => ({ ...previous, preset: 'saved' }));
    setStatus({ message: 'Saved current controls as your preset.', tone: 'good' });
  };

  const updateScore = (delta: number) => {
    setScore((previous) => {
      const next = previous + delta;
      if (video.fingerprint && next > highScore) {
        setHighScore(next);
        saveHighScore(video.fingerprint, settings.mode, next);
      }
      return next;
    });
  };

  const handleCueEnded = () => {
    if (phase === 'cuePlaying') {
      setPhase('answering');
      setChoicesReady(false);
      setStatus(
        settings.mode === 'mentalLap'
          ? { message: 'Run the continuation in your head, then reveal.', tone: 'neutral' }
          : { message: '', tone: 'neutral' }
      );
    }
    if (phase === 'revealing') {
      setPhase('nextReady');
      setChoicesReady(false);
      setGallerySequenceIndex(null);
      setStatus({ message: 'Click the prompt or press Space/R for the next prompt.', tone: 'neutral' });
    }
  };

  const handleReplay = () => {
    if (phase === 'nextReady') {
      startNextPrompt();
      return;
    }
    if (!trial || !settings.replayEnabled || phase === 'idle' || phase === 'cueDelay' || phase === 'cuePlaying') {
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setGallerySequenceIndex(null);
    setChoicesReady(false);
    setPhase('cueDelay');
    setStatus({ message: '', tone: 'neutral' });
    timeoutRef.current = window.setTimeout(() => setPhase('cuePlaying'), cueDelayMs);
  };

  const replayFullAnswer = () => {
    if (!trial || settings.mode !== 'sequential' || phase !== 'nextReady') {
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setGallerySequenceIndex(null);
    setChoicesReady(false);
    setPhase('revealing');
    setStatus({ message: 'Replaying the full prompt and correct continuation.', tone: 'good' });
  };

  const changeSequentialPosition = (position: number) => {
    if (settings.mode !== 'sequential' || !canRunTrial) {
      return;
    }
    const clamped = Math.min(sequentialCueStartMax, Math.max(settings.t0, position));
    beginTrial(null, clamped);
    setStatus({ message: `Sequential practice moved to ${clamped.toFixed(1)}s.`, tone: 'neutral' });
  };

  const revealAnswer = useCallback(() => {
    const canReveal =
      Boolean(trial) &&
      (phase === 'answering' || (settings.mode === 'mentalLap' && phase !== 'idle' && phase !== 'revealing'));
    if (!canReveal) {
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setPhase('revealing');
    setStatus({ message: 'Revealing the immediate continuation.', tone: 'good' });
  }, [phase, settings.mode, trial]);

  const handleSelect = useCallback(
    (id: string) => {
      if (!trial || phase !== 'answering' || !choicesReady || settings.mode === 'mentalLap') {
        return;
      }
      const item = trial.gallery.find((entry) => entry.id === id);
      if (!item) {
        return;
      }

      const reactionMs = performance.now() - reactionStartRef.current;
      const shouldRecordOutcome = !activeMissId && isFirstTrialOutcome(committedOutcomeTrialIdRef.current, trial.id);
      if (shouldRecordOutcome) {
        committedOutcomeTrialIdRef.current = trial.id;
        setStats((previous) => updateAnchorStats(previous, trial.cueStart, item.isCorrect, reactionMs));
      }
      if (item.isCorrect) {
        if (!activeMissId) {
          updateScore(1);
        }
        playTone('correct', settings.soundEnabled);
        if (activeMissId) {
          setMissHistory((previous) =>
            previous.map((miss) => (miss.id === activeMissId ? { ...miss, resolved: true } : miss))
          );
        }
        setStatus({
          message: activeMissId ? 'Miss solved. Watch prompt through answer.' : 'Correct. Watch prompt through answer.',
          tone: 'good'
        });
        timeoutRef.current = window.setTimeout(() => {
          setPhase('revealing');
        }, correctDelayMs);
      } else {
        playTone('wrong', settings.soundEnabled);
        setWrongIds((previous) => new Set(previous).add(id));
        if (!activeMissId) {
          updateScore(-1);
          if (shouldRecordOutcome) {
            setMissHistory((previous) => addMissOnce(previous, trial));
          }
        }
        setStatus({ message: activeMissId ? 'Still not it. Try the miss again.' : 'Not that one. Try again.', tone: 'bad' });
      }
    },
    [activeMissId, choicesReady, phase, settings.mode, settings.soundEnabled, trial]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }
      if (event.key >= '1' && event.key <= '8') {
        const index = Number(event.key) - 1;
        const item: GalleryItem | undefined = trial?.gallery[index];
        if (item) {
          handleSelect(item.id);
        }
      }
      if (event.key === ' ' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleReplay();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        revealAnswer();
      }
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        revealAnswer();
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        revealAnswer();
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        restartCourseStart();
      }
      if (event.key.toLowerCase() === 'm') {
        setSettings((previous) => markCustom(previous, { soundEnabled: !previous.soundEnabled }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelect, handleReplay, restartCourseStart, revealAnswer, trial]);

  useEffect(() => {
    if (phase !== 'answering' || !trial || trial.gallery.length === 0) {
      setGallerySequenceIndex(null);
      setChoicesReady(false);
      return undefined;
    }

    let active = true;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const runSequence = async () => {
      setChoicesReady(false);
      if (settings.mode === 'mentalLap') {
        reactionStartRef.current = performance.now();
        setChoicesReady(true);
        return;
      }
      await wait(settings.galleryDelay * 1000);
      if (!active) {
        return;
      }
      reactionStartRef.current = performance.now();
      setChoicesReady(true);

      if (settings.galleryPlayback !== 'sequence') {
        return;
      }

      const firstClip = trial.gallery[0]?.clip;
      const clipWallMs = firstClip
        ? ((firstClip.end - firstClip.start) / Math.max(0.25, settings.playbackRate)) * 1000
        : settings.T * 1000;
      for (let index = 0; index < trial.gallery.length; index += 1) {
        if (!active) {
          return;
        }
        setGallerySequenceIndex(index);
        await wait(clipWallMs);
        if (!active) {
          return;
        }
        setGallerySequenceIndex(null);
        await wait(settings.galleryDelay * 1000);
      }

      if (active) {
        setGallerySequenceIndex(null);
      }
    };

    void runSequence();

    return () => {
      active = false;
    };
  }, [phase, settings.T, settings.galleryDelay, settings.galleryPlayback, settings.mode, settings.playbackRate, trial]);

  const resetScore = () => {
    setScore(0);
    setStatus({ message: 'Score reset for this session.', tone: 'neutral' });
  };

  const retryMiss = (id: string) => {
    const miss = missHistory.find((entry) => entry.id === id);
    if (!miss) {
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setTrial(miss.trial);
    committedOutcomeTrialIdRef.current = miss.trial.id;
    setWrongIds(new Set());
    setActiveMissId(miss.id);
    setChoicesReady(false);
    setGallerySequenceIndex(null);
    setLastCueStart(miss.trial.cueStart);
    setPhase('cueDelay');
    setStatus({ message: 'Retrying a missed prompt.', tone: 'neutral' });
    timeoutRef.current = window.setTimeout(() => setPhase('cuePlaying'), cueDelayMs);
  };

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resizeLowerDeck = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.buttons !== 1) {
      return;
    }
    const next = window.innerHeight - event.clientY - 10;
    setLowerHeight(Math.min(maxLowerHeight, Math.max(minLowerHeight, next)));
  };

  const cueStart = trial?.cueStart ?? null;
  const panelDisabled = !video.url || video.duration === null || Boolean(video.error);
  const galleryHidden = settings.mode === 'mentalLap';
  const effectiveGalleryCollapsed = galleryHidden && galleryCollapsed;

  const galleryInstruction = useMemo(() => {
    if (!trial) {
      return '';
    }
    if (phase === 'answering') {
      if (!choicesReady) {
        return `Hold the blackout. Choices unlock in ${settings.galleryDelay.toFixed(1)}s.`;
      }
      if (settings.galleryPlayback === 'sequence') {
        return 'Click the nearest upcoming video. (keys: 1, 2, ...) Choices play one at a time.';
      }
      return 'Click the nearest upcoming video. (keys: 1, 2, ...)';
    }
    if (phase === 'cueDelay' || phase === 'cuePlaying') {
      return 'Watch the prompt. Choices unlock after blackout.';
    }
    if (phase === 'revealing') {
      return 'Correct answer is highlighted.';
    }
    if (phase === 'nextReady') {
      return 'Click the prompt or press Space/R for the next prompt.';
    }
    return '';
  }, [choicesReady, phase, settings.galleryDelay, settings.galleryPlayback, trial]);
  const bottomInstruction =
    video.error || status.message || (!video.url ? 'Click the prompt or choose Video to load a local file.' : '');

  return (
    <main
      className={`app-shell${galleryHidden ? ' mental-mode' : ''}${controlsCollapsed ? ' controls-collapsed' : ''}${
        notesCollapsed ? ' notes-collapsed' : ''
      }${
        effectiveGalleryCollapsed ? ' gallery-collapsed' : ''
      }`}
      style={{ '--lower-height': `${lowerHeight}px` } as React.CSSProperties}
    >
      <div className="metadata-loader" aria-hidden="true">
        {video.url && video.duration === null ? (
          <video src={video.url} onLoadedMetadata={handleVideoMetadata} onError={handleVideoError} preload="metadata" />
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        className="hidden-file-picker"
        type="file"
        accept="video/*,.mov,.mp4,.m4v,.webm"
        onChange={(event) => {
          handleFileChange(event.currentTarget.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
        aria-hidden="true"
        tabIndex={-1}
      />

      <header className="top-bar">
        <ScoreBadge score={score} highScore={highScore} />
        <div className="brand-lockup">
          <span className="cone-mark" aria-hidden="true" />
          <h1>AutoxVision</h1>
        </div>
        <a className="help-link" href="./help.html" target="_blank" rel="noreferrer" title="Open instructions" aria-label="Open instructions">
          ?
        </a>
      </header>

      <section className="main-stage">
        <CuePane
          videoUrl={video.url}
          clip={currentClip}
          phase={phase}
          replayEnabled={settings.replayEnabled}
          playbackRate={settings.playbackRate}
          promptMask={settings}
          canReveal={canRevealAnswer}
          canReplayPrompt={settings.replayEnabled && phase === 'answering'}
          canReplayFullAnswer={canReplayFullAnswer}
          canRestartCourse={canRestartCourse}
          canStartNext={phase === 'nextReady'}
          onClipEnded={handleCueEnded}
          onRequestFile={requestFile}
          onReplay={handleReplay}
          onReplayFullAnswer={replayFullAnswer}
          onReveal={revealAnswer}
          onRestartCourse={restartCourseStart}
          onStartNext={startNextPrompt}
        />
        <NotesBox
          value={noteText}
          disabled={!trial || !video.fingerprint}
          cueStart={cueStart}
          collapsed={notesCollapsed}
          onChange={setNoteText}
          onToggleCollapsed={() => setNotesCollapsed((previous) => !previous)}
        />
      </section>

      <StatusLine message={video.error || status.message} tone={video.error ? 'bad' : status.tone} />

      <button
        type="button"
        className="deck-resizer"
        aria-label="Resize prompt and choices"
        title="Drag to resize prompt and choices"
        onPointerDown={startResize}
        onPointerMove={resizeLowerDeck}
      />

      <section className="lower-deck">
        <Gallery
          videoUrl={video.url}
          items={trial?.gallery ?? []}
          playback={settings.galleryPlayback}
          activeSequenceIndex={gallerySequenceIndex}
          playbackRate={settings.playbackRate}
          loopDelay={settings.galleryLoopDelay}
          instruction={galleryInstruction}
          disabled={phase !== 'answering' || !choicesReady}
          hidden={galleryHidden}
          collapsed={effectiveGalleryCollapsed}
          wrongIds={wrongIds}
          revealCorrect={phase === 'revealing'}
          misses={missHistory.map((miss) => ({
            id: miss.id,
            label: `${miss.trial.cueStart.toFixed(1)}s`,
            resolved: miss.resolved,
            active: miss.id === activeMissId
          }))}
          onRetryMiss={retryMiss}
          onToggleCollapsed={() => setGalleryCollapsed((previous) => !previous)}
          onSelect={handleSelect}
        />
        <ControlPanel
          settings={settings}
          videoName={video.file?.name ?? null}
          duration={video.duration}
          maxForwardGapLimit={forwardGapLimit}
          sequentialPosition={sequentialPosition}
          sequentialPositionMax={sequentialRangeEnd}
          disabled={panelDisabled}
          collapsed={controlsCollapsed}
          onFileChange={handleFileChange}
          onSettingsChange={updateSettings}
          onPresetChange={selectPreset}
          onSavePreset={handleSavePreset}
          onResetScore={resetScore}
          onSequentialPositionChange={changeSequentialPosition}
          onToggleCollapsed={() => setControlsCollapsed((previous) => !previous)}
        />
      </section>
      <div className="bottom-help" aria-label="Instructions and hotkeys">
        <span>{bottomInstruction}</span>
        <span>1-8 choose | Space/R prompt/next | A/P/Enter answer | S course start | M mute</span>
      </div>
    </main>
  );
}

export default App;
