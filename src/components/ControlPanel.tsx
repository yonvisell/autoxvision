import type { CSSProperties, ReactNode } from 'react';
import {
  MAX_PLAYBACK_RATE,
  MAX_RESPONSE_GAP_SECONDS,
  MIN_PLAYBACK_RATE,
  clamp,
  resolveCourseEnd
} from '../lib/clipMath';
import { MAX_PROMPT_BLUR_PX } from '../lib/presets';
import type { GalleryPlayback, MentalLapOrder, Mode, Preset, Settings } from '../types';

type ControlPanelProps = {
  settings: Settings;
  videoName: string | null;
  duration: number | null;
  sequentialPosition: number;
  sequentialPositionMax: number;
  disabled: boolean;
  collapsed: boolean;
  onFileChange: (file: File | null) => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onPresetChange: (preset: Preset) => void;
  onSavePreset: () => void;
  onResetScore: () => void;
  onSequentialPositionChange: (position: number) => void;
  onToggleCollapsed: () => void;
};

type RangeFieldProps = {
  label: string;
  value: string;
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  current: number;
  disabled?: boolean;
  title?: string;
  className?: string;
  onChange: (value: number) => void;
};

function RangeField({
  label,
  value,
  ariaLabel,
  min,
  max,
  step,
  current,
  disabled = false,
  title,
  className = '',
  onChange
}: RangeFieldProps) {
  const boundedCurrent = clamp(current, min, max);
  const rangeStyle = {
    '--range-value': `${((boundedCurrent - min) / Math.max(step, max - min)) * 100}%`
  } as CSSProperties;

  return (
    <label className={`control-field ${className}`.trim()} title={title}>
      <span className="control-caption">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <input
        className="range-input"
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={boundedCurrent}
        style={rangeStyle}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

type DualRangeFieldProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
  disabled?: boolean;
  title?: string;
  action?: ReactNode;
  onLowChange: (value: number) => void;
  onHighChange: (value: number) => void;
};

function DualRangeField({
  label,
  value,
  min,
  max,
  step,
  low,
  high,
  lowLabel,
  highLabel,
  disabled = false,
  title,
  action,
  onLowChange,
  onHighChange
}: DualRangeFieldProps) {
  const boundedLow = clamp(low, min, max);
  const boundedHigh = clamp(high, boundedLow, max);
  const span = Math.max(step, max - min);
  const rangeStyle = {
    '--range-min': `${((boundedLow - min) / span) * 100}%`,
    '--range-max': `${((boundedHigh - min) / span) * 100}%`
  } as CSSProperties;

  return (
    <div className="control-field dual-range-field" title={title}>
      <span className="control-caption">
        <span>{label}</span>
        <span className="control-value-group">
          <strong>{value}</strong>
          {action}
        </span>
      </span>
      <div
        className={`dual-range${boundedLow >= boundedHigh - step ? ' handles-touching' : ''}${
          disabled ? ' disabled-range' : ''
        }`}
        style={rangeStyle}
      >
        <input
          className="dual-range-low"
          aria-label={lowLabel}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedLow}
          disabled={disabled}
          onChange={(event) => onLowChange(Number(event.currentTarget.value))}
        />
        <input
          className="dual-range-high"
          aria-label={highLabel}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedHigh}
          disabled={disabled}
          onChange={(event) => onHighChange(Number(event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

export function ControlPanel({
  settings,
  videoName,
  duration,
  sequentialPosition,
  sequentialPositionMax,
  disabled,
  collapsed,
  onFileChange,
  onSettingsChange,
  onPresetChange,
  onSavePreset,
  onResetScore,
  onSequentialPositionChange,
  onToggleCollapsed
}: ControlPanelProps) {
  const applyCustom = (patch: Partial<Settings>) => onSettingsChange(patch);
  const galleryControlsInactive = settings.mode === 'mentalLap';
  const loopDelayInactive = galleryControlsInactive || settings.galleryPlayback === 'sequence';
  const sequentialPositionInactive = settings.mode !== 'sequential';
  const courseStart = duration === null ? 0 : clamp(settings.t0, 0, duration);
  const courseEnd = duration === null ? 0 : resolveCourseEnd(duration, courseStart, settings.t1);
  const courseRangeDisabled = disabled || duration === null || duration <= 0;
  const positionMax = Math.max(courseStart, sequentialPositionMax);

  const setMinForwardGap = (value: number) => {
    const minForwardGap = clamp(value, 0, MAX_RESPONSE_GAP_SECONDS);
    applyCustom({ minForwardGap, maxForwardGap: Math.max(settings.maxForwardGap, minForwardGap) });
  };

  const setMaxForwardGap = (value: number) => {
    const maxForwardGap = clamp(value, 0, MAX_RESPONSE_GAP_SECONDS);
    applyCustom({ minForwardGap: Math.min(settings.minForwardGap, maxForwardGap), maxForwardGap });
  };

  const setCourseStart = (value: number) => {
    applyCustom({ t0: Math.min(courseEnd, Math.max(0, value)) });
  };

  const setCourseEnd = (value: number) => {
    if (duration === null) {
      return;
    }
    const nextEnd = Math.max(courseStart, Math.min(duration, value));
    applyCustom({ t1: Math.abs(nextEnd - duration) < 0.05 ? null : nextEnd });
  };

  if (collapsed) {
    return (
      <aside className="control-panel control-panel-collapsed" aria-label="Controls">
        <button
          type="button"
          className="collapse-tab"
          onClick={onToggleCollapsed}
          title="Expand controls"
          aria-label="Expand controls"
        >
          Controls
        </button>
      </aside>
    );
  }

  return (
    <aside className="control-panel" aria-label="Controls">
      <button
        type="button"
        className="panel-collapse-button"
        onClick={onToggleCollapsed}
        title="Collapse controls"
        aria-label="Collapse controls"
      >
        Collapse
      </button>

      <div className="file-control inline-control">
        <span>Video</span>
        <label className="file-picker" title={videoName ?? 'Choose a local course video'}>
          <input
            type="file"
            accept="video/*,.mov,.mp4,.m4v,.webm"
            aria-label="Choose course video"
            onChange={(event) => {
              onFileChange(event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = '';
            }}
          />
          <span className="file-picker-action">Choose</span>
          <span className="file-picker-name">{videoName ?? 'No video loaded'}</span>
        </label>
      </div>

      <select
        className="mode-select"
        value={settings.mode}
        disabled={disabled}
        aria-label="Session mode"
        title="Choose how prompt locations advance through the course"
        onChange={(event) => applyCustom({ mode: event.currentTarget.value as Mode })}
      >
        <option value="random">Random recall mode</option>
        <option value="sequential">Sequential recall mode</option>
        <option value="weakSpots">Weak spots mode</option>
        <option value="mentalLap">Mental lap mode</option>
      </select>

      <div className="quick-controls">
        <RangeField
          label="Prompt length"
          value={`${settings.T.toFixed(2)}s`}
          ariaLabel="Displayed prompt length"
          min={0.25}
          max={26}
          step={0.05}
          current={settings.T}
          disabled={disabled}
          title="Displayed duration of each prompt and continuation, independent of playback speed"
          onChange={(T) => applyCustom({ T })}
        />
        <RangeField
          label="Speed"
          value={`${settings.playbackRate.toFixed(2)}x`}
          ariaLabel="Playback speed"
          min={MIN_PLAYBACK_RATE}
          max={MAX_PLAYBACK_RATE}
          step={0.25}
          current={settings.playbackRate}
          disabled={disabled}
          title="Native video playback speed for prompts, choices, and reveals"
          onChange={(playbackRate) => applyCustom({ playbackRate })}
        />
        <RangeField
          label="Choices"
          value={`${settings.N}`}
          ariaLabel="Number of choices"
          min={2}
          max={8}
          step={1}
          current={settings.N}
          disabled={disabled || galleryControlsInactive}
          className={galleryControlsInactive ? 'inactive-control' : ''}
          title={galleryControlsInactive ? 'Not used in mental lap' : 'Number of continuation choices'}
          onChange={(N) => applyCustom({ N })}
        />
        <RangeField
          label="Choice wait"
          value={`${settings.galleryDelay.toFixed(2)}s`}
          ariaLabel="Choice wait"
          min={0}
          max={4}
          step={0.25}
          current={settings.galleryDelay}
          disabled={disabled || galleryControlsInactive}
          className={galleryControlsInactive ? 'inactive-control' : ''}
          title={galleryControlsInactive ? 'Not used in mental lap' : 'Displayed blackout before continuation choices unlock'}
          onChange={(galleryDelay) => applyCustom({ galleryDelay })}
        />
      </div>

      <div className="control-divider">
        <span>Course timing</span>
      </div>

      <RangeField
        label="Sequential position"
        value={`${sequentialPosition.toFixed(1)}s`}
        ariaLabel="Sequential position"
        min={courseStart}
        max={positionMax}
        step={0.1}
        current={sequentialPosition}
        disabled={disabled || sequentialPositionInactive || positionMax <= courseStart}
        className={`sequential-position-control${sequentialPositionInactive ? ' inactive-control' : ''}`}
        title={
          sequentialPositionInactive
            ? 'Available in Sequential recall mode'
            : 'Move the next prompt within the valid part of the course range'
        }
        onChange={onSequentialPositionChange}
      />

      <DualRangeField
        label="Course range"
        value={duration === null ? '--' : `${courseStart.toFixed(1)}-${courseEnd.toFixed(1)}s`}
        min={0}
        max={Math.max(0.1, duration ?? 0.1)}
        step={0.1}
        low={courseStart}
        high={courseEnd}
        lowLabel="Course range start"
        highLabel="Course range end"
        disabled={courseRangeDisabled}
        title="Source-video bounds within which each prompt and correct continuation must fit"
        action={
          duration !== null && (courseStart > 0 || settings.t1 !== null) ? (
            <button
              type="button"
              className="inline-reset"
              onClick={() => applyCustom({ t0: 0, t1: null })}
              title="Use the complete video"
              aria-label="Reset course range to full video"
            >
              Full
            </button>
          ) : null
        }
        onLowChange={setCourseStart}
        onHighChange={setCourseEnd}
      />

      {settings.mode === 'mentalLap' ? (
        <div className="mental-order-control">
          <span>Mental lap order</span>
          <div className="segmented mental-order-segmented" aria-label="Mental lap order">
            {(['sequential', 'random'] as MentalLapOrder[]).map((value) => (
              <button
                type="button"
                key={value}
                className={settings.mentalLapOrder === value ? 'active' : ''}
                disabled={disabled}
                aria-pressed={settings.mentalLapOrder === value}
                onClick={() => applyCustom({ mentalLapOrder: value })}
                title={
                  value === 'sequential'
                    ? 'Advance through the course in order'
                    : 'Choose an independent random prompt start each trial'
                }
              >
                {value === 'sequential' ? 'Sequential' : 'Random starts'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <DualRangeField
          label="Answer gap"
          value={`${settings.minForwardGap.toFixed(2)}-${settings.maxForwardGap.toFixed(2)}s`}
          min={0}
          max={MAX_RESPONSE_GAP_SECONDS}
          step={0.25}
          low={settings.minForwardGap}
          high={settings.maxForwardGap}
          lowLabel="Minimum answer gap"
          highLabel="Maximum answer gap"
          disabled={disabled}
          title="Source-video time skipped between the prompt end and correct continuation start"
          onLowChange={setMinForwardGap}
          onHighChange={setMaxForwardGap}
        />
      )}

      <div className="control-divider">
        <span>Choice playback</span>
      </div>

      <div className="playback-controls">
        <div
          className={`segmented${galleryControlsInactive ? ' inactive-control' : ''}`}
          aria-label="Gallery playback"
        >
          {(['sequence', 'hover', 'allLoop'] as GalleryPlayback[]).map((value) => (
            <button
              type="button"
              key={value}
              className={settings.galleryPlayback === value ? 'active' : ''}
              disabled={disabled || galleryControlsInactive}
              onClick={() => applyCustom({ galleryPlayback: value })}
              title={
                value === 'sequence'
                  ? 'Play continuation choices one at a time; uses one active video decoder'
                  : value === 'allLoop'
                    ? 'Prepare, start, and loop every continuation choice together'
                    : 'Play a continuation choice while it is hovered or focused'
              }
            >
              {value === 'sequence' ? 'One-by-one' : value === 'allLoop' ? 'All play' : 'Hover'}
            </button>
          ))}
        </div>
        <div className="compact-options-row">
          <label
            className={`loop-pause-control${loopDelayInactive ? ' inactive-control' : ''}`}
            title={
              loopDelayInactive
                ? 'Used by Hover and All play'
                : 'Pause after a choice reaches its end before looping'
            }
          >
            <span>Loop pause</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={settings.galleryLoopDelay}
              disabled={disabled || loopDelayInactive}
              aria-label="Gallery loop pause in seconds"
              onChange={(event) =>
                applyCustom({ galleryLoopDelay: clamp(Number(event.currentTarget.value) || 0, 0, 10) })
              }
            />
            <span>s</span>
          </label>
          <div className="check-row">
            <label title="Allow prompt replay while answering">
              <input
                type="checkbox"
                checked={settings.replayEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ replayEnabled: event.currentTarget.checked })}
              />
              Replay
            </label>
            <label
              className={galleryControlsInactive ? 'inactive-control' : ''}
              title={galleryControlsInactive ? 'Not used in mental lap' : 'Play correct and wrong feedback tones'}
            >
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                disabled={disabled || galleryControlsInactive}
                onChange={(event) => applyCustom({ soundEnabled: event.currentTarget.checked })}
              />
              Sound
            </label>
          </div>
        </div>
      </div>

      <div className="control-divider">
        <span>Prompt mask</span>
      </div>

      <section className="prompt-mask-controls" aria-label="Prompt masking">
        <div className="prompt-mask-row">
          <label className="prompt-mask-toggle" title="Blur upward from the bottom of the prompt video">
            <input
              type="checkbox"
              checked={settings.promptBlurEnabled}
              disabled={disabled}
              onChange={(event) => applyCustom({ promptBlurEnabled: event.currentTarget.checked })}
            />
            Blur
          </label>
          <RangeField
            label="Strength"
            value={`${settings.promptBlurStrength.toFixed(0)}px`}
            ariaLabel="Prompt blur strength"
            min={0}
            max={MAX_PROMPT_BLUR_PX}
            step={1}
            current={settings.promptBlurStrength}
            disabled={disabled || !settings.promptBlurEnabled}
            className={!settings.promptBlurEnabled ? 'inactive-control' : ''}
            onChange={(promptBlurStrength) => applyCustom({ promptBlurStrength })}
          />
          <RangeField
            label="Height"
            value={`${settings.promptBlurHeight.toFixed(0)}%`}
            ariaLabel="Prompt blurred height"
            min={0}
            max={100}
            step={1}
            current={settings.promptBlurHeight}
            disabled={disabled || !settings.promptBlurEnabled}
            className={!settings.promptBlurEnabled ? 'inactive-control' : ''}
            title="Lower-frame height; it can be aligned manually with a stable horizon"
            onChange={(promptBlurHeight) => applyCustom({ promptBlurHeight })}
          />
        </div>
        <div className="prompt-mask-row">
          <label className="prompt-mask-toggle" title="Darken upward from the bottom of the prompt video">
            <input
              type="checkbox"
              checked={settings.promptFadeEnabled}
              disabled={disabled}
              onChange={(event) => applyCustom({ promptFadeEnabled: event.currentTarget.checked })}
            />
            Fade
          </label>
          <RangeField
            label="Black"
            value={`${settings.promptFadeLevel.toFixed(0)}%`}
            ariaLabel="Prompt black level"
            min={0}
            max={100}
            step={1}
            current={settings.promptFadeLevel}
            disabled={disabled || !settings.promptFadeEnabled}
            className={!settings.promptFadeEnabled ? 'inactive-control' : ''}
            onChange={(promptFadeLevel) => applyCustom({ promptFadeLevel })}
          />
          <RangeField
            label="Height"
            value={`${settings.promptFadeHeight.toFixed(0)}%`}
            ariaLabel="Prompt faded height"
            min={0}
            max={100}
            step={1}
            current={settings.promptFadeHeight}
            disabled={disabled || !settings.promptFadeEnabled}
            className={!settings.promptFadeEnabled ? 'inactive-control' : ''}
            title="Lower-frame height; it can be aligned manually with a stable horizon"
            onChange={(promptFadeHeight) => applyCustom({ promptFadeHeight })}
          />
        </div>
      </section>

      <div className="preset-footer">
        <div className="preset-divider" aria-hidden="true" />
        <div className="preset-row">
          <button
            type="button"
            className={`reset-score${galleryControlsInactive ? ' inactive-control' : ''}`}
            onClick={onResetScore}
            disabled={disabled || galleryControlsInactive}
            title={galleryControlsInactive ? 'Score is not used in mental lap' : 'Reset this session score'}
          >
            Reset score
          </button>
          <select
            value={settings.preset}
            disabled={disabled}
            aria-label="Preset"
            title="Apply a built-in or saved control preset"
            onChange={(event) => onPresetChange(event.currentTarget.value as Preset)}
          >
            <option value="custom">Custom preset</option>
            <option value="saved">Saved preset</option>
            <option value="encoding">Encoding preset</option>
            <option value="learning">Learning preset</option>
            <option value="performance">Performance preset</option>
            <option value="pressure">Pressure preset</option>
          </select>
          <button
            type="button"
            className="save-preset"
            disabled={disabled}
            onClick={onSavePreset}
            title="Save the current controls as your reusable preset"
          >
            Save preset
          </button>
        </div>
      </div>
    </aside>
  );
}
