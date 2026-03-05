import type { components } from "./generated/api-types.js";

type Schemas = components["schemas"];

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  details?: unknown;
}

export type CityOutput = Schemas["CityOutput"];

export type HumanOutput = Schemas["HumanOutput"];

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
