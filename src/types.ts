export type Clip = {
  start: number;
  end: number;
};

export type GalleryItem = {
  id: string;
  clip: Clip;
  isCorrect: boolean;
};

export type Trial = {
  id: string;
  cue: Clip;
  answer: Clip;
  gallery: GalleryItem[];
  cueStart: number;
  createdAt: number;
};

export type Annotation = {
  id: string;
  videoFingerprint: string;
  t: number;
  tolerance: 0.25;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type Mode = 'random' | 'sequential' | 'weakSpots' | 'mentalLap';
export type Preset = 'custom' | 'saved' | 'encoding' | 'learning' | 'performance' | 'pressure';
export type GalleryPlayback = 'sequence' | 'hover' | 'allLoop';

export type Settings = {
  T: number;
  N: number;
  mode: Mode;
  preset: Preset;
  galleryPlayback: GalleryPlayback;
  galleryDelay: number;
  minForwardGap: number;
  maxForwardGap: number;
  replayEnabled: boolean;
  soundEnabled: boolean;
  t0: number;
  t1: number | null;
};

export type AnchorStats = {
  t: number;
  attempts: number;
  wrongs: number;
  corrects: number;
  totalReactionMs: number;
  lastSeenAt: number;
};

export type ExportFile = {
  app: 'AutoxVision';
  schemaVersion: 1;
  exportedAt: string;
  videoFingerprint: string;
  videoName: string;
  annotations: Annotation[];
  settings?: Partial<Settings>;
  scores?: Record<string, unknown>;
};
