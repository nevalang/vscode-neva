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
      const binaryPath = context.asAbsolutePath(path.join("bin", binaryName));
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

type BinaryName =
  | "neva-lsp-windows-arm64.exe"
  | "neva-lsp-windows-amd64.exe"
  | "neva-lsp-linux-arm64"
  | "neva-lsp-linux-amd64"
  | "neva-lsp-darwin-arm64"
  | "neva-lsp-darwin-amd64";

function getPlatformBinary(): BinaryName | never {
  const platform = os.platform();
  const arch = os.arch();

  console.log(`platform: ${platform}, arch: ${arch}`);

  if (!["win32", "linux", "darwin"].includes(platform)) {
    window.showErrorMessage(`Unsupported platform: ${platform}`);
    throw new Error(`Unsupported platform: ${platform}`);
  } else if (!["arm64", "amd64"].includes(arch)) {
    window.showErrorMessage(`Unsupported architecture: ${arch}`);
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  let binaryName: BinaryName;
  switch (platform) {
    case "win32":
      binaryName = {
        arm64: "neva-lsp-windows-arm64.exe",
        amd64: "neva-lsp-windows-amd64.exe",
      }[arch] as BinaryName;
      break;
    case "linux":
      binaryName = {
        arm64: "neva-lsp-linux-arm64",
        amd64: "neva-lsp-linux-amd64",
      }[arch] as BinaryName;
      break;
    case "darwin":
      binaryName = {
        arm64: "neva-lsp-darwin-arm64",
        amd64: "neva-lsp-darwin-amd64",
      }[arch] as BinaryName;
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return binaryName;
}
