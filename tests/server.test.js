// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";

import { createStaticServer } from "../serve.mjs";

async function withServer(run) {
  const server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  try {
    return await run(`http://127.0.0.1:${address.port}`, address.port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function rawRequest(port, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const outgoing = request({ host: "127.0.0.1", port, path, method }, (incoming) => {
      let body = "";
      incoming.setEncoding("utf8");
      incoming.on("data", (chunk) => { body += chunk; });
      incoming.on("end", () => resolve({
        status: incoming.statusCode,
        headers: incoming.headers,
        body,
      }));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

test("serves only game assets with isolation headers", async () => {
  await withServer(async (origin, port) => {
    const page = await fetch(`${origin}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /^text\/html/u);
    assert.match(page.headers.get("content-security-policy"), /connect-src 'none'/u);
    assert.equal(page.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.equal(page.headers.get("cross-origin-resource-policy"), "same-origin");
    assert.equal(page.headers.get("x-frame-options"), "DENY");
    assert.match(await page.text(), /橡果远征/u);

    const head = await rawRequest(port, "/styles.css", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");

    const privateFile = await rawRequest(port, "/package.json");
    assert.equal(privateFile.status, 404);

    const post = await rawRequest(port, "/", "POST");
    assert.equal(post.status, 405);
  });
});

test("rejects malformed URL escapes without terminating the server", async () => {
  await withServer(async (origin, port) => {
    const malformed = await rawRequest(port, "/%E0%A4%A");
    assert.equal(malformed.status, 400);

    const healthy = await fetch(`${origin}/src/game-core.js`);
    assert.equal(healthy.status, 200);
    assert.match(await healthy.text(), /export class Rng/u);
  });
});
