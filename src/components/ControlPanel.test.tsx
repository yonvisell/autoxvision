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
      maxForwardGapLimit={60}
      sequentialPosition={0}
      sequentialPositionMax={120}
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
    expect(markup).toContain('Blur lower frame');
    expect(markup).toContain('Fade lower frame');
    expect(markup).not.toContain('<details');
  });
});
