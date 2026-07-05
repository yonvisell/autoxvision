# AutoxVision

AutoxVision is a local-first browser app for training autocross course-walk recall from a local video file. It shows a brief cue clip, hides it, and asks the driver to select the next clip from a horizontal video gallery. Correct choices reveal the continuation; incorrect choices give quick negative feedback and let the user try again.

## Quick start

```bash
cd ~/Documents/AI/AutoxVision
npm install
npm run dev
```

Open the localhost URL printed by Vite.

## Basic use

1. Choose a local video file (`.mov`, `.mp4`, `.m4v`, `.webm`, or any browser-playable video).
2. Set clip duration `T` and gallery count `N`.
3. Start a trial.
4. Watch the cue clip in the large window.
5. After the cue goes black, click the gallery clip that immediately follows it in the source video.
6. Correct: `+1`, green cue border, bell, continuation plays in the cue window.
7. Wrong: `-1`, red feedback, brief error sound, try again until correct.

The video remains local in the browser. It is not uploaded.

## UI layout

- Upper cue area: large video window, near full width, about two thirds of app height by default.
- Lower area: compact dark controls on the left; horizontal gallery on the right.
- Score and high score appear in the upper-left region.
- A small notes field sits near the cue video, with concise helper text underneath.
- Contextual help appears through hover text or small grey helper phrases, not on video hover.

## Controls

- Video file picker.
- Cue length slider: cue and answer/gallery clip duration, default `2.5s`.
- Choices slider: number of gallery items, range `2–8`, default `3`.
- Gallery pause slider: blackout/pause before each candidate in sequence playback.
- Preset dropdown: quick settings for encoding, learning, performance, and pressure.
- Save preset button: stores the current control setup as the saved preset.
- Mode dropdown: random recall, sequential recall, weak spots, and mental lap.
- Gallery playback: sequence clips one at a time by default, play clips on hover, or loop all clips.
- Replay setting: allow cue replay and, if implemented cleanly, small replay affordances for gallery tiles without changing primary click-to-select behavior.
- Advanced range controls: optional `t0` and `t1` bounds in seconds.
- Sound mute and reset score.

## Notes and persistence

Notes are bound to the current cue start time within a `±0.25 s` tolerance. They autosave locally using a video fingerprint based on file name, size, and last-modified timestamp. Export/import JSON is provided for disk persistence and transfer.

## Build

```bash
npm run build
```

The production app should build to `dist/` and work on GitHub Pages. Prefer Vite config with `base: './'`.
