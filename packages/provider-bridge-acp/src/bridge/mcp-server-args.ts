export function resolveMcpServerBridgeArgs(args: {
  execArgv: readonly string[];
  modulePath: string;
  moduleExists: boolean;
}): string[] {
  if (!args.moduleExists) {
    throw new Error(
      `ACP bridge bundle "${args.modulePath}" no longer exists, so BB tools cannot be exposed over MCP. A newer build of this provider replaced the bundle after the bridge started. Restart the thread to relaunch the bridge on the current build.`,
    );
  }
  return [...args.execArgv, args.modulePath, "--mcp-stdio"];
}
