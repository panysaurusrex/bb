import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PLUGIN_HOST_ARTIFACT_MAX_AGE_MS,
  ensureCachedPluginHostArtifact,
} from "./plugin-host-artifact-cache.js";

const tempDirs: string[] = [];

const logger = {
  debug: () => {},
  warn: () => {},
};

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function artifactBytes(body: string): Uint8Array {
  return new TextEncoder().encode(body);
}

function digestOf(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function materialize(
  dataDir: string,
  bytes: Uint8Array,
): Promise<string> {
  return ensureCachedPluginHostArtifact({
    dataDir,
    pluginId: "google-antigravity-acp",
    digest: digestOf(bytes),
    byteLength: bytes.byteLength,
    fetchArtifact: async () => bytes,
    logger,
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { force: true, recursive: true });
    }),
  );
});

describe("plugin host artifact cache", () => {
  it("keeps the previous digest alive after a plugin rebuild", async () => {
    const dataDir = await makeTempDir("bb-plugin-host-artifact-");
    const running = artifactBytes("host bundle running in a live bridge");
    const rebuilt = artifactBytes("host bundle after the plugin was rebuilt");

    const runningPath = await materialize(dataDir, running);
    const rebuiltPath = await materialize(dataDir, rebuilt);

    expect(rebuiltPath).not.toBe(runningPath);
    await expect(fs.readFile(runningPath, "utf8")).resolves.toBe(
      "host bundle running in a live bridge",
    );
  });

  it("prunes a digest that has not been used within the retention window", async () => {
    const dataDir = await makeTempDir("bb-plugin-host-artifact-");
    const abandoned = artifactBytes("host bundle nothing runs any more");
    const current = artifactBytes("host bundle the daemon launches now");

    const abandonedPath = await materialize(dataDir, abandoned);
    const expired = new Date(
      Date.now() - PLUGIN_HOST_ARTIFACT_MAX_AGE_MS - 60_000,
    );
    await fs.utimes(path.dirname(abandonedPath), expired, expired);

    await materialize(dataDir, current);

    await expect(fs.readFile(abandonedPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refreshes the retention window each time a digest is launched", async () => {
    const dataDir = await makeTempDir("bb-plugin-host-artifact-");
    const longRunning = artifactBytes("host bundle a long thread still uses");
    const current = artifactBytes("host bundle the daemon launches now");

    const longRunningPath = await materialize(dataDir, longRunning);
    const expired = new Date(
      Date.now() - PLUGIN_HOST_ARTIFACT_MAX_AGE_MS - 60_000,
    );
    await fs.utimes(path.dirname(longRunningPath), expired, expired);
    await materialize(dataDir, longRunning);

    await materialize(dataDir, current);

    await expect(fs.readFile(longRunningPath, "utf8")).resolves.toBe(
      "host bundle a long thread still uses",
    );
  });
});
