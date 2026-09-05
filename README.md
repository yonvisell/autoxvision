# AutoxVision

AutoxVision is a local-first browser app for training autocross course-walk recall from a local video file. It shows a brief prompt, hides it, and asks the driver to identify the nearest upcoming clip in a video gallery. Correct choices reveal the continuation; incorrect choices give quick negative feedback and remain available for another attempt.

## Quick start

```bash
cd ~/Documents/AI/AutoxVision
npm install
npm run dev
```

Open the localhost URL printed by Vite.

Public app: <https://yonvisell.github.io/autoxvision/>

The in-app `?` link opens the complete usage instructions.

## Basic use

1. Choose a local video file (`.mov`, `.mp4`, `.m4v`, `.webm`, or any browser-playable video).
2. Choose a recall mode, displayed prompt length, playback speed, and gallery count.
3. Watch the prompt once in the large window.
4. After the prompt goes black, click the gallery clip that begins nearest in course time after it.
5. Use the prompt-through-answer replay to reinforce the connection, then start the next trial.
6. Correct: `+1`, green cue border, bell, continuation plays in the cue window.
7. Wrong: `-1`, red feedback, brief error sound, try again until correct.

The video remains local in the browser. It is not uploaded.

## UI layout

- Upper prompt area: large video window with a horizontally collapsible notes panel.
- Lower area: adaptive video gallery with compact, collapsible controls on the right.
- Score and high score appear in the upper-left region.
- A small notes field sits near the cue video, with concise helper text underneath.
- Contextual help appears through hover text or small grey helper phrases, not on video hover.

## Controls

- Video file picker.
- Prompt length slider: displayed prompt and continuation duration, default `10.0s`; source-video span scales with playback speed.
- Choices slider: number of gallery items, range `2–8`, default `3`.
- Choice wait slider: blackout before the gallery becomes active and separation between one-by-one choices.
- Loop pause number control: delay before Hover or All play gallery clips restart, default `0.5s`.
- Mode dropdown: Random recall mode, Sequential recall mode, Weak spots mode, and Mental lap mode.
- Gallery playback: sequence clips one at a time by default, play clips on hover, or preload and loop all clips on a shared clock at the selected speed.
- Sequential position slider: jump within the active Start-to-End course range.
- Replay setting: allow prompt replay while answering; sequential mode also offers a full-answer replay after a correct reveal.
- Prompt masking controls: optionally blur and/or fade a configurable lower portion during prompt playback only; gallery and answer replays remain clear.
- Start and End controls: restrict the course region used for prompts.
- Preset dropdown at the bottom: apply built-in settings or a saved local preset without changing the active course range.
- Sound mute and reset score.

## Notes and persistence

Notes are bound to the current cue start time within a `±0.25 s` tolerance. They autosave locally using a video fingerprint based on file name, size, and last-modified timestamp. Export/import JSON is provided for disk persistence and transfer.

## Build

```bash
npm run build
```

The production app should build to `dist/` and work on GitHub Pages. Prefer Vite config with `base: './'`.
