# Handoff brief for Codex — AutoxVision

You are working in `~/Documents/AI/AutoxVision/`. Build **AutoxVision**, a local-first browser app for training autocross course-walk recall from a user-selected video file.

Core drill:

1. User selects a local video file.
2. App samples a cue start time.
3. Cue pane waits `0.25 s`, plays a `T`-second cue clip, then goes black.
4. Gallery shows `N` candidate video clips.
5. User clicks the clip that immediately follows the cue in the source video.
6. Wrong: `-1`, quick negative feedback, same trial remains active.
7. Correct: `+1`, bell, green cue border, answer clip plays in cue pane, then next trial starts.

Read these files before proceeding:

- `AGENTS.md`
- `SPEC.md`
- `ACCEPTANCE.md`
- `README.md`
- `WORKLOG.md`

Default to Vite + React + TypeScript, native HTML5 video, no backend, no CDN imports, no required preprocessing, and simple GitHub Pages compatibility. Initialize a local git repo if needed and commit meaningful slices.

Proceed efficiently. Do not block on clarification. Make minimal assumptions, record them in `WORKLOG.md`, implement, test, visually inspect localhost, revise until the acceptance criteria are met, then hand back a concise summary with commands run and any real limitations.
