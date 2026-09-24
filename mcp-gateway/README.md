# awesome-freellm-apis MCP gateway

A read-only remote MCP gateway for the `awesome-freellm-apis` directory.

## What it exposes

- `repo_status`
- `list_free_providers`
- `search_free_providers`
- `get_provider`
- `get_tool_setup_example`

The gateway fetches the upstream README at call time, so provider data stays aligned with the source repository. It stores no API keys.

## Run locally

```bash
cd mcp-gateway
npm install
npm run dev
```

The MCP endpoint is:

```
http://127.0.0.1:8787/mcp
```

Health endpoint:

```
http://127.0.0.1:8787/health
```

## Deploy to Cloudflare Workers

```bash
npm install
npx wrangler login
npm run deploy
```

Wrangler prints a public `workers.dev` URL. The MCP endpoint is:

```
https://<worker-host>/mcp
```

## ChatGPT

ChatGPT custom MCP apps require a remote MCP endpoint. After deployment, use the `/mcp` URL when creating a custom app/connector in a ChatGPT plan/workspace that supports custom MCP.

This server is intentionally read-only and requires no provider API secrets. Provider API keys are still required separately if you later extend it to make model calls.
