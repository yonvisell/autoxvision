# SPEC.md — AutoxVision Functional Specification

## 1. Product objective

Create a fast, low-friction browser app that makes course-walk video review active. The app trains recall of the immediately upcoming visual state from a brief first-person cue.

The MVP is not a general video editor and not a cone-understanding system. It is a temporal-occlusion recall trainer driven directly from a local video file.

## 2. Stack and architecture

Preferred stack:

- Vite
- React
- TypeScript
- Native HTML5 `<video>` elements
- CSS modules or plain CSS
- Vitest for pure logic tests

Runtime constraints:

- No backend.
- No video upload.
- No required preprocessing.
- No CDN imports.
- Browser File API/object URL for selected videos.
- Local autosave via `localStorage` or IndexedDB; JSON export/import for disk persistence.

Recommended source structure:

```text
src/
  App.tsx
  components/
    CuePane.tsx
    Gallery.tsx
    ControlPanel.tsx
    ScoreBadge.tsx
    NotesBox.tsx
  lib/
    clipMath.ts
    trialEngine.ts
    persistence.ts
    sounds.ts
    videoFingerprint.ts
  styles/
    app.css
vendor/
  README.md
```

## 3. Core data model

Use seconds for all video times.

```ts
type Clip = {
  start: number;
  end: number;
};

type GalleryItem = {
  id: string;
  clip: Clip;
  isCorrect: boolean;
};

type Trial = {
  id: string;
  cue: Clip;
  answer: Clip;
  gallery: GalleryItem[];
  cueStart: number;
  createdAt: number;
};

type Annotation = {
  id: string;
  videoFingerprint: string;
  t: number;              // cue start time
  tolerance: 0.25;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  T: number;
  N: number;
  mode: 'random' | 'sequential' | 'weakSpots' | 'mentalLap';
  preset: 'custom' | 'encoding' | 'learning' | 'performance' | 'pressure';
  galleryPlayback: 'loop' | 'hover';
  replayEnabled: boolean;
  soundEnabled: boolean;
  t0: number;
  t1: number | null;
};
```

`videoFingerprint` should be deterministic for a selected file, for example:

```ts
`${file.name}:${file.size}:${file.lastModified}`
```

## 4. Trial timing

Let:

- `T` = cue duration = gallery/answer clip duration.
- `EPS` = frame-ish guard interval, default `1 / 30` seconds.
- `duration` = video duration after metadata loads.
- `t0` = lower sample bound, default `0`.
- `t1` = upper cue-start sample bound.

For the default next-state quiz, the correct answer is the immediate continuation of the cue, so both cue and answer must fit:

```ts
cue    = [s,     s + T]
answer = [s + T, s + 2*T]
```

Therefore the default maximum cue-start time is:

```ts
defaultT1 = max(t0, duration - 2*T - EPS)
```

If the user sets `t1`, clamp it to `duration - 2*T - EPS` for quiz modes. If the video is too short for `2*T`, disable trials and show a small grey inline message.

## 5. Trial algorithm

### 5.1 New trial generation

For `random` mode:

1. Sample cue start `s ~ Uniform(t0, t1)`.
2. Set cue clip `[s, s + T]`.
3. Set answer clip `[s + T, s + 2*T]`.
4. Create `N - 1` distractor clips of duration `T`.
5. Distractors are sampled uniformly from playable video times, excluding clips too close to the cue or answer.
6. Shuffle the correct answer and distractors.

Distractor exclusion guidance:

```ts
minSeparation = max(0.5, 2*T)
reject distractor start d if abs(d - s) < minSeparation
reject d if abs(d - (s + T)) < minSeparation
reject d if it overlaps another gallery item too closely
```

Use capped resampling attempts; if necessary, relax separation before failing.

### 5.2 Sequential mode

Start from a random valid `s`. After a correct answer reveal, advance by `T` seconds:

```ts
nextS = previousS + T
```

If `nextS > t1`, wrap by sampling a new valid random start. Gallery and feedback behavior remain the same as random mode.

### 5.3 Weak-spots mode

Maintain lightweight per-anchor stats keyed by rounded cue start, e.g. nearest `0.25 s`:

```ts
type AnchorStats = {
  t: number;
  attempts: number;
  wrongs: number;
  corrects: number;
  totalReactionMs: number;
  lastSeenAt: number;
};
```

Sampling weight should increase for anchors with recent wrong answers and slower reaction times. If there is not enough history, fall back to random mode.

### 5.4 Mental-lap mode

Hide or disable the gallery. The cue plays `[s, s + T]`, then the cue pane goes black. User presses `Reveal` or Space to play `[s + T, s + 2*T]` with a green border, then the app advances by `T`. Score need not change in this mode. Keep this simple.

## 6. Playback behavior

### 6.1 Trial start

1. Cue pane is black for `0.25 s`.
2. Cue clip plays for duration `T` in the large cue window.
3. Cue pane goes black.
4. Gallery remains available for selection.

### 6.2 Gallery clips

Each gallery item is a muted video clip using the same object URL as the cue video.

Two playback modes:

- `loop`: all gallery clips loop their assigned `[start, end]` range.
- `hover`: gallery items show a still frame by default and play their clip while hovered/focused.

Primary click on a gallery tile always selects that item as the answer. Do not require a separate confirmation button.

If replay controls are enabled, preserve click-to-select. Use cue-pane click/Space for cue replay, and only add gallery replay if it can be done with a small unambiguous replay affordance inside the tile.

