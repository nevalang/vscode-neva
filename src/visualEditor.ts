import fs from "fs";
import path from "path";
import { ExtensionContext, Uri, ViewColumn, Webview, WebviewPanel, window, workspace } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

const viewMethods = new Set([
  "neva/view/getProgram",
  "neva/view/getFileView",
  "neva/view/resolveEntityRef",
  "neva/view/searchEntities",
]);

type ViewRequest = {
  type: "neva/view/request";
  id: string;
  method: string;
  params: unknown;
};

let panel: WebviewPanel | undefined;

export function openVisualEditor(context: ExtensionContext, client: LanguageClient) {
  const editor = window.activeTextEditor;
  if (editor?.document.languageId !== "neva") {
    window.showErrorMessage("Neva: open a .neva file before opening Visual Mode.");
    return;
  }

  if (panel) {
    panel.reveal(ViewColumn.Beside);
    return;
  }

  panel = window.createWebviewPanel("neva.visualEditor", "Neva Visual Mode", ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [Uri.file(path.join(context.extensionPath, "dist", "webview"))],
  });
  panel.webview.html = getWebviewHtml(context, panel.webview);

  panel.onDidDispose(() => {
    panel = undefined;
  }, undefined, context.subscriptions);

  panel.webview.onDidReceiveMessage(async (message: ViewRequest) => {
    if (message?.type !== "neva/view/request" || typeof message.id !== "string" || !viewMethods.has(message.method)) {
      return;
    }

    try {
      const result = await client.sendRequest(message.method, message.params);
      await panel?.webview.postMessage({ type: "neva/view/response", id: message.id, result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await panel?.webview.postMessage({ type: "neva/view/response", id: message.id, error: detail });
    }
  }, undefined, context.subscriptions);

  context.subscriptions.push(workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "neva") {
      void panel?.webview.postMessage({ type: "neva/view/refresh" });
    }
  }));
}

function getWebviewHtml(context: ExtensionContext, webview: Webview): string {
  const root = Uri.file(path.join(context.extensionPath, "dist", "webview"));
  const indexPath = path.join(root.fsPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    return "<h1>Neva Visual Mode is unavailable</h1><p>Reinstall the extension; its visual-editor bundle is missing.</p>";
  }

  const nonce = String(Date.now());
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource}`,
  ].join("; ");

  return fs.readFileSync(indexPath, "utf8")
    .replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`)
    .replace(/(src|href)="\.\/assets\/([^\"]+)"/g, (_match, attribute, asset) => {
      return `${attribute}="${webview.asWebviewUri(Uri.file(path.join(root.fsPath, "assets", asset)))}"`;
    })
    .replace(/<script type="module"/g, `<script nonce="${nonce}" type="module"`);
}
