import fs from "fs";
import net from "net";
import cp from "child_process";
import { ExtensionContext, window, workspace } from "vscode";
import { Trace } from "vscode-jsonrpc";
import { LanguageClient, ServerOptions } from "vscode-languageclient/node";

export const clientId = "nevaLSPClient";
export const clientName = "Neva LSP Client";

type TraceMode = "off" | "messages" | "verbose";

interface LspLaunchCommand {
  command: string;
  args: string[];
  description: string;
}

function configuredLspPath(): string | undefined {
  const configuredPath = workspace
    .getConfiguration("neva")
    .get<string>("lsp.path", "")
    .trim();

  return configuredPath || undefined;
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

export function setupLsp(context: ExtensionContext, isDebug: boolean): LanguageClient {
  console.info("initializing lsp-client, extension mode: ", context.extensionMode);

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
      const outputChannel = window.createOutputChannel("Neva Language Server Logs");
      context.subscriptions.push(outputChannel);

      const serverProcess = cp.spawn(command.command, command.args);
      try {
        await waitForProcessStart(serverProcess);
      } catch (error) {
        outputChannel.appendLine(String(error));
        showLspStartError(command, error);
        throw error;
      }

      serverProcess.stdout.on("data", (data) => outputChannel.append(data.toString()));
      serverProcess.stderr.on("data", (data) => outputChannel.append(data.toString()));
      serverProcess.on("exit", (code, signal) => {
        const detail = `Neva LSP exited with code ${code} and signal ${signal}`;
        outputChannel.appendLine(detail);
        if (code !== 0) {
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