### 6.3 Correct answer

On correct selection:

1. Add `+1` to score.
2. Update high score if current score exceeds it.
3. Play a friendly bell sound if sound is enabled.
4. After a short delay, play the answer clip in the cue window.
5. Show a green cue border while the answer plays.
6. After the answer finishes, generate the next trial.

### 6.4 Incorrect answer

On incorrect selection:

1. Subtract `1` from score.
2. Play a short negative sound if sound is enabled.
3. Flash the chosen tile red and/or show a compact wrong toast.
4. Keep the same trial active.
5. User tries again until correct.

Do not use blocking dialogs.

## 7. Controls and presets

Controls live in a compact dark panel at the lower-left, visually grouped to the left of the gallery.

Required controls:

- File picker: `accept="video/*,.mov,.mp4,.m4v,.webm"`.
- `T` slider: suggested range `0.25–3.0 s`, default `0.5 s`, step `0.05 s`.
- `N` slider: range `2–8`, default `3`, integer step.
- Preset dropdown.
- Mode dropdown, visually distinct from preset dropdown.
- Gallery playback radio: loop vs hover.
- Replay enabled checkbox/radio.
- Sound enabled checkbox.
- Reset score button.
- Export annotations button.
- Import annotations button.

Optional but useful controls:

- Advanced `t0` and `t1` numeric fields in seconds.
- Cue/gallery split-size control or draggable divider.

Preset behavior:

- Presets set multiple controls at once.
- Direct slider/control changes override presets and set preset to `custom`.

Suggested presets:

```ts
encoding:    { T: 2.0,  N: 2, replayEnabled: true,  galleryPlayback: 'loop'  }
learning:    { T: 1.0,  N: 3, replayEnabled: true,  galleryPlayback: 'loop'  }
performance: { T: 0.5,  N: 4, replayEnabled: false, galleryPlayback: 'hover' }
pressure:    { T: 0.5,  N: 6, replayEnabled: false, galleryPlayback: 'hover' }
```

## 8. Layout and visual design

Default layout:

```text
┌──────────────────────────────────────────────┐
│ score/high score      cue pane      notes     │  ~65% height
│                    [large video]              │
├───────────────┬──────────────────────────────┤
│ controls      │ horizontal video gallery      │  ~35% height
│ compact/dark  │ [clip] [clip] [clip] ...      │
└───────────────┴──────────────────────────────┘
```

Design requirements:

- Near full screen, responsive, dark background.
- Cue pane dominates the screen.
- Gallery is horizontal and scrollable if needed.
- Selected/wrong/correct states are visually obvious but not cluttered.
- Small grey helper phrases explain app controls only.
- Hover help should use `title` or lightweight custom tooltips, but not on video hover because hover may control playback.
- No visual bloat, no decorative animations that slow use.

## 9. Notes and annotations

Add a small free-text notes field near the cue pane.

Behavior:

- On each trial, find the annotation whose `t` is within `±0.25 s` of current `cueStart` and nearest in time.
- If found, load it into the notes field.
- If none exists, show an empty field.
- Debounced autosave creates/updates an annotation bound to the current `cueStart` time, not to a clip object.
- Suggestion text below field: short, grey, app-use oriented. Example: `Terse cue: visual anchor, intended look-ahead, or next-state reminder.`

Export JSON:

```ts
type ExportFile = {
  app: 'AutoxVision';
  schemaVersion: 1;
  exportedAt: string;
  videoFingerprint: string;
  videoName: string;
  annotations: Annotation[];
  settings?: Partial<Settings>;
  scores?: Record<string, unknown>;
};
```

Import JSON:

- Merge annotations by nearest time when `videoFingerprint` matches.
- If the fingerprint differs, allow import but show a small non-blocking warning that the notes may refer to another video.
- No `alert()` or `confirm()`.

## 10. Score and high score

- Correct selection: `+1`.
- Incorrect selection: `-1`.
- Show cumulative score and high score in the upper-left region.
- Persist high score per video fingerprint and mode.
- High score updates immediately when exceeded.
- Include a reset score button; reset current score only unless a separate clear-high-score control is added.

## 11. Error handling

Show small inline messages for:

- No video selected.
- Browser cannot load/decode selected video.
- Video is too short for current `T`.
- Notes import has invalid schema.

Do not use blocking dialogs.

## 12. Keyboard shortcuts

Implement if simple:

- Number keys `1–8`: select gallery item.
- Space: replay cue when replay is enabled; reveal in mental-lap mode.
- `R`: replay cue when replay is enabled.
- `M`: mute/unmute sounds.

Keyboard shortcuts must not interfere with typing in the notes field.

## 13. Testing targets

Unit-test pure functions:

- `clampT1(duration, T, t0, userT1)`.
- Random cue generation stays in bounds.
- Answer clip equals immediate continuation.
- Distractors do not overlap forbidden windows when feasible.
- Presets set expected values and sliders override to `custom`.
- Annotation nearest-time binding within `±0.25 s`.
- Export/import schema validation and merge behavior.

Manual/visual-test app states:

- Empty app before file load.
- Loaded video with metadata and controls enabled.
- Cue play → black → gallery selection.
- Wrong answer penalty and retry.
- Correct answer reveal and next trial.
- Notes autosave, export, import.
- Mode and preset dropdown behavior.
