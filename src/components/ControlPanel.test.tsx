import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../lib/presets';
import { ControlPanel } from './ControlPanel';

function renderPanel(videoName: string | null) {
  return renderToStaticMarkup(
    <ControlPanel
      settings={defaultSettings}
      videoName={videoName}
      duration={120}
      sequentialPosition={0}
      sequentialPositionMax={39}
      disabled={false}
      collapsed={false}
      onFileChange={() => undefined}
      onSettingsChange={() => undefined}
      onPresetChange={() => undefined}
      onSavePreset={() => undefined}
      onResetScore={() => undefined}
      onSequentialPositionChange={() => undefined}
      onToggleCollapsed={() => undefined}
    />
  );
}

describe('ControlPanel', () => {
  it('shows the application filename instead of native stale file-input text', () => {
    const markup = renderPanel('course-walk.mov');
    expect(markup).toContain('course-walk.mov');
    expect(markup).not.toContain('No video loaded');
  });

  it('keeps prompt masking directly in the main controls', () => {
    const markup = renderPanel(null);
    expect(markup).toContain('aria-label="Prompt masking"');
    expect(markup).toContain('>Blur</label>');
    expect(markup).toContain('>Fade</label>');
    expect(markup).not.toContain('<details');
  });

  it('uses dual ranges for course bounds and answer gap with a 14x speed limit', () => {
    const markup = renderPanel('course-walk.mov');
    expect(markup).toContain('aria-label="Course range start"');
    expect(markup).toContain('aria-label="Course range end"');
    expect(markup).toContain('aria-label="Minimum answer gap"');
    expect(markup).toContain('aria-label="Maximum answer gap"');
    expect(markup).toContain('aria-label="Playback speed" type="range" min="0.25" max="14"');
    expect(markup).not.toContain('Start (s)');
    expect(markup).not.toContain('End (s)');
  });
});
