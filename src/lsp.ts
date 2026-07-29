import fs from "fs";
import net from "net";
import cp from "child_process";
import { ExtensionContext, OutputChannel, window, workspace } from "vscode";
import { Trace } from "vscode-jsonrpc";
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
  ServerOptions,
} from "vscode-languageclient/node";

export const clientId = "nevaLSPClient";
export const clientName = "Neva LSP Client";

type TraceMode = "off" | "messages" | "verbose";

interface LspLaunchCommand {
  command: string;
  args: string[];
  description: string;
  usesLegacyCliFallback?: boolean;
}

function configuredLspPath(): string | undefined {
  const configuredPath = workspace
    .getConfiguration("neva")
    .get<string>("lsp.path", "")
    .trim();

  return configuredPath || undefined;
}

function legacyNevaToolCli(): boolean {
  const result = cp.spawnSync("neva", ["tool"], { encoding: "utf8" });
  if (result.error) return false;

  return `${result.stdout ?? ""}${result.stderr ?? ""}`.includes("No help topic for 'tool'");
}

function directLspOnPath(): boolean {
  const result = cp.spawnSync("neva-lsp", ["version", "--json"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function resolveLspLaunchCommand(): LspLaunchCommand {
  const lspPath = configuredLspPath();
  if (lspPath) {
    if (!fs.existsSync(lspPath)) {
      throw new Error(`Configured Neva LSP path does not exist: ${lspPath}`);
    }
    return {
      command: lspPath,
      args: [],
      description: lspPath,
    };
  }

  // Neva 0.35 and older do not have `neva tool`. If the separate LSP has
  // already been installed, keep editor features usable while clearly
  // signalling that Run still needs a current Neva CLI.
  if (legacyNevaToolCli() && directLspOnPath()) {
    return {
      command: "neva-lsp",
      args: [],
      description: "neva-lsp (temporary fallback for an old Neva CLI)",
      usesLegacyCliFallback: true,
    };
  }

  return {
    command: "neva",
    args: ["tool", "lsp"],
    description: "neva tool lsp",
  };
}

async function waitForProcessStart(process: cp.ChildProcessWithoutNullStreams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    process.once("spawn", resolve);
    process.once("error", reject);
  });
}

function showLspStartError(command: LspLaunchCommand, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  window.showErrorMessage(
    `Neva LSP could not start via ${command.description}: ${detail}. ` +
      "Install Neva LSP, update Neva, or configure neva.lsp.path."
  );
}

function oldNevaToolMessage(): string {
  return "Neva LSP requires a Neva CLI that supports `neva tool lsp` (Neva 0.39.0 or newer). " +
    "Update Neva with `neva upgrade`, restart VS Code, then run `Neva: Update Language Tools`.";
}

function legacyCliFallbackMessage(): string {
  return "Neva Language Server started directly because your Neva CLI is older than 0.39.0. " +
    "Language features are available, but Run requires updating Neva with `neva upgrade` and restarting VS Code.";
}

export function setupLsp(context: ExtensionContext, isDebug: boolean): LanguageClient {
  console.info("initializing lsp-client, extension mode: ", context.extensionMode);

  let outputChannel: OutputChannel | undefined;
  let legacyNevaToolDetected = false;
  let reportedProcessFailure = false;
  let reportedLegacyCliFallback = false;

  function getOutputChannel(): OutputChannel {
    if (!outputChannel) {
      outputChannel = window.createOutputChannel("Neva Language Server Logs");
      context.subscriptions.push(outputChannel);
    }
    return outputChannel;
  }

  let serverOptions: ServerOptions;
  if (isDebug) {
    serverOptions = async () => {
      const socket = new net.Socket();

      await new Promise<void>((resolve, reject) => {
        const port = 6007;
        socket.connect(port, "127.0.0.1", () => {
          console.info(`TCP connection to LSP server established on port ${port}`);
          resolve();
        });
        socket.on("error", reject);
      });

      return { reader: socket, writer: socket };
    };
  } else {
    serverOptions = async () => {
      const command = resolveLspLaunchCommand();
      const logs = getOutputChannel();

      const serverProcess = cp.spawn(command.command, command.args);
      try {
        await waitForProcessStart(serverProcess);
      } catch (error) {
        logs.appendLine(String(error));
        showLspStartError(command, error);
        throw error;
      }

      if (command.usesLegacyCliFallback && !reportedLegacyCliFallback) {
        reportedLegacyCliFallback = true;
        window.showWarningMessage(legacyCliFallbackMessage());
      }

      const appendProcessOutput = (data: Buffer) => {
        const text = data.toString();
        logs.append(text);
        if (command.description === "neva tool lsp" && text.includes("No help topic for 'tool'")) {
          legacyNevaToolDetected = true;
        }
      };
      serverProcess.stdout.on("data", appendProcessOutput);
      serverProcess.stderr.on("data", appendProcessOutput);
      serverProcess.on("exit", (code, signal) => {
        const detail = `Neva LSP exited with code ${code} and signal ${signal}`;
        logs.appendLine(detail);
        if (code !== 0 && !reportedProcessFailure) {
          reportedProcessFailure = true;
          if (legacyNevaToolDetected) {
            window.showErrorMessage(oldNevaToolMessage());
            return;
          }
          window.showErrorMessage(
            `${detail}. Run ${command.description} in a terminal to diagnose the tool installation.`
          );
        }
      });

      return { reader: serverProcess.stdout, writer: serverProcess.stdin };
    };
  }

  const client = new LanguageClient(clientId, clientName, serverOptions, {
    documentSelector: [{ scheme: "file", language: "neva" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.*"),
    },
    errorHandler: {
      error: () => ({ action: ErrorAction.Continue }),
      closed: () => ({
        action: legacyNevaToolDetected ? CloseAction.DoNotRestart : CloseAction.Restart,
      }),
    },
  });

  const traceMode = workspace
    .getConfiguration("neva")
    .get<TraceMode>("trace.server", isDebug ? "verbose" : "off");

  client.setTrace(
    {
      off: Trace.Off,
      messages: Trace.Messages,
      verbose: Trace.Verbose,
    }[traceMode]
  );

  client.start().then(
    () => console.info("language-server started, client connection established"),
    (error) => showLspStartError(resolveLspLaunchCommand(), error)
  );

  return client;
}
