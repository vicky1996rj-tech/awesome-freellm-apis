import { createServer } from "node:http";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { handler } from "./index.js";

const port = Number(process.env.PORT || 3000);
const nodeHandler = toNodeHandler(handler);

createServer((req, res) => {
  if (req.url === "/health") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, service: "awesome-freellm-apis-mcp", mcpEndpoint: "/mcp" }));
    return;
  }

  if (req.url?.startsWith("/mcp")) {
    void nodeHandler(req, res);
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(["awesome-freellm-apis MCP gateway", "MCP endpoint: /mcp", "Health: /health", ""].join("\n"));
}).listen(port, "0.0.0.0", () => {
  console.error(`awesome-freellm-apis MCP listening on :${port}`);
});
