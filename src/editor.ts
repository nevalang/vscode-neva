import {
  Disposable,
  Webview,
  WebviewPanel,
  window,
  Uri,
  ColorThemeKind,
  ColorTheme,
  CustomTextEditorProvider,
  CancellationToken,
  TextDocument,
  ExtensionContext,
  WorkspaceEdit,
  Range,
  workspace,
} from "vscode";

const viewType = "neva.editNeva";

export const registerNevaEditor = (context: ExtensionContext): Disposable =>
  window.registerCustomEditorProvider(viewType, new NevaEditor(context), {
    supportsMultipleEditorsPerDocument: true,
  });

export class NevaEditor implements CustomTextEditorProvider {
  private readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): void | Thenable<void> {
    console.log("hello from resolveCustomTextEditor");

    const extensionUri = this.context.extensionUri;

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        (Uri as any).joinPath(extensionUri, "out"),
        (Uri as any).joinPath(extensionUri, "webview/dist"),
      ],
    };

    webviewPanel.webview.html = getWebviewContent(
      webviewPanel.webview,
      extensionUri
    );

    const disposables: Disposable[] = [];

    let isUpdating = {
      creationTime: Date.now(),
      current: false,
      editTime: undefined,
    };

    workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          if (!isUpdating.current) {
            console.log("update window", isUpdating);
            updateWindow(webviewPanel, e.document);
          } else {
            isUpdating.current = false;
          }
        }
      },
      undefined,
      disposables
    );

    window.onDidChangeActiveColorTheme(
      (e: ColorTheme) => {
        let isDarkTheme = e.kind === ColorThemeKind.Dark;
        webviewPanel.webview.postMessage({
          type: "theme",
          isDarkTheme: isDarkTheme,
        });
      },
      undefined,
      disposables
    );

    webviewPanel.webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
          case "update":
            const edit = new WorkspaceEdit();
            isUpdating.current = true;
            // @ts-ignore
            isUpdating.editTime = Date.now();

            console.log("update", message.uri, text);
            // Just replace the entire document every time for this example extension.
            // A more complete extension should compute minimal edits instead.
            edit.replace(
              message.uri,
              new Range(0, 0, document.lineCount, 0),
              text
            );
            workspace.applyEdit(edit).then(() => {
              // window.showInformationMessage(`Successfully wrote to ${uri.path}`);
            });
        }
      },
      undefined,
      disposables
    );

    webviewPanel.onDidDispose(() => {
      while (disposables.length) {
        const disposable = disposables.pop();
        if (disposable) {
          disposable.dispose();
        }
      }
    });

    updateWindow(webviewPanel, document);
  }
}

function getWebviewContent(webview: Webview, extensionUri: Uri) {
  const stylesUri = getUri(webview, extensionUri, [
    "webview",
    "dist",
    "assets",
    "index.css",
  ]);

  const scriptUri = getUri(webview, extensionUri, [
    "webview",
    "dist",
    "assets",
    "index.js",
  ]);

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <title>Neva Editor</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" nonce="${getNonce()}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

function updateWindow(panel: WebviewPanel, document: TextDocument) {
  const currentTheme = window.activeColorTheme;
  const isDarkTheme = currentTheme.kind === ColorThemeKind.Dark;

  panel.webview.postMessage({
    type: "revive",
    value: document.getText(),
    uri: document.uri,
    isDarkTheme: isDarkTheme,
  });
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri((Uri as any).joinPath(extensionUri, ...pathList));
}
