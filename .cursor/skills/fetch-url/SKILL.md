---
name: fetch-url
description: [research|url-ingestion] Fetch webpage content with hard timeout for agent context ingestion
---

# Fetch URL

Use the provided script to fetch webpage content safely with hard timeouts, then output a structured plain-text payload that LLM agents can parse.

## Usage

Run the script:

`node scripts/fetch-url.js <url> [--timeout <seconds>] [--max-chars <count>]`

Examples:
- `node scripts/fetch-url.js "https://kubernetes.io/docs/home/"`
- `node scripts/fetch-url.js "https://example.com" --timeout 20 --max-chars 24000`

Output is clean markdown with title, description, and main content—optimized for AI context ingestion.

## Agent instructions

- Use this skill whenever you need live webpage content in context.
- Pass the target URL directly to the script.
- On success, include the script output in context as-is (it already includes title, description, content bounds, and links).
- If the command fails or times out, report the error and ask for an alternate URL or timeout value.

The script uses Node fetch with AbortController for hard timeouts. Output is markdown with `<main>`/`<article>` content preferred over full page, reducing nav/sidebar noise.
