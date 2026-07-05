# ACCEPTANCE.md — Definition of Done

Codex should not hand back until these criteria are satisfied or explicitly marked with evidence in `WORKLOG.md`.

## Build and repo

- [ ] Local git repo initialized in `~/Documents/AI/AutoxVision/` if one did not already exist.
- [ ] App builds with `npm run build`.
- [ ] App runs locally with `npm run dev`.
- [ ] No CDN runtime dependencies.
- [ ] No backend required.
- [ ] `vendor/README.md` exists; any vendored runtime files, if used, are under `vendor/`.
- [ ] GitHub Pages build is viable, preferably with Vite `base: './'`.

## Video loading

- [ ] User can choose a local video file using a file picker.
- [ ] App reads metadata duration and enables controls after load.
- [ ] App attempts direct browser playback of `.mov` and other browser-playable formats.
- [ ] Decode/load failure is shown as a compact inline message, not a blocking dialog.

## Layout

- [ ] Near full-screen dark UI.
- [ ] Large cue pane occupies the upper majority of the app.
- [ ] Lower row has compact controls on the left and a horizontal video gallery on the right.
- [ ] Score and high score are visible in the upper-left region.
- [ ] Notes field appears near the cue pane with concise grey suggestion text.
- [ ] Contextual help exists for controls without interfering with video hover behavior.

## Trial logic

- [ ] `T` controls both cue duration and answer/gallery clip duration.
- [ ] `N` slider ranges from `2` to `8`, default `3`.
- [ ] Default cue-start sampling is uniform over a valid range.
- [ ] For default quiz modes, the answer clip is exactly the immediate continuation: `[s + T, s + 2*T]`.
- [ ] Valid cue starts are clamped so cue and answer both fit in the video.
- [ ] Gallery includes exactly one correct item and `N - 1` distractors.
- [ ] Gallery items are shuffled.
- [ ] Distractors avoid obvious overlap with the cue/answer when feasible.

## Playback and feedback

- [ ] New trial: `0.25 s` black delay, cue plays for `T`, then cue pane goes black.
- [ ] Gallery clips either loop or play on hover according to the selected playback mode.
- [ ] Clicking a gallery item selects it; there is no confirm button.
- [ ] Incorrect click subtracts `1`, gives quick negative feedback, and leaves the same trial active.
- [ ] Correct click adds `1`, plays a bell, shows green cue border, plays the answer clip in the cue pane, then starts a new trial.
- [ ] User can try again until correct.
- [ ] No `alert()` or `confirm()`.

## Modes and presets

- [ ] Preset dropdown includes encoding, learning, performance, pressure, and custom.
- [ ] Slider/control changes override presets and set preset to custom.
- [ ] Mode dropdown is visually distinct from preset dropdown.
- [ ] Random recall works.
- [ ] Sequential recall advances through time by `T` after correct answers.
- [ ] Weak-spots mode falls back to random until enough history exists, then biases missed/slow anchors.
- [ ] Mental-lap mode hides/disables gallery and uses reveal behavior.

## Notes and persistence

- [ ] Notes autosave locally.
- [ ] Notes are bound to cue start time within `±0.25 s`, not to clip objects.
- [ ] Export annotations writes a valid JSON file.
- [ ] Import annotations merges valid JSON.
- [ ] Import mismatch warning is non-blocking.
- [ ] High score persists per video fingerprint and mode.

## Tests and inspection

- [ ] Pure timing/trial/annotation functions have unit tests.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes, or lint script is intentionally omitted and noted.
- [ ] App visually inspected on localhost.
- [ ] `WORKLOG.md` records commands run, test results, visual notes, and limitations.
