export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  details?: unknown;
}

export interface CityOutput {
  id: number;
  name: string;
  humans?: unknown[] | null;
}

export interface HumanOutput {
  id: number;
  busy?: boolean;
  isBusy?: boolean;
  name: string;
  x: number;
  y: number;
  creativity?: number;
  intellect?: number;
  sociability?: number;
  practicality?: number;
  personality?: string;
  scienceSkill?: number;
  cultureSkill?: number;
  socialSkill?: number;
  totalScienceContributed?: number;
  totalCultureContributed?: number;
  totalSocialContributed?: number;
}

export interface SimulationStatus {
  running: boolean;
}

export interface SnapshotMetrics {
  count: number;
  busyCount: number;
  busyRatio: number;
  centroid: {
    x: number;
    y: number;
  } | null;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
}

export interface SimulationSnapshot {
  cityId: string;
  running: boolean;
  humans: HumanOutput[];
  metrics: SnapshotMetrics;
}
