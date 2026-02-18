import {
  commands,
  CodeLens,
  CodeLensProvider,
  CancellationToken,
  ProviderResult,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { setupLsp } from "./lsp";

let lspClient: LanguageClient;
let runTerminal = undefined as ReturnType<typeof window.createTerminal> | undefined;

const runMainCommandId = "neva.runMain";
const mainDefRegex = /^\s*(pub\s+)?def\s+Main\b/gm;

function provideRunCodeLenses(document: TextDocument) {
  const text = document.getText();
  const lenses: CodeLens[] = [];
  let match: RegExpExecArray | null;

  while ((match = mainDefRegex.exec(text)) !== null) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    lenses.push(
      new CodeLens(new Range(start, end), {
        title: "▶ Run",
        command: runMainCommandId,
        arguments: [document.uri],
      })
    );
  }

  return lenses;
}

function runNeva(uri?: Uri) {
  const folder = uri
    ? workspace.getWorkspaceFolder(uri)
    : workspace.workspaceFolders?.[0];

  if (!folder) {
    window.showErrorMessage("Neva: open a workspace folder to run.");
    return;
  }

  if (!runTerminal || runTerminal.exitStatus) {
    runTerminal = window.createTerminal({
      name: "Neva Run",
      cwd: folder.uri.fsPath,
    });
  }

  runTerminal.show(true);
  runTerminal.sendText("neva run", true);
}

const runMainCodeLensProvider = {
  provideCodeLenses(
    document: TextDocument,
    _token: CancellationToken
  ): ProviderResult<CodeLens[]> {
    return provideRunCodeLenses(document);
  },
} as CodeLensProvider;

export async function activate(context: ExtensionContext) {
  console.info("neva module detected, extension activated");

  // Run language server, initialize client and establish connection
  lspClient = setupLsp(context, process.env.VSCODE_NEVA_DEBUG === "true");
  lspClient.onNotification("neva/analyzer_message", (message: string) => {
    window.showWarningMessage(message);
  });

  context.subscriptions.push(
    commands.registerCommand(runMainCommandId, runNeva),
    languages.registerCodeLensProvider(
      { language: "neva", scheme: "file" },
      runMainCodeLensProvider
    )
  );
}

export function deactivate(): Thenable<void> | undefined {
  return lspClient && lspClient.stop();
}
