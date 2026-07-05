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
```

Visual inspection:

- Browser: In-app browser for no-file layout; Playwright with local Google Chrome for file-backed flows.
- Video used: Generated temporary `/tmp/autoxvision-test.webm`; no media committed. The existing `AAXLPM1.MOV` remains ignored.
- States inspected: no file, video loaded/active trial, wrong feedback, correct reveal, notes autosave/export/import, mental-lap gallery-hidden state.
- Screenshots: `/tmp/autoxvision-shots/01-no-file.png` through `/tmp/autoxvision-shots/05-mental-lap.png`.
- Issues found and fixed: first screenshot showed controls/gallery below the viewport, then later screenshots showed cue video overflow over the gallery. CSS grid sizing and cue video absolute fill fixed both; final automated overlap check passed.

## Remaining limitations

List only real limitations that remain at handoff.

- Direct playback of `.mov` depends on the browser and the video codec. Decode failures are shown inline.
- Weak-spots mode is intentionally lightweight: it falls back to random until at least three anchor stats exist, then biases recent wrong/slow anchors.
- This project requires Node >=20. The local default Node on this machine is v11.14.0, so use a modern Node on `PATH` for npm commands.

## Final handoff summary

- Built: Complete local-first temporal-occlusion recall trainer with file loading, cue/gallery playback, scoring, presets, modes, notes, persistence, export/import, sounds, and tests.
- How to run: `npm install`, then `npm run dev` with Node >=20; local URL is `http://127.0.0.1:5173/`.
- How to build: `npm run build`.
- Tests: `npm run lint`, `npm test`, and `npm run build` passed.
- Notes for Yon: Shortcut help is visible in the controls area. Local videos stay out of git via `.gitignore`.
