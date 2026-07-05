# AGENTS.md — AutoxVision

## Mission
Build **AutoxVision**, a local-first browser app for training autocross course-walk recall from a user-selected video file. The core drill is temporal occlusion: show a short cue clip, black it out, ask the user to select the immediately following clip from a gallery, then give fast feedback and continue.

Work in `~/Documents/AI/AutoxVision/`. Initialize and maintain a local git repo.

## Default implementation choice
Use **Vite + React + TypeScript** unless the existing repo already uses a reasonable equivalent. Use native HTML5 video APIs. Avoid backend services, cloud APIs, CDNs, and heavyweight UI frameworks. Keep runtime dependencies minimal.

Do not add preprocessing as a required step. The app should attempt to play the selected local video file directly via the browser File API/object URLs.

## Development rules
- Read `SPEC.md` and `ACCEPTANCE.md` before coding.
- If ambiguity remains, make the smallest product-faithful assumption and record it in `WORKLOG.md`; do not stop for clarification.
- Use atomic commits after meaningful slices: scaffold, video/trial engine, UI controls, notes/persistence, tests/polish.
- Keep the UI dark, modern, compact, and fast. No modal confirmations, `alert()`, or `confirm()`.
- Use generated Web Audio tones for feedback sounds unless there is a compelling reason to add assets.
- Put any vendored runtime library files in `vendor/`. Prefer no vendored libraries and no CDN imports.
- Keep GitHub Pages deployment simple; Vite `base: './'` is preferred.

## Required verification before handoff
Run the best available local checks:

```bash
npm install
npm run lint
npm test
npm run build
npm run dev
```

Then visually inspect the localhost app. Test with any short local video available; do not commit large video files. If browser automation is available, use it to capture/inspect the main states: no file, video loaded, active trial, wrong feedback, correct feedback, notes export/import.

Update `WORKLOG.md` with what was built, commands run, results, visual-inspection notes, and any remaining limitations.
