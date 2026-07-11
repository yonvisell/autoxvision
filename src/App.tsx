import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CuePane } from './components/CuePane';
import { Gallery } from './components/Gallery';
import { NotesBox } from './components/NotesBox';
import { ScoreBadge } from './components/ScoreBadge';
import { StatusLine } from './components/StatusLine';
import { isVideoLongEnough, maxForwardGapLimit } from './lib/clipMath';
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
import { createTrial, updateAnchorStats } from './lib/trialEngine';
import { fingerprintFile } from './lib/videoFingerprint';
import { savedPresetPayload } from './lib/presets';
import { nearestAnnotation, upsertAnnotation } from './lib/annotations';
import type { AnchorStats, Annotation, GalleryItem, Settings, Trial } from './types';

type Phase = 'idle' | 'cueDelay' | 'cuePlaying' | 'answering' | 'revealing';
type VideoState = {
  file: File | null;
  url: string | null;
  fingerprint: string;
  duration: number | null;
  error: string;
};

type MissAttempt = {
  id: string;
  trial: Trial;
  resolved: boolean;
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
  const [lowerHeight, setLowerHeight] = useState(260);
  const [choicesReady, setChoicesReady] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const forwardGapLimit = maxForwardGapLimit(video.duration, settings.T);
  const effectiveMinForwardGap = Math.min(settings.minForwardGap, forwardGapLimit);
  const effectiveMaxForwardGap = Math.min(Math.max(settings.maxForwardGap, effectiveMinForwardGap), forwardGapLimit);
  const effectiveTrialSettings = useMemo<Settings>(
    () => ({
      ...settings,
      minForwardGap: effectiveMinForwardGap,
      maxForwardGap: effectiveMaxForwardGap
    }),
    [effectiveMaxForwardGap, effectiveMinForwardGap, settings]
  );

  const canRunTrial = Boolean(
    video.url && video.duration !== null && isVideoLongEnough(video.duration, settings.T, effectiveMinForwardGap) && !video.error
  );
  const revealClip = useMemo(() => {
    if (!trial) {
      return null;
    }
    if (settings.mode === 'random' || settings.mode === 'sequential') {
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

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (video.duration === null) {
      return;
    }
    const limit = maxForwardGapLimit(video.duration, settings.T);
    const minForwardGap = Math.min(settings.minForwardGap, limit);
    const maxForwardGap = Math.min(Math.max(settings.maxForwardGap, minForwardGap), limit);
    if (minForwardGap !== settings.minForwardGap || maxForwardGap !== settings.maxForwardGap) {
      setSettings((previous) => ({
        ...previous,
        minForwardGap,
        maxForwardGap
      }));
    }
  }, [settings.T, settings.maxForwardGap, settings.minForwardGap, video.duration]);

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
    (previousCueStart: number | null = null) => {
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
        previousCueStart
      });
      setTrial(nextTrial);
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

  useEffect(() => {
    if (!video.url || video.duration === null || video.error) {
      return;
    }
    if (!isVideoLongEnough(video.duration, settings.T, effectiveMinForwardGap)) {
      setTrial(null);
      setPhase('idle');
      setStatus({ message: 'Video is too short for the current prompt length and minimum forward gap.', tone: 'warn' });
      return;
    }
    beginTrial(null);
  }, [
    beginTrial,
    settings.T,
    settings.N,
    effectiveMinForwardGap,
    settings.minForwardGap,
    settings.mode,
    settings.t0,
    settings.t1,
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
    setPhase('idle');
    setScore(0);
    setLastCueStart(null);
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
    setSettings((previous) => markCustom(previous, patch));
  };

  const selectPreset = (preset: Settings['preset']) => {
    if (preset === 'saved') {
      if (!savedPreset) {
        setStatus({ message: 'No saved preset yet. Tune controls, then press Save preset.', tone: 'warn' });
        return;
      }
      setSettings((previous) => ({ ...previous, ...savedPreset, preset: 'saved' }));
      return;
    }
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
      timeoutRef.current = window.setTimeout(() => {
        beginTrial(trial?.cueStart ?? null);
      }, 120);
    }
  };

  const handleReplay = () => {
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
      if (item.isCorrect) {
        if (!activeMissId) {
          updateScore(1);
          setStats((previous) => updateAnchorStats(previous, trial.cueStart, true, reactionMs));
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
          setStats((previous) => updateAnchorStats(previous, trial.cueStart, false, reactionMs));
          setMissHistory((previous) =>
            [
              {
                id: `miss-${trial.id}-${Date.now()}`,
                trial,
                resolved: false
              },
              ...previous
            ].slice(0, 8)
          );
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
      if (event.key.toLowerCase() === 'm') {
        setSettings((previous) => markCustom(previous, { soundEnabled: !previous.soundEnabled }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelect, handleReplay, revealAnswer, trial]);

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

      const clipWallMs = (settings.T / Math.max(0.25, settings.playbackRate)) * 1000;
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

      if (active && settings.replayEnabled) {
        setChoicesReady(false);
        setPhase('cueDelay');
        setStatus({ message: '', tone: 'neutral' });
        await wait(cueDelayMs);
        if (active) {
          setPhase('cuePlaying');
        }
      }
    };

    void runSequence();

    return () => {
      active = false;
    };
  }, [phase, settings.T, settings.galleryDelay, settings.galleryPlayback, settings.mode, settings.playbackRate, settings.replayEnabled, trial]);

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
        return 'Pick what happens next. Choices play one at a time.';
      }
      return 'Pick what happens next.';
    }
    if (phase === 'cueDelay' || phase === 'cuePlaying') {
      return 'Watch the prompt. Choices unlock after blackout.';
    }
    if (phase === 'revealing') {
      return 'Correct answer is highlighted.';
    }
    return '';
  }, [choicesReady, phase, settings.galleryDelay, settings.galleryPlayback, trial]);
  const bottomInstruction =
    video.error || status.message || galleryInstruction || (!video.url ? 'Click the prompt or choose Video to load a local file.' : '');

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
        {video.url ? <video src={video.url} onLoadedMetadata={handleVideoMetadata} onError={handleVideoError} preload="metadata" /> : null}
      </div>
      <input
        ref={fileInputRef}
        className="hidden-file-picker"
        type="file"
        accept="video/*,.mov,.mp4,.m4v,.webm"
        onChange={(event) => handleFileChange(event.currentTarget.files?.[0] ?? null)}
        aria-hidden="true"
        tabIndex={-1}
      />

      <header className="top-bar">
        <ScoreBadge score={score} highScore={highScore} />
        <div className="brand-lockup">
          <span className="cone-mark" aria-hidden="true" />
          <h1>AutoxVision</h1>
        </div>
      </header>

      <section className="main-stage">
        <CuePane
          videoUrl={video.url}
          clip={currentClip}
          phase={phase}
          replayEnabled={settings.replayEnabled}
          playbackRate={settings.playbackRate}
          canReveal={canRevealAnswer}
          onClipEnded={handleCueEnded}
          onRequestFile={requestFile}
          onReplay={handleReplay}
          onReveal={revealAnswer}
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
          duration={video.duration}
          maxForwardGapLimit={forwardGapLimit}
          disabled={panelDisabled}
          collapsed={controlsCollapsed}
          onFileChange={handleFileChange}
          onSettingsChange={updateSettings}
          onPresetChange={selectPreset}
          onSavePreset={handleSavePreset}
          onResetScore={resetScore}
          onToggleCollapsed={() => setControlsCollapsed((previous) => !previous)}
        />
      </section>
      <div className="bottom-help" aria-label="Instructions and hotkeys">
        <span>{bottomInstruction}</span>
        <span>1-8 choose | Space/R replay | P/Enter answer | M mute</span>
      </div>
    </main>
  );
}

export default App;
