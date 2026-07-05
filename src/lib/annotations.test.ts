import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_TOLERANCE,
  createExportFile,
  mergeAnnotations,
  nearestAnnotation,
  parseExportFile,
  upsertAnnotation
} from './annotations';
import type { Annotation } from '../types';

const baseAnnotation: Annotation = {
  id: 'a',
  videoFingerprint: 'video-a',
  t: 2,
  tolerance: ANNOTATION_TOLERANCE,
  text: 'look ahead',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('annotations', () => {
  it('finds nearest annotations within tolerance only', () => {
    expect(nearestAnnotation([baseAnnotation], 2.2)?.id).toBe('a');
    expect(nearestAnnotation([baseAnnotation], 2.4)).toBeNull();
  });

  it('upserts by cue start tolerance', () => {
    const inserted = upsertAnnotation([], 'video-a', 1, 'entry');
    expect(inserted).toHaveLength(1);
    const updated = upsertAnnotation(inserted, 'video-a', 1.1, 'updated');
    expect(updated).toHaveLength(1);
    expect(updated[0].text).toBe('updated');
  });

  it('validates export schema and merges imports', () => {
    const file = createExportFile('video-a', 'video.mov', [baseAnnotation], {});
    expect(parseExportFile(file).annotations[0].text).toBe('look ahead');
    const merged = mergeAnnotations([], file.annotations, 'video-b');
    expect(merged[0].videoFingerprint).toBe('video-b');
  });

  it('rejects invalid schemas', () => {
    expect(() => parseExportFile({ app: 'Other', schemaVersion: 1, annotations: [] })).toThrow(/schema/);
  });
});
