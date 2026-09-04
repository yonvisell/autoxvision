import type { CSSProperties } from 'react';
import { MAX_PROMPT_BLUR_PX } from '../lib/presets';
import type { GalleryPlayback, MentalLapOrder, Mode, Preset, Settings } from '../types';

type ControlPanelProps = {
  settings: Settings;
  duration: number | null;
  maxForwardGapLimit: number;
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

export function ControlPanel({
  settings,
  duration,
  maxForwardGapLimit,
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
  const forwardGapMax = Math.max(0, maxForwardGapLimit);
  const minGapPercent = forwardGapMax > 0 ? (Math.min(settings.minForwardGap, forwardGapMax) / forwardGapMax) * 100 : 0;
  const maxGapPercent = forwardGapMax > 0 ? (Math.min(settings.maxForwardGap, forwardGapMax) / forwardGapMax) * 100 : 0;
  const responseGapStyle = {
    '--gap-min': `${minGapPercent}%`,
    '--gap-max': `${maxGapPercent}%`
  } as CSSProperties;
  const setMinForwardGap = (value: number) => {
    const minForwardGap = Math.min(forwardGapMax, Math.max(0, value));
    applyCustom({
      minForwardGap,
      maxForwardGap: Math.min(forwardGapMax, Math.max(settings.maxForwardGap, minForwardGap))
    });
  };
  const setMaxForwardGap = (value: number) => {
    const maxForwardGap = Math.min(forwardGapMax, Math.max(0, value));
    applyCustom({
      minForwardGap: Math.min(settings.minForwardGap, maxForwardGap),
      maxForwardGap
    });
  };

  if (collapsed) {
    return (
      <aside className="control-panel control-panel-collapsed" aria-label="Controls">
        <button type="button" className="collapse-tab" onClick={onToggleCollapsed} title="Expand controls" aria-label="Expand controls">
          Controls
        </button>
      </aside>
    );
  }

  return (
    <aside className="control-panel" aria-label="Controls">
      <button type="button" className="panel-collapse-button" onClick={onToggleCollapsed} title="Collapse controls to a narrow rail" aria-label="Collapse controls">
        Collapse
      </button>

      <label className="file-control inline-control">
        <span>Video</span>
        <input
          type="file"
          accept="video/*,.mov,.mp4,.m4v,.webm"
          onChange={(event) => {
            onFileChange(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        />
      </label>

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
        <label title="Displayed duration of each prompt and continuation, independent of playback speed">
          <span>Prompt length <strong>{settings.T.toFixed(2)}s</strong></span>
          <input
            type="range"
            min="0.25"
            max="26"
            step="0.05"
            value={settings.T}
            disabled={disabled}
            onChange={(event) => applyCustom({ T: Number(event.currentTarget.value) })}
          />
        </label>

        <label className={galleryControlsInactive ? 'inactive-control' : ''} title={galleryControlsInactive ? 'Not used in mental lap' : 'Number of answer choices'}>
          <span>Choices <strong>{settings.N}</strong></span>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            value={settings.N}
            disabled={disabled || galleryControlsInactive}
            onChange={(event) => applyCustom({ N: Number(event.currentTarget.value) })}
          />
        </label>

        <label
          className={galleryControlsInactive ? 'inactive-control' : ''}
          title={galleryControlsInactive ? 'Not used in mental lap' : 'Black pause after the prompt before each answer choice plays'}
        >
          <span>Choice wait <strong>{settings.galleryDelay.toFixed(2)}s</strong></span>
          <input
            type="range"
            min="0"
            max="4"
            step="0.25"
            value={settings.galleryDelay}
            disabled={disabled || galleryControlsInactive}
            onChange={(event) => applyCustom({ galleryDelay: Number(event.currentTarget.value) })}
          />
        </label>

        <label title="Playback speed for prompt and continuation clips">
          <span>Speed <strong>{settings.playbackRate.toFixed(2)}x</strong></span>
          <input
            type="range"
            min="0.25"
            max="10"
            step="0.25"
            value={settings.playbackRate}
            disabled={disabled}
            onChange={(event) => applyCustom({ playbackRate: Number(event.currentTarget.value) })}
          />
        </label>
      </div>

      <details className="prompt-mask-controls">
        <summary title="Mask the lower portion of prompt playback only">Prompt masking</summary>
        <div className="prompt-mask-grid">
          <section className="prompt-mask-effect" aria-label="Prompt blur controls">
            <label className="prompt-mask-toggle" title="Blur upward from the bottom of the prompt video">
              <input
                type="checkbox"
                checked={settings.promptBlurEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ promptBlurEnabled: event.currentTarget.checked })}
              />
              Blur lower frame
            </label>
            <label className={!settings.promptBlurEnabled ? 'inactive-control' : ''}>
              <span>Strength <strong>{settings.promptBlurStrength.toFixed(0)}px</strong></span>
              <input
                aria-label="Prompt blur strength"
                type="range"
                min="0"
                max={MAX_PROMPT_BLUR_PX}
                step="1"
                value={settings.promptBlurStrength}
                disabled={disabled || !settings.promptBlurEnabled}
                onChange={(event) => applyCustom({ promptBlurStrength: Number(event.currentTarget.value) })}
              />
            </label>
            <label className={!settings.promptBlurEnabled ? 'inactive-control' : ''}>
              <span>Blurred height <strong>{settings.promptBlurHeight.toFixed(0)}%</strong></span>
              <input
                aria-label="Prompt blurred height"
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.promptBlurHeight}
                disabled={disabled || !settings.promptBlurEnabled}
                onChange={(event) => applyCustom({ promptBlurHeight: Number(event.currentTarget.value) })}
              />
            </label>
          </section>

          <section className="prompt-mask-effect" aria-label="Prompt fade controls">
            <label className="prompt-mask-toggle" title="Darken upward from the bottom of the prompt video">
              <input
                type="checkbox"
                checked={settings.promptFadeEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ promptFadeEnabled: event.currentTarget.checked })}
              />
              Fade lower frame
            </label>
            <label className={!settings.promptFadeEnabled ? 'inactive-control' : ''}>
              <span>Black level <strong>{settings.promptFadeLevel.toFixed(0)}%</strong></span>
              <input
                aria-label="Prompt black level"
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.promptFadeLevel}
                disabled={disabled || !settings.promptFadeEnabled}
                onChange={(event) => applyCustom({ promptFadeLevel: Number(event.currentTarget.value) })}
              />
            </label>
            <label className={!settings.promptFadeEnabled ? 'inactive-control' : ''}>
              <span>Faded height <strong>{settings.promptFadeHeight.toFixed(0)}%</strong></span>
              <input
                aria-label="Prompt faded height"
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.promptFadeHeight}
                disabled={disabled || !settings.promptFadeEnabled}
                onChange={(event) => applyCustom({ promptFadeHeight: Number(event.currentTarget.value) })}
              />
            </label>
          </section>
        </div>
      </details>

      <div className="playback-controls">
        <div className={`segmented${galleryControlsInactive ? ' inactive-control' : ''}`} aria-label="Gallery playback">
          {(['sequence', 'hover', 'allLoop'] as GalleryPlayback[]).map((value) => (
            <button
              type="button"
              key={value}
              className={settings.galleryPlayback === value ? 'active' : ''}
              disabled={disabled || galleryControlsInactive}
              onClick={() => applyCustom({ galleryPlayback: value })}
              title={
                value === 'sequence'
                  ? 'Play continuation choices one at a time after the wait'
                  : value === 'allLoop'
                    ? 'Loop all continuation choices at once'
                    : 'Play a continuation choice while you hover or focus it'
              }
            >
              {value === 'sequence' ? 'One-by-one' : value === 'allLoop' ? 'All play' : 'Hover'}
            </button>
          ))}
        </div>

        <div className="compact-options-row">
          <label
            className={`loop-pause-control${loopDelayInactive ? ' inactive-control' : ''}`}
            title={loopDelayInactive ? 'Used by Hover and All play gallery playback' : 'Pause at the end of a gallery clip before it loops'}
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
              onChange={(event) => applyCustom({ galleryLoopDelay: Math.min(10, Math.max(0, Number(event.currentTarget.value) || 0)) })}
            />
            <span>s</span>
          </label>
          <div className="check-row">
            <label title="Allow Replay prompt while answering">
              <input
                type="checkbox"
                checked={settings.replayEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ replayEnabled: event.currentTarget.checked })}
              />
              Replay
            </label>
            <label className={galleryControlsInactive ? 'inactive-control' : ''} title={galleryControlsInactive ? 'Not used in mental lap' : 'Play correct and wrong feedback tones'}>
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
                title={value === 'sequential' ? 'Advance through the course in order' : 'Choose an independent random prompt start each trial'}
              >
                {value === 'sequential' ? 'Sequential' : 'Random starts'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="response-gap-control"
          title={`Random source-time gap between prompt end and the correct response start. Slider max is 60s; current video cap is ${forwardGapMax.toFixed(2)}s.`}
        >
          <span>
            Response gap <strong>{settings.minForwardGap.toFixed(2)}-{settings.maxForwardGap.toFixed(2)}s</strong>
          </span>
          <div className="dual-range" style={responseGapStyle}>
            <input
              aria-label="Minimum response gap"
              type="range"
              min="0"
              max={forwardGapMax}
              step="0.25"
              value={settings.minForwardGap}
              disabled={disabled || forwardGapMax <= 0}
              onChange={(event) => setMinForwardGap(Number(event.currentTarget.value))}
            />
            <input
              aria-label="Maximum response gap"
              type="range"
              min="0"
              max={forwardGapMax}
              step="0.25"
              value={settings.maxForwardGap}
              disabled={disabled || forwardGapMax <= 0}
              onChange={(event) => setMaxForwardGap(Number(event.currentTarget.value))}
            />
          </div>
        </div>
      )}

      <label
        className={`sequential-position-control${sequentialPositionInactive ? ' inactive-control' : ''}`}
        title={
          sequentialPositionInactive
            ? 'Available in Sequential recall mode'
            : 'Move the next sequential prompt within the active Start and End course range'
        }
      >
        <span>
          Sequential position <strong>{sequentialPosition.toFixed(1)}s</strong>
        </span>
        <input
          type="range"
          min={settings.t0}
          max={sequentialPositionMax}
          step="0.1"
          value={sequentialPosition}
          disabled={disabled || sequentialPositionInactive || sequentialPositionMax <= settings.t0}
          onChange={(event) => onSequentialPositionChange(Number(event.currentTarget.value))}
        />
      </label>

      <div className="range-row">
        <label title="Lower cue-start bound">
          <span>Start (s)</span>
          <input
            type="number"
            min="0"
            max={duration ?? undefined}
            step="0.1"
            value={settings.t0}
            disabled={disabled}
            onChange={(event) => {
              const t0 = Math.min(duration ?? Number.POSITIVE_INFINITY, Math.max(0, Number(event.currentTarget.value) || 0));
              applyCustom({
                t0,
                t1:
                  settings.t1 === null
                    ? null
                    : Math.max(t0, Math.min(duration ?? Number.POSITIVE_INFINITY, settings.t1))
              });
            }}
          />
        </label>

        <label title="Optional upper cue-start bound">
          <span>End (s)</span>
          <input
            type="number"
            min={settings.t0}
            max={duration ?? undefined}
            step="0.1"
            value={settings.t1 ?? ''}
            placeholder={duration ? duration.toFixed(1) : 'auto'}
            disabled={disabled}
            onChange={(event) =>
              applyCustom({
                t1:
                  event.currentTarget.value === ''
                    ? null
                    : Math.min(
                        duration ?? Number.POSITIVE_INFINITY,
                        Math.max(settings.t0, Number(event.currentTarget.value) || 0)
                      )
              })
            }
          />
        </label>
      </div>

      <div className="preset-footer">
        <div className="preset-divider" aria-hidden="true" />
        <div className="preset-row">
          <button
            type="button"
            className={`reset-score${galleryControlsInactive ? ' inactive-control' : ''}`}
            onClick={onResetScore}
            disabled={disabled || galleryControlsInactive}
            title={galleryControlsInactive ? 'Score is not used in mental lap' : 'Reset this session score to zero'}
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
            title="Save the current control values as your reusable preset"
          >
            Save preset
          </button>
        </div>
      </div>
    </aside>
  );
}
