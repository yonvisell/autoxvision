import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { applyNativePlaybackRate, syncMediaToWallClock } from '../lib/mediaPlayback';
import type { GalleryItem, GalleryPlayback } from '../types';
import { GalleryTile } from './GalleryTile';

type GalleryProps = {
  videoUrl: string | null;
  items: GalleryItem[];
  playback: GalleryPlayback;
  activeSequenceIndex: number | null;
  playbackRate: number;
  loopDelay: number;
  instruction: string;
  disabled: boolean;
  hidden: boolean;
  collapsed: boolean;
  wrongIds: Set<string>;
  revealCorrect: boolean;
  misses: Array<{
    id: string;
    label: string;
    resolved: boolean;
    active: boolean;
  }>;
  onRetryMiss: (id: string) => void;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
};

export function Gallery({
  videoUrl,
  items,
  playback,
  activeSequenceIndex,
  playbackRate,
  loopDelay,
  instruction,
  disabled,
  hidden,
  collapsed,
  wrongIds,
  revealCorrect,
  misses,
  onRetryMiss,
  onToggleCollapsed,
  onSelect
}: GalleryProps) {
  const choiceColumns = items.length > 4 ? Math.ceil(items.length / 2) : Math.max(1, items.length);
  const itemSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.clip.start}:${item.clip.end}`).join('|'),
    [items]
  );
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const readyIdsRef = useRef<Set<string>>(new Set());
  const allLoopStartLockedRef = useRef(false);
  const [allLoopCycle, setAllLoopCycle] = useState(0);
  const [allLoopReadyCount, setAllLoopReadyCount] = useState(0);
  const [allLoopPhase, setAllLoopPhase] = useState<'preparing' | 'playing' | 'waiting'>('preparing');

  const registerVideoElement = useCallback((id: string, element: HTMLVideoElement | null) => {
    if (element) {
      videoElementsRef.current.set(id, element);
    } else {
      videoElementsRef.current.delete(id);
    }
  }, []);

  const handleAllLoopReady = useCallback(
    (id: string, cycle: number) => {
      if (cycle !== allLoopCycle || readyIdsRef.current.has(id)) {
        return;
      }
      readyIdsRef.current.add(id);
      setAllLoopReadyCount(readyIdsRef.current.size);
    },
    [allLoopCycle]
  );

  const startAllLoop = useCallback(() => {
    if (allLoopStartLockedRef.current) {
      return;
    }
    const elements = items.map((item) => videoElementsRef.current.get(item.id)).filter(Boolean) as HTMLVideoElement[];
    if (elements.length !== items.length) {
      return;
    }
    allLoopStartLockedRef.current = true;
    elements.forEach((element) => applyNativePlaybackRate(element, playbackRate));
    setAllLoopPhase('playing');
    elements.forEach((element) => {
      void element.play().catch(() => undefined);
    });
  }, [items, playbackRate]);

  useEffect(() => {
    videoElementsRef.current.forEach((element) => element.pause());
    readyIdsRef.current.clear();
    allLoopStartLockedRef.current = false;
    setAllLoopReadyCount(0);
    setAllLoopPhase('preparing');
    setAllLoopCycle((cycle) => cycle + 1);
  }, [itemSignature, playback, playbackRate, videoUrl]);

  useEffect(() => {
    if (
      playback !== 'allLoop' ||
      disabled ||
      allLoopPhase !== 'preparing' ||
      items.length === 0 ||
      allLoopReadyCount !== items.length
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(startAllLoop);

    return () => window.cancelAnimationFrame(frame);
  }, [allLoopPhase, allLoopReadyCount, disabled, items.length, playback, startAllLoop]);

  useEffect(() => {
    if (playback !== 'allLoop' || disabled || allLoopPhase !== 'preparing' || items.length === 0) {
      return undefined;
    }
    const timer = window.setTimeout(startAllLoop, 2000);
    return () => window.clearTimeout(timer);
  }, [allLoopPhase, disabled, items.length, playback, startAllLoop]);

  useEffect(() => {
    if (playback !== 'allLoop' || allLoopPhase !== 'playing' || items.length === 0) {
      return undefined;
    }
    const wallStartMs = performance.now();
    let frame = 0;
    const shortestSourceDuration = Math.min(...items.map((item) => item.clip.end - item.clip.start));
    const wallDurationMs = (shortestSourceDuration / Math.max(0.25, playbackRate)) * 1000;
    const synchronizePlayers = () => {
      const now = performance.now();
      items.forEach((item) => {
        const element = videoElementsRef.current.get(item.id);
        if (element) {
          syncMediaToWallClock(element, item.clip.start, item.clip.end, playbackRate, wallStartMs, now);
        }
      });
      frame = window.requestAnimationFrame(synchronizePlayers);
    };
    frame = window.requestAnimationFrame(synchronizePlayers);
    const timer = window.setTimeout(() => {
      videoElementsRef.current.forEach((element) => element.pause());
      setAllLoopPhase('waiting');
    }, Math.max(1, wallDurationMs));

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [allLoopPhase, items, playback, playbackRate]);

  useEffect(() => {
    if (playback !== 'allLoop' || allLoopPhase !== 'waiting') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      readyIdsRef.current.clear();
      allLoopStartLockedRef.current = false;
      setAllLoopReadyCount(0);
      setAllLoopPhase('preparing');
      setAllLoopCycle((cycle) => cycle + 1);
    }, Math.max(0, loopDelay) * 1000);

    return () => window.clearTimeout(timer);
  }, [allLoopPhase, loopDelay, playback]);

  useEffect(() => {
    if (!disabled || playback !== 'allLoop' || allLoopPhase === 'preparing') {
      return;
    }
    videoElementsRef.current.forEach((element) => element.pause());
    readyIdsRef.current.clear();
    allLoopStartLockedRef.current = false;
    setAllLoopReadyCount(0);
    setAllLoopPhase('preparing');
    setAllLoopCycle((cycle) => cycle + 1);
  }, [allLoopPhase, disabled, playback]);

  if (hidden && collapsed) {
    return (
      <section className="choices choices-collapsed" aria-label="Mental lap choices">
        <button
          type="button"
          className="collapse-tab"
          onClick={onToggleCollapsed}
          title="Expand mental lap panel"
          aria-label="Expand mental lap panel"
        >
          Mental lap
        </button>
      </section>
    );
  }

  if (hidden) {
    return (
      <section className="choices choices-empty choices-mental" aria-label="Answer choices">
        <button
          type="button"
          className="panel-collapse-button choices-collapse-button"
          onClick={onToggleCollapsed}
          title="Collapse mental lap panel"
          aria-label="Collapse mental lap panel"
        >
          Collapse
        </button>
        <div>
          <strong>Mental lap</strong>
          <span>Run the continuation mentally, then press Show answer or Enter.</span>
        </div>
      </section>
    );
  }

  if (!videoUrl || items.length === 0) {
    return (
      <section className="choices choices-empty" aria-label="Answer choices">
        <div>
          <strong>No clips yet</strong>
          <span>Load a video and start a trial.</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="choices"
      aria-label="Answer choices"
      aria-busy={playback === 'allLoop' && !disabled && allLoopPhase === 'preparing'}
    >
      <div className="choices-topline">
        {instruction ? <div className="gallery-instruction">{instruction}</div> : <span />}
        {misses.length > 0 ? (
          <div className="miss-history" aria-label="Miss history">
            <span>Misses</span>
            {misses.map((miss) => (
              <button
                type="button"
                key={miss.id}
                className={`miss-chip${miss.active ? ' active' : ''}${miss.resolved ? ' resolved' : ''}`}
                onClick={() => onRetryMiss(miss.id)}
                title={`Replay missed prompt at ${miss.label}`}
              >
                {miss.resolved ? '✓ ' : ''}
                {miss.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="gallery-strip" style={{ '--choice-columns': choiceColumns } as CSSProperties}>
        {items.map((item, index) => (
          <GalleryTile
            key={item.id}
            item={item}
            index={index}
            videoUrl={videoUrl}
            playback={playback}
            isSequenceActive={playback !== 'sequence' || activeSequenceIndex === index}
            allLoopCycle={allLoopCycle}
            allLoopPlaying={playback === 'allLoop' && allLoopPhase === 'playing'}
            playbackRate={playbackRate}
            loopDelay={loopDelay}
            disabled={disabled}
            isWrong={wrongIds.has(item.id)}
            isCorrectReveal={revealCorrect && item.isCorrect}
            onAllLoopReady={handleAllLoopReady}
            onVideoElement={registerVideoElement}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
