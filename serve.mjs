// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { createReadStream, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]+$/u, "");
const defaultPort = Number.parseInt(process.env.ACORN_PORT ?? "4187", 10);
const defaultHost = "127.0.0.1";

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function plain(response, status, message) {
  response.writeHead(status, {
    ...securityHeaders,
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(message);
}

function allowedAsset(relative) {
  return relative === "index.html"
    || relative === "styles.css"
    || /^src\/[a-z0-9-]+\.js$/u.test(relative);
}

export function createStaticServer({ rootDirectory = projectRoot } = {}) {
  const root = realpathSync(rootDirectory).replace(/[\\/]+$/u, "");

  return createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      plain(response, 405, "Method not allowed");
      return;
    }

    let relative;
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    } catch {
      plain(response, 400, "Bad request");
      return;
    }

    if (!allowedAsset(relative)) {
      plain(response, 404, "Not found");
      return;
    }

    let target;
    try {
      target = realpathSync(resolve(root, relative));
      const insideRoot = target.startsWith(`${root}${sep}`);
      if (!insideRoot || !statSync(target).isFile()) throw new Error("Invalid asset");
    } catch {
      plain(response, 404, "Not found");
      return;
    }

    const headers = {
      ...securityHeaders,
      "Content-Type": mime[extname(target)] ?? "application/octet-stream",
    };

    if (request.method === "HEAD") {
      response.writeHead(200, headers);
      response.end();
      return;
    }

    const stream = createReadStream(target);
    stream.once("open", () => {
      response.writeHead(200, headers);
      stream.pipe(response);
    });
    stream.once("error", () => {
      if (!response.headersSent) plain(response, 404, "Not found");
      else response.destroy();
    });
  });
}

const isEntryPoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  const server = createStaticServer();
  server.listen(defaultPort, defaultHost, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : defaultPort;
    console.log(`橡果远征 · 源码公开版已启动：http://${defaultHost}:${port}/`);
  });

  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
