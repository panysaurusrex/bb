import { join } from "node:path";
import { ensureCachedNodeArtifact } from "./node-artifact-cache.js";
import { safePluginSegment } from "@bb/process-utils";
import type { HostDaemonLogger } from "./logger.js";

const PLUGIN_HOST_ARTIFACT_CACHE_SEGMENT = "plugin-host-artifacts";
const ARTIFACT_FILE_NAME = "host.mjs";
const LEGACY_ARTIFACT_FILE_NAMES = ["host.js"] as const;

export const PLUGIN_HOST_ARTIFACT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type FetchPluginHostArtifact = (args: {
  pluginId: string;
  digest: string;
  expectedByteLength: number;
}) => Promise<Uint8Array>;

export async function ensureCachedPluginHostArtifact(args: {
  dataDir: string;
  pluginId: string;
  digest: string;
  byteLength: number;
  fetchArtifact: FetchPluginHostArtifact;
  logger: Pick<HostDaemonLogger, "debug" | "warn">;
}): Promise<string> {
  return ensureCachedNodeArtifact({
    cacheDir: join(
      args.dataDir,
      PLUGIN_HOST_ARTIFACT_CACHE_SEGMENT,
      safePluginSegment(args.pluginId),
    ),
    digest: args.digest,
    byteLength: args.byteLength,
    fileName: ARTIFACT_FILE_NAME,
    legacyFileNames: LEGACY_ARTIFACT_FILE_NAMES,
    fetchArtifact: ({ digest, byteLength }) =>
      args.fetchArtifact({
        pluginId: args.pluginId,
        digest,
        expectedByteLength: byteLength,
      }),
    prune: {
      kind: "keep-recently-used",
      maxAgeMs: PLUGIN_HOST_ARTIFACT_MAX_AGE_MS,
    },
    logger: args.logger,
  });
}
