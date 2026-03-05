# Humanaity MCP Server

Node.js + TypeScript MCP server that bridges Humanaity backend APIs over MCP stdio transport.

## Requirements

- Node.js 20+ (Node.js 22 recommended)
- Running Humanaity backend API (default: `http://localhost:8080`)

## Install

```bash
npm install
```

## Configuration

The server reads configuration from environment variables:

- `HUMANAITY_API_BASE_URL` (optional, default `http://localhost:8080`)
- `HUMANAITY_API_TIMEOUT_MS` (optional, default `15000`)
- `HUMANAITY_API_ACCESS_TOKEN` (optional)
- `HUMANAITY_API_REFRESH_TOKEN` (optional)
- `HUMANAITY_API_EMAIL` (optional, enables auto-login fallback)
- `HUMANAITY_API_PASSWORD` (optional, enables auto-login fallback)

Example:

```bash
export HUMANAITY_API_BASE_URL="http://localhost:8080"
export HUMANAITY_API_EMAIL="user@example.com"
export HUMANAITY_API_PASSWORD="your-password"
```

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start built server:

```bash
npm run start
```

## Available MCP tools

### Health

- `health_check`

### Authentication

- `auth_login`
- `auth_refresh`

### Cities

- `cities_list`
- `cities_mine`
- `city_create`

### Humans

- `humans_by_city`

### Simulations

- `simulation_start`
- `simulation_stop`
- `simulation_status`
- `simulation_snapshot` (composite tool: status + humans + derived metrics)

## Token handling behavior

- Most tools accept optional `accessToken`.
- If `accessToken` is omitted, the server uses a cached token if available.
- `auth_login` and `auth_refresh` update the in-process token cache.
- If no token is cached, tools can auto-login when `HUMANAITY_API_EMAIL` and `HUMANAITY_API_PASSWORD` are configured.

## Local smoke-check flow

Use this quick sequence against a local backend:

1. Run `health_check` to verify server startup and config.
2. Run `auth_login` (or rely on configured email/password fallback).
3. Run `cities_mine` to validate authenticated backend access.
4. Pick a city id and run `simulation_status`.
5. Optionally run `simulation_start`, then `simulation_snapshot`, then `simulation_stop`.

If any tool fails, inspect returned `structuredContent.error` and `structuredContent.details` for normalized backend error information.
