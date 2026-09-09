# WORKLOG.md — AutoxVision

Codex should keep this file current during implementation.

## Initial brief

Build a local-first temporal-occlusion recall trainer for autocross course-walk videos. Primary workflow: load local video, show brief cue, black out, select immediately following clip from gallery, score feedback, repeat.

## Implementation decisions

Record concise decisions here, especially when resolving ambiguity without asking the user.

- Stack: Vite + React + TypeScript, plain CSS, Vitest. Runtime dependencies are React only; no backend, CDN, or vendored runtime libraries.
- State management: React hooks and derived state in `App.tsx`; pure timing/trial/annotation logic lives in `src/lib`.
- Persistence method: `localStorage` keyed by deterministic video fingerprint (`name:size:lastModified`) for settings, annotations, high scores, and weak-spot stats.
- Video clip-loop implementation: native HTML5 video elements sharing the selected file object URL; cue playback is controlled by seeking and requestAnimationFrame end checks, gallery clips loop or play on hover.
- Testing approach: Vitest covers pure clip math, trial generation, presets, anchor stats, and annotation export/import behavior. Browser inspection used a generated temporary WebM file.
- Runtime assumption: Node >=20 is required for Vite/Vitest. The machine default `/usr/local/bin/node` is v11.14.0, so verification used the bundled Node v24.14.0 and npm 10.9.8.
- UI revision: User requested a calmer drill surface. Default cue length is now 2.5s, gallery playback defaults to one-at-a-time sequence mode, and a 2.0s Choice wait slider controls the blackout before each candidate clip.
- UI revision: Visible notes import/export buttons were removed from the main controls at user request; notes autosave remains validated.
- Adaptive UI revision: Extended controls live in a closed-by-default Advanced popover; the lower prompt/choices split is draggable; crowded galleries wrap into two rows to keep choices legible; miss-history chips allow wrong prompts to be retried and marked solved.

## Work log

### Slice 1 — Scaffold

- Status: Complete.
- Commit: `3221bca`
- Notes: Initialized git repo, added Vite React TypeScript scaffold, `.gitignore`, package scripts, GitHub Pages-compatible Vite `base: './'`, and preserved local media outside git.

### Slice 2 — Video loading and clip playback

- Status: Complete.
- Commit: `3221bca`, polished in `f04b34a`
- Notes: Implemented local file picker, metadata loading, object URL playback, cue delay/play/blackout flow, gallery loop/hover playback, and inline decode/short-video messages.

### Slice 3 — Trial engine and scoring

- Status: Complete.
- Commit: `3221bca`
- Notes: Added random/sequential/weak-spots/mental-lap trial generation, immediate-continuation answer clips, shuffled gallery distractors, score/high-score persistence, retry-until-correct behavior, and generated Web Audio feedback tones.

### Slice 4 — Controls, modes, presets

- Status: Complete.
- Commit: `3221bca`, polished in `f04b34a`
- Notes: Added compact dark controls for file, T, N, preset, mode, gallery playback, replay, sound, t0/t1, reset, export/import, plus visible keyboard shortcut text in the controls area.

### Slice 5 — Notes, autosave, export/import

- Status: Complete.
- Commit: `3221bca`
- Notes: Notes bind to nearest cue start within +/-0.25s, autosave locally, export as schema-versioned JSON, and import/merge with non-blocking warnings.

### Slice 6 — Polish, tests, visual inspection

- Status: Complete.
- Commit: `f04b34a`
- Notes: Fixed first-viewport layout and cue-video overflow after browser screenshots showed the lower row being pushed/overlapped. Added stable gallery data attributes for automated verification.

### Slice 7 — UI cleanup revision

- Status: Complete.
- Commit: `Refine drill UI and gallery sequencing`
- Notes: Removed cue/answer timestamp subtitle, added cone mark, renamed high score, compacted controls into two columns, renamed T/N/t0/t1 labels, added saved preset control, moved gallery instructions into the gallery, reduced notes field prominence, and changed default gallery playback to sequenced clips.

### Slice 8 — Adaptive layout and miss retries

- Status: Complete.
- Notes: Reworked the lower deck into a cleaner resizable split, moved extended controls into a closed-by-default Advanced popover, made answer choices resize without horizontal scroll, used two rows for crowded 5-8 choice sets, added miss-history retry chips, removed confusing prompt-window text during blackout, renamed controls around prompt/choices, and exposed Choice wait at a 2.00s default with migration from the prior 1.00s sequence default.

### Slice 9 — Right-side controls revision

