import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BackendClient } from "../backend-client.js";
import { toToolError } from "../errors.js";

export function registerHumanTools(server: McpServer, backendClient: BackendClient): void {
  server.tool(
    "humans_by_city",
    "List all humans for a given city.",
    {
      cityId: z.string().min(1),
      accessToken: z.string().min(1).optional(),
    },
    async ({ cityId, accessToken }) => {
      try {
        const humans = await backendClient.humansByCity(cityId, accessToken);
        return {
          content: [{ type: "text", text: `Fetched ${humans.length} humans for city ${cityId}.` }],
          structuredContent: { ok: true, cityId, humans },
        };
      } catch (error: unknown) {
        const normalized = toToolError(error);
        return {
          isError: true,
          content: [{ type: "text", text: normalized.message }],
          structuredContent: {
            ok: false,
            error: normalized.message,
            details: normalized.details,
          },
        };
      }
    },
  );
}
