import path from "path";
import net from "net";
import cp from "child_process";
import * as os from "os";
import { window, ExtensionContext, workspace } from "vscode";
import { Trace } from "vscode-jsonrpc";
import { LanguageClient, ServerOptions } from "vscode-languageclient/node";

export const clientId = "nevaLSPClient";
export const clientName = "Neva LSP Client";

export function setupLsp(
  context: ExtensionContext,
  isDebug: boolean
): LanguageClient {
  console.info(
    "initializing lsp-client, extension mode: ",
    context.extensionMode
  );

  let serverOptions: ServerOptions;
  if (isDebug) {
    serverOptions = async () => {
      const socket = new net.Socket();

      await new Promise<void>((resolve, reject) => {
        const port = 6007;
        socket.connect(port, "127.0.0.1", () => {
          console.info(
            `TCP connection to LSP server established on port ${port}`
          );
          resolve();
        });
        socket.on("error", reject);
      });

      return { reader: socket, writer: socket };
    };
  } else {
    serverOptions = async () => {
      const binaryName = getPlatformBinary();
      const binaryPath = context.asAbsolutePath(path.join("bin", binaryName)); // compiled lsp binaries must be here
      const serverProcess = cp.spawn(binaryPath);

      serverProcess.stdout.on("data", (data) => console.info(data.toString()));
      serverProcess.stderr.on("data", (data) => console.error(data.toString()));
      serverProcess.on("exit", (code, signal) =>
        console.warn(`server exited with code ${code} and signal ${signal}`)
      );

      const outputChannel = window.createOutputChannel(
        "Neva Language Server Logs"
      );
      serverProcess.stdout.on("data", (data) => {
        outputChannel.appendLine(data.toString());
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

  client.setTrace(Trace.Verbose);

  client
    .start()
    .then(() =>
      console.info("language-server started, client connection established")
    )
    .catch(console.error);

  return client;
}

function getPlatformBinary(): string {
  const platform = os.platform();
  const arch = os.arch();

  let binaryName = "";
  switch (platform) {
    case "win32":
      binaryName =
        arch === "arm64"
          ? "neva-lsp-windows-arm64.exe"
          : "neva-lsp-windows-amd64.exe";
      break;
    case "linux":
      binaryName =
        arch === "arm64" ? "neva-lsp-linux-arm64" : "neva-lsp-linux-amd64";
      break;
    case "darwin":
      binaryName =
        arch === "arm64" ? "neva-lsp-darwin-arm64" : "neva-lsp-darwin-amd64";
      break;
    default:
      window.showErrorMessage(`Unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return path.join(__dirname, "binaries", binaryName);
}
