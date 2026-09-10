import { describe, expect, it } from "vitest";
import { resolveMcpServerBridgeArgs } from "./mcp-server-args.js";

const modulePath =
  "/data/plugin-host-artifacts/google-antigravity-acp/13be6895/host.mjs";

describe("resolveMcpServerBridgeArgs", () => {
  it("spawns the bridge bundle in MCP stdio mode", () => {
    const args = resolveMcpServerBridgeArgs({
      execArgv: ["--enable-source-maps"],
      modulePath,
      moduleExists: true,
    });

    expect(args).toEqual(["--enable-source-maps", modulePath, "--mcp-stdio"]);
  });

  it("refuses to hand the agent a bundle path that no longer exists", () => {
    expect(() =>
      resolveMcpServerBridgeArgs({
        execArgv: [],
        modulePath,
        moduleExists: false,
      }),
    ).toThrow(/no longer exists/u);
  });

  it("names the missing bundle so the failure is actionable", () => {
    expect(() =>
      resolveMcpServerBridgeArgs({
        execArgv: [],
        modulePath,
        moduleExists: false,
      }),
    ).toThrow(new RegExp(modulePath, "u"));
  });
});