- Status: Complete.
- Notes: Stopped local dev servers, moved the control panel to the right of the choices, kept Replay prompt visually enabled after video load, moved Preset and Session mode out of Advanced, and raised the prompt duration slider max to 5.00s.

### Slice 10 — Forward gap and collapsible side panels

- Status: Complete.
- Notes: Added a source-time Forward gap setting, default 1.00s, so the correct answer clip starts after the prompt end plus a configurable gap. Added the slider under Advanced, included the gap in duration clamping and sequential stepping, and added horizontal collapse rails for the right control panel and notes panel so the gallery and prompt can expand.

### Slice 11 — Forward-window sampling and compact prompt controls

- Status: Complete.
- Notes: Replaced the single forward gap with Min gap and Max gap sliders, both 0-10s, and raised the prompt-duration slider max to 20s. All modes now generate continuations strictly after prompt end; multi-choice modes sample each continuation start from the configured source-time forward window and mark the earliest sampled future clip correct. Added a collapsible mental-lap gallery rail, moved Replay prompt / Show answer into a smaller vertical stack to the right of the prompt video, tightened vertical spacing, and made wrong/correct feedback frames override hover with thicker red/green treatment.

### Slice 12 — Inline controls and wider continuation spacing

- Status: Complete.
- Notes: Kept a snapshot server running for the prior committed build, then flattened Advanced controls into the main control panel with hover titles on primary buttons. Raised the default Max gap to 50s, capped it per video at the smaller of 180s or video duration minus gallery clip duration, migrated old default-shaped 1s/2s saved gaps to 1s/50s, and enforced a minimum lapse between sampled gallery starts based on the active continuation window. Mental-lap mode now auto-collapses secondary panels, leaves the prompt as the main surface, plays the prompt once per trial, and uses Space/R for replay plus Enter/Show answer for reveal.

### Slice 13 — Startup access and playback speed

- Status: Complete.
- Notes: Ensured controls remain open on first load when no video is loaded, even if saved settings are in mental-lap mode, and added click-to-choose-video behavior on the empty prompt panel. Added a Playback speed slider from 0.25x to 10x that applies to both prompt and gallery clips and shortens one-by-one gallery timing accordingly. Raised time-slider ceilings by roughly 30% where practical: prompt max 26s, choice wait max 4s, and global forward-gap cap 234s. In mental-lap mode, Show answer is available before the prompt finishes and has `P` as the reveal hotkey because `R` remains replay.

### Slice 14 — Mental-lap reveal overlap and bottom help line

- Status: Complete.
- Notes: Mental-lap reveal now preserves the previously computed answer end time but starts playback at prompt end minus 20% of prompt length, removing the dead source-time gap while retaining the planned answer endpoint. Moved instructions and hotkeys into a single very small fixed bottom overlay line, with current instruction/status on the left and hotkeys on the right.

### Slice 15 — Remote distractors and full-sequence reveal

- Status: Complete.
- Notes: Random and sequential recall now keep the correct continuation in the configured forward window, but sample wrong alternatives from remote course times before the prompt neighborhood or well after the correct answer, with graceful fallback for very short videos. In random and sequential modes, a correct reveal now plays continuously from prompt start through the end of the correct continuation instead of playing only the answer clip.

### Slice 16 — Course-start restart for progressive modes

- Status: Complete.
- Notes: Added a compact `Course start` prompt control for sequential recall and mental-lap mode. It starts a fresh trial at the active course start (`Start (s)` / `t0`) instead of continuing from the current progressive position, while remaining hidden in random and weak-spots modes.

### Slice 17 — Strict wrong-choice exclusion window

- Status: Complete.
- Notes: Wrong gallery alternatives now use a non-negotiable exclusion window from `prompt start - prompt length` through `correct answer end + prompt length`. The sampler may relax spacing among wrong alternatives if the remaining valid course time is tight, but it no longer relaxes the prompt-through-answer exclusion; if no outside time exists, it returns fewer wrong alternatives rather than sampling inside the forbidden region.

### Slice 18 — Response-gap slider and manual next prompt

- Status: Complete.
- Notes: Replaced separate min/max response-gap sliders with a single dual-handle `Response gap` control capped at 60s. After a correct reveal finishes, the app now waits on a black prompt pane until the user clicks the pane or presses Space/R for the next prompt. Added a concise hotkey line under the notes field so it collapses with the notes panel, and preserved the prior committed build as a static snapshot on `127.0.0.1:5173` while running the new version on `127.0.0.1:5174`.

### Slice 19 — Gallery sequence lockout fix

