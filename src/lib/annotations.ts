import type { Annotation, ExportFile, Settings } from '../types';

export const ANNOTATION_TOLERANCE = 0.25 as const;

export function nearestAnnotation(annotations: Annotation[], cueStart: number): Annotation | null {
  let best: Annotation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const annotation of annotations) {
    const distance = Math.abs(annotation.t - cueStart);
    if (distance <= ANNOTATION_TOLERANCE && distance < bestDistance) {
      best = annotation;
      bestDistance = distance;
    }
  }
  return best;
}

export function upsertAnnotation(
  annotations: Annotation[],
  videoFingerprint: string,
  cueStart: number,
  text: string
): Annotation[] {
  const existing = nearestAnnotation(annotations, cueStart);
  const trimmed = text.trimEnd();
  if (!trimmed && !existing) {
    return annotations;
  }

  const now = new Date().toISOString();
  if (existing) {
    if (!trimmed) {
      return annotations.filter((annotation) => annotation.id !== existing.id);
    }
    return annotations.map((annotation) =>
      annotation.id === existing.id
        ? {
            ...annotation,
            text: trimmed,
            updatedAt: now
          }
        : annotation
    );
  }

  return [
    ...annotations,
    {
      id: `note-${cueStart.toFixed(3)}-${Date.now()}`,
      videoFingerprint,
      t: cueStart,
      tolerance: ANNOTATION_TOLERANCE,
      text: trimmed,
      createdAt: now,
      updatedAt: now
    }
  ].sort((a, b) => a.t - b.t);
}

export function createExportFile(
  videoFingerprint: string,
  videoName: string,
  annotations: Annotation[],
  settings: Partial<Settings>,
  scores?: Record<string, unknown>
): ExportFile {
  return {
    app: 'AutoxVision',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    videoFingerprint,
    videoName,
    annotations,
    settings,
    scores
  };
}

export function parseExportFile(value: unknown): ExportFile {
  if (!value || typeof value !== 'object') {
    throw new Error('Import file is not valid JSON data.');
  }
  const maybe = value as Partial<ExportFile>;
  if (maybe.app !== 'AutoxVision' || maybe.schemaVersion !== 1 || !Array.isArray(maybe.annotations)) {
    throw new Error('Import file does not match the AutoxVision schema.');
  }
  for (const annotation of maybe.annotations) {
    if (!isAnnotation(annotation)) {
      throw new Error('Import file contains an invalid annotation.');
    }
  }
  return maybe as ExportFile;
}

export function mergeAnnotations(existing: Annotation[], incoming: Annotation[], videoFingerprint: string): Annotation[] {
  let merged = [...existing];
  for (const annotation of incoming) {
    const normalized = { ...annotation, videoFingerprint };
    const nearest = nearestAnnotation(merged, normalized.t);
    if (nearest) {
      merged = merged.map((item) =>
        item.id === nearest.id
          ? {
              ...nearest,
              text: normalized.text,
              updatedAt: normalized.updatedAt
            }
          : item
      );
    } else {
      merged.push({ ...normalized, id: `${normalized.id}-import-${Date.now()}` });
    }
  }
  return merged.sort((a, b) => a.t - b.t);
}

function isAnnotation(value: unknown): value is Annotation {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const annotation = value as Annotation;
  return (
    typeof annotation.id === 'string' &&
    typeof annotation.videoFingerprint === 'string' &&
    typeof annotation.t === 'number' &&
    annotation.tolerance === ANNOTATION_TOLERANCE &&
    typeof annotation.text === 'string' &&
    typeof annotation.createdAt === 'string' &&
    typeof annotation.updatedAt === 'string'
  );
}
