# AutoxVision revision harness — 2026-10-17

## Purpose and scope

Keep direct local-video recall practice quick and dependable for approximately ten-minute course walks and occasional one-minute runs. Preserve the current modes, source-time answer gaps, displayed-time prompts, manual next prompt, masking, and compact desktop layout. Recent README/WORKLOG decisions supersede the original MVP where they differ.

## Review and narrowed plan

The review initially considered new training presets, broader adaptive practice, automatic media conversion, and a larger playback rewrite. These add work without addressing the main interruptions and are deferred. Implement only these slices:

1. **Playback reliability:** give each one-by-one choice its complete playback interval after preparation; cancel obsolete playback work; provide a real tap-to-retry when playback is blocked. Retain one active choice decoder and release unused media promptly.
2. **Trial and saved-state correctness:** accept a correct answer once; protect notes during trial/file changes; prevent a one-choice scored quiz when the selected range cannot supply distractors. Explain how to recover when duration/speed/gap cannot fit, particularly for short runs.
3. **Phone usability:** repair collapsed-panel/portrait sizing, preserve minimal outer margins, and enlarge touch targets without enlarging desktop chrome. Provide a concise low-load usage path using existing controls.

Use focused regression tests for confirmed behavior. Avoid new runtime dependencies, mandatory preprocessing, new modes, or changes to learning/scoring semantics beyond defect correction.

## Validation and completion

- Run install, lint/type check, tests, production build, and the dev server.
- Exercise native macOS Chrome with local footage: load, cue, wrong retry, correct reveal, next, modes, notes, and panel controls. Check phone-sized portrait/landscape layout separately.
- Cover delayed playback and rapid input with deterministic component tests; cover short-video/range behavior with trial tests.
- Keep existing notes import/export logic tested; do not restore removed controls solely to satisfy the old MVP checklist.
- Record evidence, local commits, and remaining limitations in WORKLOG.md. Desktop responsive checks do not establish physical iPhone decoding performance. Leave local media and the pre-existing revision document untouched; do not publish.
