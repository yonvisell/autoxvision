import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CuePane } from './CuePane';
import type { Settings } from '../types';

const promptMask: Pick<
  Settings,
  | 'promptBlurEnabled'
  | 'promptBlurStrength'
  | 'promptBlurHeight'
  | 'promptFadeEnabled'
  | 'promptFadeLevel'
  | 'promptFadeHeight'
> = {
  promptBlurEnabled: true,
  promptBlurStrength: 24,
  promptBlurHeight: 50,
  promptFadeEnabled: true,
  promptFadeLevel: 70,
  promptFadeHeight: 50
};

function renderCue(
  phase: 'cuePlaying' | 'answering' | 'revealing',
  maskOverrides: Partial<typeof promptMask> = {}
) {
  return renderToStaticMarkup(
    <CuePane
      videoUrl="blob:test-video"
      clip={{ start: 2, end: 4 }}
      phase={phase}
      replayEnabled
      playbackRate={1}
      promptMask={{ ...promptMask, ...maskOverrides }}
      canReveal={phase === 'answering'}
      canReplayPrompt={phase === 'answering'}
      canReplayFullAnswer={false}
      canRestartCourse={false}
      canStartNext={false}
      onClipEnded={() => undefined}
      onRequestFile={() => undefined}
      onReplay={() => undefined}
      onReplayFullAnswer={() => undefined}
      onReveal={() => undefined}
      onRestartCourse={() => undefined}
      onStartNext={() => undefined}
    />
  );
}

describe('CuePane prompt masking', () => {
  it('renders combined masks at 50% and 100% during prompt playback', () => {
    const half = renderCue('cuePlaying');
    expect(half).toContain('prompt-mask-blur');
    expect(half).toContain('prompt-mask-fade');
    expect(half).toContain('<canvas');
    expect(half).toContain('clip-path:inset(50% 0 0 0)');
    expect(half).toContain('filter:blur(24px)');
    expect(half).toContain('height:50%');
    expect(half).toContain('background-color:rgba(0, 0, 0, 0.7)');

    const full = renderCue('cuePlaying', {
      promptBlurStrength: 60,
      promptBlurHeight: 100,
      promptFadeHeight: 100
    });
    expect(full).toContain('clip-path:inset(0% 0 0 0)');
    expect(full).toContain('filter:blur(60px)');
    expect(full).toContain('height:100%');
  });

  it('omits zero-strength or zero-height masks without changing their settings', () => {
    const zeroHeight = renderCue('cuePlaying', {
      promptBlurHeight: 0,
      promptFadeHeight: 0
    });
    expect(zeroHeight).not.toContain('prompt-mask-blur');
    expect(zeroHeight).not.toContain('prompt-mask-fade');

    const zeroStrength = renderCue('cuePlaying', {
      promptBlurStrength: 0,
      promptFadeLevel: 0
    });
    expect(zeroStrength).not.toContain('prompt-mask-blur');
    expect(zeroStrength).not.toContain('prompt-mask-fade');
  });

  it.each(['answering', 'revealing'] as const)('never masks the %s phase', (phase) => {
    const markup = renderCue(phase);
    expect(markup).not.toContain('prompt-mask-blur');
    expect(markup).not.toContain('prompt-mask-fade');
  });

  it('releases the prompt video while the gallery is playing', () => {
    expect(renderCue('answering')).not.toContain('<video');
    expect(renderCue('cuePlaying')).toContain('<video');
    expect(renderCue('revealing')).toContain('<video');
  });
});