- Status: Complete.
- Notes: Removed the automatic prompt replay that fired after one-by-one gallery playback completed. That replay could leave the user in a black cue/playback state with choices disabled if browser autoplay did not proceed cleanly. The gallery now remains answerable after its one-by-one pass; the user can explicitly replay the prompt or select an answer.

## Verification log

Commands run:

```bash
# Install with modern Node/npm because system Node is v11.14.0.
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js install --no-audit --no-fund
# Result: added 164 packages.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed (`tsc --noEmit`).

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 14 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev
# Result: Vite ready at http://127.0.0.1:5173/.

# Revision validation after UI cleanup:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 15 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

# Adaptive layout / miss-retry revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js install --no-audit --no-fund
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 15 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev
# Result: Vite ready at http://127.0.0.1:5174/ because port 5173 was already occupied.

# Right-side controls revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 15 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev
# Result: Vite ready at http://127.0.0.1:5173/ for visual validation; stopped before handoff.

# Forward gap / collapsible panels revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 15 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev
# Result: Vite ready at http://127.0.0.1:5173/ and left running after handoff.

# Forward-window sampling / compact prompt controls revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 15 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev -- --host 127.0.0.1
# Result: Vite ready at http://127.0.0.1:5173/ and left running after handoff.

# Inline controls / wider continuation spacing revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 18 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev -- --host 127.0.0.1
# Result: Vite ready at http://127.0.0.1:5173/ and left running after handoff.

# Startup access / playback speed revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 18 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev -- --host 127.0.0.1
# Result: Vite ready at http://127.0.0.1:5173/ and left running after handoff.

# Mental-lap reveal overlap / bottom help revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 19 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev -- --host 127.0.0.1
# Result: Vite ready at http://127.0.0.1:5173/ and left running after handoff.

# Remote distractors / full-sequence reveal revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 20 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

# Course-start restart revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 21 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

# Strict wrong-choice exclusion revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 22 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

# Response-gap slider / manual next prompt revision:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js install --no-audit --no-fund
# Result: passed, up to date.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 22 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run dev -- --host 127.0.0.1 --port 5174
# Result: Vite ready at http://127.0.0.1:5174/ and left running after handoff.

# Gallery sequence lockout fix:
PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js install --no-audit --no-fund
# Result: passed, up to date.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run lint
# Result: passed.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js test
# Result: passed, 4 test files / 22 tests.

PATH="/Users/yon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node /Users/yon/Library/pnpm/store/v11/links/@/npm/10.9.8/0fe3e78be5bcc23ca57f8487bba8e7a13da0f6e4b1e4a7f179b0b51056b49f8c/node_modules/npm/bin/npm-cli.js run build
# Result: passed, Vite production build written to dist/.

# Distractor-window and gallery-seek correction:
- Wrong choices now prefer remote course times and may relax only as far as a hard safety boundary: the entire wrong clip must lie before `prompt start - T` or begin after `correct answer end + T`.
- Gallery tiles remain black until their video element has completed the seek to the assigned clip start, preventing transient frames from a stale or default media time from being presented under the wrong answer label.
- Added a deterministic 2,000-trial regression sweep across random/sequential modes, prompt lengths, response gaps, and eight-choice galleries.

`npm run lint`
# Result: passed.

`npm test -- --run`
# Result: passed, 4 test files / 23 tests, including 2,000 generated timing trials.

`npm run build`
# Result: passed, Vite production build written to dist/.

# Mental-lap timing, progression, help, and public release:
- Mental-lap continuation is now immediate and exactly the prompt duration. Show answer plays the continuous `A+B` interval, with `duration(A) = duration(B) = T`.
- Added persistent Sequential and Random starts mental-lap progression. Sequential advances by `T`; Random starts resamples independently for each trial.
- Gallery/scoring controls that do not apply to mental lap remain visible but are disabled and greyed out; they reactivate when a gallery recall mode is selected.
- Added the title-bar `?` link and a standalone `help.html` covering operation, timing, modes, controls, shortcuts, persistence, privacy, and codec limitations.
- Added the official Vite/GitHub Pages build and deployment workflow for `yonvisell/autoxvision`.

`npm install --no-audit --no-fund`
# Result: passed, up to date.

`npm run lint`
# Result: passed.

`npm test -- --run`
# Result: passed, 4 test files / 24 tests.

`npm run build`
# Result: passed; production output includes the app and `help.html`.

GitHub Pages deployment:
# Result: created public repository `yonvisell/autoxvision`, pushed `main`, enabled GitHub Actions as the Pages source, and completed deployment run #2 successfully in 30s.
# Live URLs: `https://yonvisell.github.io/autoxvision/` and `https://yonvisell.github.io/autoxvision/help.html`.

