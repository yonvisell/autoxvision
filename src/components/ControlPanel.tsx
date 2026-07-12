import type { CSSProperties } from 'react';
import type { GalleryPlayback, Mode, Preset, Settings } from '../types';

type ControlPanelProps = {
  settings: Settings;
  duration: number | null;
  maxForwardGapLimit: number;
  disabled: boolean;
  collapsed: boolean;
  onFileChange: (file: File | null) => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onPresetChange: (preset: Preset) => void;
  onSavePreset: () => void;
  onResetScore: () => void;
  onToggleCollapsed: () => void;
};

export function ControlPanel({
  settings,
  duration,
  maxForwardGapLimit,
  disabled,
  collapsed,
  onFileChange,
  onSettingsChange,
  onPresetChange,
  onSavePreset,
  onResetScore,
  onToggleCollapsed
}: ControlPanelProps) {
  const applyCustom = (patch: Partial<Settings>) => onSettingsChange(patch);
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
          onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
        />
      </label>

      <div className="quick-controls">
        <label title="Prompt and answer clip length in seconds">
          <span>Prompt <strong>{settings.T.toFixed(2)}s</strong></span>
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

        <label title="Number of answer choices">
          <span>Choices <strong>{settings.N}</strong></span>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            value={settings.N}
            disabled={disabled}
            onChange={(event) => applyCustom({ N: Number(event.currentTarget.value) })}
          />
        </label>

        <label title="Black pause after the prompt before each answer choice plays">
          <span>Choice wait <strong>{settings.galleryDelay.toFixed(2)}s</strong></span>
          <input
            type="range"
            min="0"
            max="4"
            step="0.25"
            value={settings.galleryDelay}
            disabled={disabled}
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

      <div className="core-selects">
        <div className="preset-row">
          <label>
            <span>Preset</span>
            <select
              value={settings.preset}
              disabled={disabled}
              onChange={(event) => onPresetChange(event.currentTarget.value as Preset)}
            >
              <option value="custom">Custom</option>
              <option value="saved">Saved</option>
              <option value="encoding">Encoding</option>
              <option value="learning">Learning</option>
              <option value="performance">Performance</option>
              <option value="pressure">Pressure</option>
            </select>
          </label>
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

        <div className="select-row">
          <label className="mode-select">
            <span>Session mode</span>
            <select
              value={settings.mode}
              disabled={disabled}
              onChange={(event) => applyCustom({ mode: event.currentTarget.value as Mode })}
            >
              <option value="random">Random recall</option>
              <option value="sequential">Sequential recall</option>
              <option value="weakSpots">Weak spots</option>
              <option value="mentalLap">Mental lap</option>
            </select>
          </label>
        </div>
      </div>

      <div className="playback-controls">
        <div className="segmented" aria-label="Gallery playback">
          {(['sequence', 'hover', 'allLoop'] as GalleryPlayback[]).map((value) => (
            <button
              type="button"
              key={value}
              className={settings.galleryPlayback === value ? 'active' : ''}
              disabled={disabled}
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
          <label title="Play correct and wrong feedback tones">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              disabled={disabled}
              onChange={(event) => applyCustom({ soundEnabled: event.currentTarget.checked })}
            />
            Sound
          </label>
        </div>
      </div>

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

      <div className="range-row">
        <label title="Lower cue-start bound">
          <span>Start (s)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={settings.t0}
            disabled={disabled}
            onChange={(event) => applyCustom({ t0: Math.max(0, Number(event.currentTarget.value) || 0) })}
          />
        </label>

        <label title="Optional upper cue-start bound">
          <span>End (s)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={settings.t1 ?? ''}
            placeholder={duration ? duration.toFixed(1) : 'auto'}
            disabled={disabled}
            onChange={(event) =>
              applyCustom({
                t1: event.currentTarget.value === '' ? null : Math.max(0, Number(event.currentTarget.value) || 0)
              })
            }
          />
        </label>
      </div>

      <button type="button" className="reset-score" onClick={onResetScore} disabled={disabled} title="Reset this session score to zero">
        Reset score
      </button>

    </aside>
  );
}
