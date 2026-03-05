import type { AppConfig } from "./config.js";
import { BackendApiError } from "./errors.js";
import type {
  AuthTokens,
  CityOutput,
  HumanOutput,
  SimulationSnapshot,
  SimulationStatus,
} from "./contracts.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  body?: unknown;
  accessToken?: string;
}

class TokenStore {
  private accessToken?: string;
  private refreshToken?: string;

  constructor(initial?: Partial<AuthTokens>) {
    this.accessToken = initial?.accessToken;
    this.refreshToken = initial?.refreshToken;
  }

  get access(): string | undefined {
    return this.accessToken;
  }

  get refresh(): string | undefined {
    return this.refreshToken;
  }

  set(tokens: Partial<AuthTokens>): void {
    if (tokens.accessToken) {
      this.accessToken = tokens.accessToken;
    }
    if (tokens.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }
  }
}

export class BackendClient {
  private readonly config: AppConfig;
  private readonly tokenStore: TokenStore;

  constructor(config: AppConfig) {
    this.config = config;
    this.tokenStore = new TokenStore({
      accessToken: config.apiAccessToken,
      refreshToken: config.apiRefreshToken,
    });
  }

  getCachedTokens(): Partial<AuthTokens> {
    return {
      accessToken: this.tokenStore.access,
      refreshToken: this.tokenStore.refresh,
    };
  }

  async authLogin(email?: string, password?: string): Promise<AuthTokens> {
    const resolvedEmail = email ?? this.config.apiEmail;
    const resolvedPassword = password ?? this.config.apiPassword;

    if (!resolvedEmail || !resolvedPassword) {
      throw new Error(
        "Email/password not provided. Pass them to auth_login or configure HUMANAITY_API_EMAIL and HUMANAITY_API_PASSWORD.",
      );
    }

    const tokens = await this.request<AuthTokens>("POST", "/auth/login", {
      body: {
        email: resolvedEmail,
        password: resolvedPassword,
      },
    });

    this.tokenStore.set(tokens);
    return tokens;
  }

  async authRefresh(refreshToken?: string): Promise<AuthTokens> {
    const effectiveRefreshToken = refreshToken ?? this.tokenStore.refresh;
    if (!effectiveRefreshToken) {
      throw new Error(
        "Refresh token not provided. Pass refreshToken to auth_refresh or run auth_login first.",
      );
    }

    const tokens = await this.request<AuthTokens>("POST", "/auth/refresh", {
      body: { refreshToken: effectiveRefreshToken },
    });

    this.tokenStore.set(tokens);
    return tokens;
  }

  async listCities(accessToken?: string): Promise<CityOutput[]> {
    return this.request<CityOutput[]>("GET", "/api/cities", {
      accessToken: await this.resolveAccessToken(accessToken),
    });
  }

  async listMyCities(accessToken?: string): Promise<CityOutput[]> {
    return this.request<CityOutput[]>("GET", "/api/cities/mine", {
      accessToken: await this.resolveAccessToken(accessToken),
    });
  }

  async createCity(name: string, accessToken?: string): Promise<CityOutput> {
    return this.request<CityOutput>("POST", "/api/cities", {
      accessToken: await this.resolveAccessToken(accessToken),
      body: { name },
    });
  }

  async humansByCity(
    cityId: string,
    accessToken?: string,
  ): Promise<HumanOutput[]> {
    return this.request<HumanOutput[]>(
      "GET",
      `/api/humans/city/${encodeURIComponent(cityId)}`,
      {
        accessToken: await this.resolveAccessToken(accessToken),
      },
    );
  }

  async simulationStart(
    cityId: string,
    accessToken?: string,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      "POST",
      `/api/simulations/${encodeURIComponent(cityId)}/start`,
      {
        accessToken: await this.resolveAccessToken(accessToken),
      },
    );
  }

  async simulationStop(
    cityId: string,
    accessToken?: string,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      "POST",
      `/api/simulations/${encodeURIComponent(cityId)}/stop`,
      {
        accessToken: await this.resolveAccessToken(accessToken),
      },
    );
  }

  async simulationStatus(
    cityId: string,
    accessToken?: string,
  ): Promise<SimulationStatus> {
    return this.request<SimulationStatus>(
      "GET",
      `/api/simulations/${encodeURIComponent(cityId)}/status`,
      {
        accessToken: await this.resolveAccessToken(accessToken),
      },
    );
  }

  async simulationSnapshot(
    cityId: string,
    accessToken?: string,
  ): Promise<SimulationSnapshot> {
    const [status, humans] = await Promise.all([
      this.simulationStatus(cityId, accessToken),
      this.humansByCity(cityId, accessToken),
    ]);

    const busyCount = humans.filter((human) => human.busy ?? false).length;
    const count = humans.length;
    const busyRatio = count === 0 ? 0 : busyCount / count;

    const validCoordinates = humans.filter(
      (human) => Number.isFinite(human.x) && Number.isFinite(human.y),
    );

    const centroid =
      validCoordinates.length === 0
        ? null
        : {
            x:
              validCoordinates.reduce((sum, human) => sum + human.x, 0) /
              validCoordinates.length,
            y:
              validCoordinates.reduce((sum, human) => sum + human.y, 0) /
              validCoordinates.length,
          };

    const bounds =
      validCoordinates.length === 0
        ? null
        : {
            minX: Math.min(...validCoordinates.map((human) => human.x)),
            maxX: Math.max(...validCoordinates.map((human) => human.x)),
            minY: Math.min(...validCoordinates.map((human) => human.y)),
            maxY: Math.max(...validCoordinates.map((human) => human.y)),
          };

    return {
      cityId,
      running: status.running,
      humans,
      metrics: {
        count,
        busyCount,
        busyRatio,
        centroid,
        bounds,
      },
    };
  }

  private async resolveAccessToken(
    explicitAccessToken?: string,
  ): Promise<string> {
    if (explicitAccessToken) {
      return explicitAccessToken;
    }

    if (this.tokenStore.access) {
      return this.tokenStore.access;
    }

    if (this.config.apiEmail && this.config.apiPassword) {
      const tokens = await this.authLogin(
        this.config.apiEmail,
        this.config.apiPassword,
      );
      return tokens.accessToken;
    }

    throw new Error(
      "Access token missing. Pass `accessToken`, run auth_login, or set HUMANAITY_API_EMAIL and HUMANAITY_API_PASSWORD.",
    );
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, this.config.requestTimeoutMs);

    try {
      const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(options?.accessToken
            ? { Authorization: `Bearer ${options.accessToken}` }
            : {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const payload = await this.readPayload(response);
      if (!response.ok) {
        const message =
          this.extractErrorMessage(payload) ?? response.statusText;
        throw new BackendApiError({
          status: response.status,
          path,
          message,
          payload,
        });
      }

      return payload as T;
    } catch (error: unknown) {
      if (error instanceof BackendApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Request timeout after ${this.config.requestTimeoutMs}ms for ${path}`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private async readPayload(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { message: text };
    }
  }

  private extractErrorMessage(payload: unknown): string | undefined {
    if (!payload || typeof payload !== "object") {
      return undefined;
    }

    const candidate = payload as { message?: unknown; error?: unknown };
    if (typeof candidate.message === "string" && candidate.message.length > 0) {
      return candidate.message;
    }
    if (typeof candidate.error === "string" && candidate.error.length > 0) {
      return candidate.error;
    }

    return undefined;
  }
}