Default-value follow-up:
# Changed fresh-session defaults to Prompt `10.0s`, Speed `4.0x`, and Choice wait `1.0s`; all other defaults and built-in presets are unchanged. Validation commands were intentionally omitted at the user's request because this was a defaults-only revision.
```

Visual inspection:

- Browser: In-app browser for no-file layout; Playwright with local Google Chrome for file-backed flows.
- Video used: Generated temporary `/tmp/autoxvision-test.webm`; no media committed. The existing `AAXLPM1.MOV` remains ignored.
- States inspected: no file, video loaded/active trial, wrong feedback, correct reveal, notes autosave/export/import, mental-lap gallery-hidden state.
- Screenshots: `/tmp/autoxvision-shots/01-no-file.png` through `/tmp/autoxvision-shots/05-mental-lap.png`.
- Issues found and fixed: first screenshot showed controls/gallery below the viewport, then later screenshots showed cue video overflow over the gallery. CSS grid sizing and cue video absolute fill fixed both; final automated overlap check passed.
- Revision screenshots: `/tmp/autoxvision-revision-final-shots/01-no-file.png` through `/tmp/autoxvision-revision-final-shots/05-mental-lap.png`.
- Revision checks: Verified no cue/answer subtitle, default cue length 2.5s, high score label, gallery instruction in gallery, no visible notes import/export buttons, no control-panel scroll at 1280x720, saved preset writes to localStorage, notes autosave writes to localStorage, wrong/correct feedback, and mental-lap gallery hidden state.
- Adaptive revision screenshots: `/tmp/autoxvision-adaptive-shots/01-no-file.png` through `/tmp/autoxvision-adaptive-shots/08-mental-lap.png`.
- Adaptive revision checks: Verified no “Ready” text, Advanced closed by default and opening as a popover, Choice wait visible at 2.00s, choices disabled during the wait and unlocked after it, draggable prompt/choice split in both directions, N=8 resizing into a no-scroll two-row gallery, wrong-answer miss history, miss retry/resolved state, saved preset localStorage write, notes autosave, and mental-lap choices-hidden state.
- Right-controls revision screenshot: `/tmp/autoxvision-right-controls-shots/01-right-controls-loaded.png`.
- Right-controls revision checks: Verified control panel right of choices, Preset and Session mode visible outside Advanced, Advanced closed and not containing those controls, Replay prompt not disabled after video load, prompt max is 5, no horizontal overflow, and no listeners remain on ports 5173/5174 after validation.
- Forward gap / collapse screenshots: `/tmp/autoxvision-gap-collapse-shots/01-loaded.png` through `/tmp/autoxvision-gap-collapse-shots/04-notes-collapsed.png`.
- Forward gap / collapse checks: Verified Forward gap slider appears under Advanced at 1.00s default, correct answer clip starts at least 1s after prompt end, prompt max remains 5, collapsing controls enlarges gallery, expanding controls restores the panel, collapsing notes enlarges prompt, expanding notes restores the notes panel, and no horizontal overflow.
- Forward-window screenshots: `/tmp/autoxvision-forward-window-shots/01-loaded.png` through `/tmp/autoxvision-forward-window-shots/04-mental-collapsed.png`.
- Forward-window checks: Verified prompt duration slider max 20s; Min gap and Max gap sliders exist under Advanced with max 10s and defaults 1s/2s; Replay prompt is enabled after video load; prompt actions are right of the prompt and vertically stacked; M hotkey toggles sound; all gallery starts were after prompt end and inside the default 1-2s forward window; the correct answer was the earliest sampled future clip; wrong/correct frames remained thick while hovered; mental-lap gallery collapsed to a narrow rail; and no horizontal overflow appeared at 1440x900.
- Hotkey follow-up checks: Verified number-key answer selection, `R` replay, and `Space` reveal in mental-lap mode at 1280x720.
- Inline-control screenshots: `/tmp/autoxvision-inline-controls-shots/01-inline-controls.png` and `/tmp/autoxvision-inline-controls-shots/02-mental-lap-focused.png`.
- Inline-control checks: Verified Advanced is gone; Max gap defaults to 50s before file load with a 180s slider cap; short test video clamps Max gap to video duration minus prompt duration; gallery starts remain after prompt end, inside the effective forward window, and separated by the computed minimum lapse; gallery instruction overlays inside the gallery strip; prompt-gallery vertical gap is compact; Space and the Replay button replay the prompt; mental-lap auto-collapses controls, notes, and gallery into a compact rail; mental-lap does not automatically replay after waiting; and Enter reveals the answer after mental replay.
- Startup/speed checks: Verified controls stay open on first load when saved settings are mental-lap; the empty prompt panel opens the file chooser; prompt max is 26s, choice-wait max is 4s, and unloaded Max gap cap is 234s; Speed slider has min 0.25, max 10, default 1; a 2x speed setting reaches both the prompt video and gallery videos; and `P` reveals the answer in mental-lap mode.
- Mental-lap overlap checks: Verified `P` reveal begins before the prompt end by the requested overlap window while the unit test preserves the previously computed answer end time. Verified the fixed bottom help line is at the window bottom, under 16px tall, and contains current instruction/status text plus hotkeys.
- Remote distractor checks: Verified in local Chrome with ignored `AAXLPM1.MOV` that random-mode wrong starts were roughly 35s, 133s, and 221s away from the correct answer; sequential-mode wrong starts were roughly 24s, 103s, and 343s away. In both modes, selecting the correct tile entered reveal mode with the main video current time before the correct answer start, confirming prompt-through-answer playback.
- Course-start restart checks: Verified in local Chrome with ignored `AAXLPM1.MOV` that `Course start` appears once in sequential and mental-lap modes, is hidden in random mode, and restarts playback near `Start (s) = 5` when that active course start is configured.
- Strict exclusion checks: Verified in local Chrome with ignored `AAXLPM1.MOV` that a random-mode trial with `T = 2` had forbidden wrong-choice interval `185.69s-195.09s`; all wrong gallery starts were outside that interval.
- Response-gap / manual-next checks: Verified in local Chrome with ignored `AAXLPM1.MOV` on `127.0.0.1:5174` that the response-gap control has two handles with max `60`, a configured 5-12s response gap sampled a correct start 10.6s after prompt end, notes show the collapsible hotkey line, a correct reveal stops at `Click for next prompt`, Space/R starts the next prompt, and clicking the cue pane also starts the next prompt. Screenshots: `/tmp/autoxvision-5174-response-gap.png` and `/tmp/autoxvision-5174-response-gap-control.png`.
- Gallery sequence lockout checks: Verified in local Chrome with ignored `AAXLPM1.MOV` on `127.0.0.1:5174` that after one-by-one gallery playback finishes, gallery tiles remain enabled, no prompt autoplay/blackout begins, and the correct-answer manual-next flow still starts the next prompt with Space.
- Distractor/seek checks: Verified with ignored `AAXLPM1.MOV` on `127.0.0.1:5175` that random and sequential wrong-choice timestamps were outside the complete buffered prompt-to-answer window. Checked assigned starts against live `<video>.currentTime`; all tiles sought to the assigned timestamp before becoming visible, with no out-of-range active playback samples.
- Mental-lap release checks: With ignored `AAXLPM1.MOV`, a 2.5s Show answer reveal began at the prompt start, remained active across the A/B boundary, and ended after 5.0s. Sequential progression advanced `214.13s -> 216.63s`; Random starts sampled `155.37s -> 258.88s`. Verified the progression selector, title-bar help link, complete help-page layout, seven inactive mental-lap controls, and full reactivation in Random recall.
- Public-site checks: Both live URLs returned HTTP 200. The deployed app loaded the expected production JavaScript/CSS assets, exposed the title-bar help link and Video control, and produced no browser warnings or errors. The live instructions included mental-lap timing and local-video privacy guidance with no browser warnings or errors.

## 2026-08-23 displayed-time, sequential, and gallery-loop revision

- Added a persisted Gallery loop pause number control, default `0.5s`, for Hover and All play. Live media sampling confirmed that a gallery video pauses at its clip end for the configured interval before seeking to its assigned start and resuming.
- Reinterpreted Prompt length as displayed wall-clock duration. Trial source span is now `prompt length * playback speed`, so a displayed 5-second prompt remains 5 seconds at every speed while covering proportionally more source video.
- A newly selected course now resets Start to `0`, End to automatic video end, and sequential recall to `0`. File inputs clear after selection so reselecting the same file also performs a true reset.
- Added a mode-aware Sequential position slider spanning the active Start-to-End range. Playback clamps only when a full prompt and answer cannot fit near the selected end.
- Added Replay full answer after a sequential reveal; it replays the continuous prompt-through-correct-continuation interval without advancing the trial.
- Removed visible Session mode and Preset labels, appended `mode` to each mode option, moved presets below a thin divider, removed orange Pick labels, and changed the gallery instruction to `Click the nearest upcoming video.`
- Reduced title-bar height, outer gutters, region gaps, and gallery spacing. Controls fit the default 300px deck without vertical scrolling in gallery modes; gallery tiles retain a 4px black separation and resize with the window.
- Revised `public/help.html` around driver workflow, displayed-time semantics, sequential positioning/replay, gallery playback, shortcuts, persistence, and local-video privacy.

Final command checks:

- `npm install --no-audit --no-fund`: passed, dependencies already current.
- `npm run lint`: passed.
- `npm test -- --run`: passed, 4 files / 25 tests.
- `npm run build`: passed; production app and help page emitted to `dist/`.

Final browser checks on `127.0.0.1:5176` with ignored local `AAXLPM1.MOV`:

- Verified fresh and same-file sequential loads begin at `0.0s`, clear prior Start/End bounds, and expose a position range from `0` to the `453.915s` video end.
- Verified the 10-second prompt at 4x uses a 40-second source interval, preserving displayed duration across playback speed.
- Verified loop pause behavior, full-answer replay, adaptive six-choice gallery sizing, thick wrong/correct feedback, and no per-tile Pick labels.
- Verified `1` gallery selection, `Space`/`R` next-prompt progression, `P` mental-lap reveal, and `M` sound toggle.
- Verified compact desktop and mobile layouts without horizontal overflow; corrected the mobile title bar to remain one row.
- Verified the revised help page and app produced no browser warnings or errors.

## 2026-08-24 shortcut-label follow-up

- Added concise visible shortcut labels to Replay prompt (`R`), Course start (`S`), Show answer (`A`), the next-prompt blackout (`Space`), and the gallery-choice instruction (`1, 2, ...`).
- Added functional `A` and `S` keyboard handlers while retaining the existing answer and course-navigation controls.
- Removed the duplicate gallery instruction from the persistent bottom strip and updated the notes shortcut line and help page.
- `npm run lint`, `npm test -- --run` (25 tests), and `npm run build` passed.
- Browser checks with a local 30-second H.264 test video verified `A` reveal, `S` course restart, the next-prompt Space hint, exactly one gallery instruction, label fit, and no console warnings or errors.

## 2026-09-04 sequential, Weak Spots, and prompt-masking revision

- Sequential Recall now starts each next prompt at the actual sampled correct-continuation start. If that continuation cannot serve as a complete prompt within the active course range, progression wraps to the active Start value instead of clamping backward.
- Weak Spots records one adaptive result per trial, determined by the first committed gallery choice. Additional wrong choices do not add attempts or miss-history entries, a later correct choice does not add a second adaptive result, and retrying a stored miss resolves that existing entry without changing adaptive statistics.
- Weak-spot sampling now uses first-answer miss rate as its weighting signal; reaction time and presentation recency remain stored but do not affect sampling weight.
- Added persisted prompt-only masking controls for lower-frame blur and black fade. Each effect has an enable checkbox, strength/level slider, and 0-100% height slider. Combined effects place blur beneath fade.
- Prompt masks apply to ordinary prompt playback and explicit prompt replay. Gallery videos and prompt-through-answer reveals remain clear. Built-in presets preserve the active mask configuration; Saved preset includes it.
- Updated the help page and README to describe the revised progression, adaptive accounting, and mask boundaries.

Final command checks:

- `npm install --no-audit --no-fund`: passed, dependencies already current.
- `npm run lint`: passed.
- `npm test -- --run`: passed, 6 files / 35 tests.
- `npm run build`: passed; production app and help page emitted to `dist/`.
- `git diff --check`: passed.

Browser checks on `127.0.0.1:5175` with an ignored local 30-second H.264 video:

- Verified combined blur/fade overlays in Random, Sequential, Weak Spots, and Mental Lap modes; no mask element appeared in any gallery tile.
- Verified explicit Replay prompt applies both masks, while Show answer and correct prompt-through-answer playback remove both masks, including over the prompt portion.
- Verified built-in preset selection retained mask settings, Saved preset restored them after edits, and settings survived a page reload. Disabled effect sliders remained visible and legible.
- Verified Sequential Recall advanced from `0.00s` to the sampled correct start at `9.78s`, not to a nominal prompt-plus-gap position.
- Verified two wrong clicks in one Weak Spots trial changed the score twice but created one miss-history item; retrying and solving it marked that item resolved.
- Verified `1`, `Space`, `R`, `A`, `S`, and `M` keyboard controls against live drill state.
- Verified the revised instructions page visually and observed no browser warnings or errors.
- Component coverage verifies mask suppression at zero strength/height, rendering at 50% and 100% height, and suppression throughout answering and reveal phases.

## 2026-09-04 file-state and blur follow-up

- Replaced the native file-input presentation with a compact application-owned picker that reports the loaded filename. The underlying input still clears after selection, so selecting the same course again performs a real reset without displaying the misleading native `No file chosen` state.
- Moved Blur and Fade directly into the main controls and removed the Prompt masking disclosure interaction.
- Replaced compositor-dependent `backdrop-filter` blur with a frame-synchronized canvas copy of the active prompt and standard CSS `filter: blur(...)`. The canvas is rendered only while prompt masking is active, uses bounded display resolution, and is removed for answering, gallery playback, and all answer reveals.
- Retained the 60px maximum. Visual testing on the actual course footage showed a strong blur at 24px, so the existing maximum provides substantial headroom.
- Kept mask height as a stable frame-relative boundary. It can be aligned manually with a stable horizon; automatic scene-dependent horizon estimation was not added because foreground objects, trees, and camera motion would make it unreliable.

Validation:

- `npm run lint`: passed.
- `npm test -- --run`: passed, 7 files / 37 tests.
- `npm run build`: passed.
- Browser checks verified empty and loaded filename states, same-file reset, always-visible masking controls, isolated blur, combined blur/fade ordering, prompt replay masking, clear gallery and answer reveal, and blur operation in all four modes.
- Visual checks used both a 30-second H.264 test video and ignored local `AAXLPM1.MOV`; neither app state produced browser warnings or errors.

## 2026-09-04 synchronized high-resolution gallery playback

- Profiled `/Users/yon/Pictures/GX010005.MP4`: 661.73 seconds, 3840x2160 HEVC, approximately 45 Mb/s, and 3.5 GB. At 4x speed, three independent decoders must advance roughly 120 source frames per second each for a 30 fps source, so All play is intrinsically the most demanding gallery mode.
- Replaced independent All play seek/start/loop behavior with a gallery-wide readiness barrier and shared loop clock. Every choice is pre-seeked to its assigned time, all ready players receive the same selected/default playback rate, and all `play()` calls are issued together. Loop end, blackout pause, re-seek, and restart are coordinated as one cycle.
- Added a two-second preparation fallback so an unusually slow decoder cannot leave the gallery permanently black. Ready tiles remain masked until their assigned frame is available.
- Removed two avoidable media pipelines during gallery playback: the metadata player now unmounts after duration is known, and the prompt player unmounts while choices are active. The prompt is pre-seeked during its short cue delay and remounts for prompt or answer playback.
- Notes now start collapsed. The collapsed Notes control overlays the unused top of the prompt-action rail instead of consuming a separate vertical strip. The prompt-action rail and its buttons are narrower and slightly smaller.
- Updated help text to state that All play is synchronized and that One-by-one or Hover consumes less parallel decoding capacity for unusually demanding files.

Validation:

- `npm run lint`: passed.
- `npm test -- --run`: passed, 8 files / 40 tests.
- `npm run build`: passed.
- `git diff --check`: passed.
- Before the change, the supplied video showed a 0.23-second source-time start spread and more than 1.25 seconds of source-time separation after independent loop restarts. After the change, repeated 4x samples, including a complete loop boundary, stayed within 0.025 source seconds across all three tiles (less than 7 ms displayed-time spread).
- During active gallery playback, the page contained exactly three video elements instead of five; all three reported `playbackRate = defaultPlaybackRate = 4`.
- An 18-sample, 100 ms visual cadence check of a gallery tile produced 18 distinct rendered frames. One-by-one playback retained exactly one active tile at 4x, and Replay prompt stopped every gallery player and ran the prompt at 4x.
- Verified correct-answer hotkey selection, green reveal feedback, responsive collapsed layout, no horizontal overflow at the mobile breakpoint, and no browser warnings or errors.
- A browser cannot request a lower coded resolution from a single-resolution local MP4 track. CSS scaling already fits the display but does not lower HEVC decode cost; adding a browser-side transcode of a multi-gigabyte source would add long preprocessing and substantial memory/storage use, contrary to the direct-play workflow.

## 2026-09-08 course timing, controls, and high-rate playback

- Corrected the timing model so Course range defines source-video bounds, while Answer gap means only the source-time interval from prompt end to the correct continuation start. A large maximum gap no longer shortens the usable course globally; it is clipped only when a sampled prompt is near Course End.
- Added strict recall-mode ordering at a nominal zero-second minimum gap and preserved the selected gap values while trials are regenerated. Sequential progression wraps to Course range start when its next saved position no longer fits.
- Replaced separate Start and End number boxes with a compact, accessible Course range dual slider. Answer gap uses the same dual-slider treatment and a fixed 0-60-second scale. Reorganized the panel into Course timing, Choice playback, and Prompt mask groups with consistent tracks, values, spacing, and inactive-control styling.
- Increased native playback speed to 14x. Above 4x, a wall-clock governor advances lagging media to the expected source timestamp, compensating when the browser accepts a high `playbackRate` but its decoder advances at only about 4x. Native pitch preservation is disabled to reduce unnecessary audio processing.
- One-by-one gallery playback now mounts only the active choice video. All play retains its shared readiness/start barrier and gains the same high-rate wall-clock correction.
- Fresh Sequential Recall and sequential Mental Lap sessions begin at Course range start. Control-driven trial rebuilding is briefly debounced so dragging a range handle does not repeatedly tear down active media.
- Updated README and help text for Course range, Answer gap, 14x behavior, and the high-resolution playback tradeoffs. The GitHub Pages site was intentionally not updated.

Validation:

- `npm install --no-audit --no-fund`: passed; dependencies already current.
- `npm run lint`: passed.
- `npm test -- --run`: passed, 10 files / 55 tests. Coverage includes real control input events, dual-handle ordering, late-course gap clipping, randomized timing invariants, sequential wrapping, one-decoder gallery behavior, and high-rate correction.
- `npm run build`: passed.
- `git diff --check`: passed.
- Browser-tested at 1280x720 with `/Users/yon/Pictures/GX010005.MP4` (3840x2160 HEVC). A sampled prompt ending at 249.488s produced a correct continuation at 295.470s, a 45.982s gap within the configured 1-50s interval; distractors remained outside the protected prompt-answer region.
- At 14x, a one-by-one choice advanced approximately 31.4 source seconds in 2.2 wall seconds with one video decoder mounted. A prompt advanced approximately 56.2 source seconds in 4.0 wall seconds and completed on the configured wall-clock duration.
- The full controls fit a 299x325px allocation without horizontal or vertical scrolling. Prompt, choice, sequential restart, reveal, and keyboard flows were exercised without browser errors or warnings.
- No physical iPadOS validation was performed. All play at 14x with three simultaneous 4K HEVC choices remains hardware-dependent; One-by-one is the efficient default path for demanding media.

## 2026-09-09 Course range gallery-boundary correction

- Published and verified the preceding timing/control revision at commit `09b6b9b` before beginning this correction.
- Reproduced a boundary defect in which a `40-160s` Course range produced a distractor starting at `15.938s`. Prompt and correct-answer sampling already honored the selected range, but remote-distractor sampling still used the complete source-video bounds.
- Passed Course range start and the latest complete in-range clip start into the distractor sampler. Existing exclusion buffers around the prompt and correct answer are unchanged.
- Added a deterministic regression case and extended the randomized timing invariant to require every generated gallery clip to begin at or after Course range start and end at or before Course range end.

Validation:

- `npm run lint`: passed.
- `npm test -- --run`: passed, 10 files / 56 tests.
- `npm run build`: passed.
- Chrome validation used an already loaded local video and an active `4.5-57.3s` range. Random Recall, Sequential Recall, and Weak Spots each generated only complete in-range gallery clips; browser warnings/errors remained empty.

## Remaining limitations

List only real limitations that remain at handoff.

- Direct playback of `.mov` depends on the browser and the video codec. Decode failures are shown inline.
- Weak-spots mode is intentionally lightweight: it falls back to random until at least three anchor stats exist, then biases anchors by first-answer miss rate.
- This project requires Node >=20. The local default Node on this machine is v11.14.0, so use a modern Node on `PATH` for npm commands.
- Notes export/import pure functions are still tested, but visible import/export controls were removed from the main UI per user preference.
- All play still requires one decoder per visible choice. For hardware that cannot sustain several 4K streams at the selected speed, One-by-one, Hover, or a separately encoded lower-resolution source remains the reliable fallback.

## Final handoff summary

- Built: Complete local-first temporal-occlusion recall trainer with file loading, prompt/choice playback, adaptive choice layout, miss retry history, scoring, presets, modes, notes, persistence, export/import logic, sounds, and tests.
- How to run: `npm install`, then `npm run dev` with Node >=20; current dev server is running at `http://127.0.0.1:5175/`.
- Public app: `https://yonvisell.github.io/autoxvision/`.
- How to build: `npm run build`.
- Tests: `npm run lint`, `npm test`, and `npm run build` passed.
- Notes for Yon: Shortcut help is visible in the bottom overlay line. Local videos stay out of git via `.gitignore`.
