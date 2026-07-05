import type { GalleryPlayback, Mode, Preset, Settings } from '../types';

type ControlPanelProps = {
  settings: Settings;
  duration: number | null;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onPresetChange: (preset: Preset) => void;
  onSavePreset: () => void;
  onResetScore: () => void;
  onExport: () => void;
  onImport: (file: File | null) => void;
};

export function ControlPanel({
  settings,
  duration,
  disabled,
  onFileChange,
  onSettingsChange,
  onPresetChange,
  onSavePreset,
  onResetScore,
  onExport,
  onImport
}: ControlPanelProps) {
  const applyCustom = (patch: Partial<Settings>) => onSettingsChange(patch);

  return (
    <aside className="control-panel" aria-label="Controls">
      <label className="file-control inline-control">
        <span>Video</span>
        <input
          type="file"
          accept="video/*,.mov,.mp4,.m4v,.webm"
          onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
        />
      </label>

      <div className="control-columns">
        <div className="control-column">
          <div className="slider-stack">
            <label title="Cue and answer clip length in seconds">
              <span>Cue length <strong>{settings.T.toFixed(2)}s</strong></span>
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.05"
                value={settings.T}
                disabled={disabled}
                onChange={(event) => applyCustom({ T: Number(event.currentTarget.value) })}
              />
            </label>

            <label title="Number of gallery clips">
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

            <label title="Pause before each candidate clip in sequence playback">
              <span>Gallery pause <strong>{settings.galleryDelay.toFixed(2)}s</strong></span>
              <input
                type="range"
                min="0"
                max="3"
                step="0.25"
                value={settings.galleryDelay}
                disabled={disabled}
                onChange={(event) => applyCustom({ galleryDelay: Number(event.currentTarget.value) })}
              />
            </label>
          </div>

          <div className="check-row">
            <label>
              <input
                type="checkbox"
                checked={settings.replayEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ replayEnabled: event.currentTarget.checked })}
              />
              Replay
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                disabled={disabled}
                onChange={(event) => applyCustom({ soundEnabled: event.currentTarget.checked })}
              />
              Sound
            </label>
          </div>

          <div className="button-row">
            <button type="button" onClick={onResetScore} disabled={disabled}>
              Reset score
            </button>
          </div>
        </div>

        <div className="control-column">
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
            <button type="button" className="save-preset" disabled={disabled} onClick={onSavePreset}>
              Save preset
            </button>
          </div>

          <div className="select-row">
            <label className="mode-select">
              <span>Drill mode</span>
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

          <div className="segmented" aria-label="Gallery playback">
            {(['sequence', 'hover', 'allLoop'] as GalleryPlayback[]).map((value) => (
              <button
                type="button"
                key={value}
                className={settings.galleryPlayback === value ? 'active' : ''}
                disabled={disabled}
                onClick={() => applyCustom({ galleryPlayback: value })}
              >
                {value === 'sequence' ? 'Sequence' : value === 'allLoop' ? 'All loop' : 'Hover'}
              </button>
            ))}
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
        </div>
      </div>

      <p className="shortcut-hint">Keys: 1-8 choose clips, Space/R replay or reveal, M mute.</p>
    </aside>
  );
}
