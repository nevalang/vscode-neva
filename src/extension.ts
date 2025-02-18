import { ExtensionContext, window } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { setupLsp } from "./lsp";

let lspClient: LanguageClient;

export async function activate(context: ExtensionContext) {
  console.info("neva module detected, extension activated");

  // Run language server, initialize client and establish connection
  lspClient = setupLsp(context, process.env.VSCODE_NEVA_DEBUG === "true");
  lspClient.onNotification("neva/analyzer_message", (message: string) => {
    window.showWarningMessage(message);
  });
}

export function deactivate(): Thenable<void> | undefined {
  return lspClient && lspClient.stop();
}
