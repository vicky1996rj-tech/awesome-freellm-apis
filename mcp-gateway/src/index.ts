import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const README_URL =
  "https://raw.githubusercontent.com/open-free-llm-api/awesome-freellm-apis/main/README.md";
const EXAMPLE_BASE =
  "https://raw.githubusercontent.com/open-free-llm-api/awesome-freellm-apis/main/code-examples";

type Provider = {
  provider: string;
  freeModels?: string;
  creditRequirement?: string;
  maxContext?: string;
  modalities?: string;
  baseUrl?: string;
  apiKeyUrl?: string;
  tier?: string;
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "awesome-freellm-apis-mcp/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function cleanCell(value: string): string {
  return value
    .replace(/<a[^>]*href="([^"]*)"[^>]*>.*?<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\`/g, "")
    .split("**").join("")
    .trim();
}

function section(markdown: string, startMarker: string, endMarker: string): string {
  const start = markdown.indexOf(startMarker);
  const end = markdown.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) return "";
  return markdown.slice(start + startMarker.length, end);
}

function parseTable(block: string): string[][] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map(cleanCell))
    .filter((row) => row.length > 1)
    .filter((row) => !row.every((cell) => /^-+$/.test(cell.replace(/:/g, ""))))
    .slice(1);
}

function parseProviders(markdown: string): Provider[] {
  const permanent = parseTable(
    section(markdown, "<!-- BEGIN_PERMANENT_FREE -->", "<!-- END_PERMANENT_FREE -->")
  ).map((r) => ({
    provider: r[0] || "",
    freeModels: r[1] || "",
    creditRequirement: r[2] || "",
    maxContext: r[3] || "",
    modalities: r[4] || "",
    apiKeyUrl: r[5] || "",
    tier: "permanent-free",
  }));

  const renewable = parseTable(
    section(markdown, "<!-- BEGIN_RENEWABLE -->", "<!-- END_RENEWABLE -->")
  ).map((r) => ({
    provider: r[0] || "",
    freeModels: r[1] || "",
    creditRequirement: r[2] || "",
    maxContext: r[3] || "",
    modalities: r[4] || "",
    apiKeyUrl: r[5] || "",
    tier: "renewable-credits",
  }));

  const quickRef = parseTable(
    section(markdown, "<!-- BEGIN_QUICK_REF -->", "<!-- END_QUICK_REF -->")
  );

  const byName = new Map<string, Provider>();
  for (const p of [...permanent, ...renewable]) {
    byName.set(p.provider.toLowerCase(), p);
  }

  for (const r of quickRef) {
    const key = (r[0] || "").toLowerCase();
    const current = byName.get(key) || { provider: r[0] || "" };
    current.baseUrl = r[1] || "";
    current.apiKeyUrl = r[2] || current.apiKeyUrl || "";
    current.creditRequirement =
      current.creditRequirement || r[3] || "";
    byName.set(key, current);
  }

  return [...byName.values()].filter((p) => p.provider);
}

function extractLastUpdated(markdown: string): string | null {
  const m = markdown.match(/Last updated:\s*([^<\n]+)/i);
  return m ? m[1].trim() : null;
}

function asText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: "awesome-freellm-apis",
    version: "1.0.0",
  });

  server.registerTool(
    "repo_status",
    {
      description:
        "Show the source repository and its latest README refresh date.",
      inputSchema: z.object({}),
    },
    async () => {
      const markdown = await fetchText(README_URL);
      return asText({
        repository:
          "https://github.com/open-free-llm-api/awesome-freellm-apis",
        fork: "https://github.com/vicky1996rj-tech/awesome-freellm-apis",
        lastUpdated: extractLastUpdated(markdown),
      });
    }
  );

  server.registerTool(
    "list_free_providers",
    {
      description:
        "List free LLM API providers from awesome-freellm-apis with tier, model count, context, modalities, base URL, and API-key URL.",
      inputSchema: z.object({
        tier: z
          .enum(["all", "permanent-free", "renewable-credits"])
          .default("all"),
      }),
    },
    async ({ tier }) => {
      const markdown = await fetchText(README_URL);
      let providers = parseProviders(markdown);
      if (tier !== "all") providers = providers.filter((p) => p.tier === tier);
      return asText({
        sourceUpdated: extractLastUpdated(markdown),
        count: providers.length,
        providers,
      });
    }
  );

  server.registerTool(
    "search_free_providers",
    {
      description:
        "Search the free LLM API directory by provider name, modality, base URL, context, or tier.",
      inputSchema: z.object({
        query: z.string().min(1),
      }),
    },
    async ({ query }) => {
      const markdown = await fetchText(README_URL);
      const q = query.toLowerCase();
      const matches = parseProviders(markdown).filter((p) =>
        JSON.stringify(p).toLowerCase().includes(q)
      );
      return asText({
        query,
        sourceUpdated: extractLastUpdated(markdown),
        count: matches.length,
        matches,
      });
    }
  );

  server.registerTool(
    "get_provider",
    {
      description:
        "Get configuration details for one provider from the live free LLM API directory.",
      inputSchema: z.object({
        provider: z.string().min(1),
      }),
    },
    async ({ provider }) => {
      const markdown = await fetchText(README_URL);
      const q = provider.toLowerCase();
      const providers = parseProviders(markdown);
      const exact = providers.find((p) => p.provider.toLowerCase() === q);
      const fuzzy = providers.filter((p) =>
        p.provider.toLowerCase().includes(q)
      );
      return asText({
        sourceUpdated: extractLastUpdated(markdown),
        result: exact || null,
        similar: exact ? [] : fuzzy.slice(0, 10),
      });
    }
  );

  server.registerTool(
    "get_tool_setup_example",
    {
      description:
        "Get the upstream setup guide for Codex, Cursor, or Claude Code.",
      inputSchema: z.object({
        tool: z.enum(["codex", "cursor", "claude-code"]),
      }),
    },
    async ({ tool }) => {
      const text = await fetchText(`${EXAMPLE_BASE}/${tool}.md`);
      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );

  return server;
});

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "awesome-freellm-apis-mcp",
        mcpEndpoint: "/mcp",
      });
    }
    if (url.pathname !== "/mcp") {
      return new Response(
        "awesome-freellm-apis MCP gateway\nMCP endpoint: /mcp\nHealth: /health\n",
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return handler.fetch(request);
  },
};
