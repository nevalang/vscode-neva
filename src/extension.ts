import path from "path";
import {
  commands,
  CodeLens,
  CodeLensProvider,
  CancellationToken,
  ProviderResult,
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  TextEditor,
  Uri,
  window,
  workspace,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { setupLsp } from "./lsp";

let lspClient: LanguageClient;
let runTerminal = undefined as ReturnType<typeof window.createTerminal> | undefined;
let runTerminalCwd = "";

const runMainCommandId = "neva.runMain";
const setTextualModeCommandId = "neva.openTextualMode";
const setVisualModeCommandId = "neva.openVisualMode";
const mainDefRegex = /^[ \t]*(pub[ \t]+)?def[ \t]+Main\b/gm;
const nevaEditorModeContextKey = "neva.editorMode";
const nevaEditorContextKey = "neva.activeEditorIsNeva";

type NevaEditorMode = "textual" | "visual";
let currentMode: NevaEditorMode = "textual";
const onDidChangeEditorModeEmitter = new EventEmitter<NevaEditorMode>();

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

  const runCwd = uri ? path.dirname(uri.fsPath) : folder.uri.fsPath;

  if (!runTerminal || runTerminal.exitStatus || runTerminalCwd !== runCwd) {
    runTerminal?.dispose();
    runTerminal = window.createTerminal({
      name: "Neva Run",
      cwd: runCwd,
    });
    runTerminalCwd = runCwd;
  }

  runTerminal.show(true);
  runTerminal.sendText("neva run .", true);
}

async function updateActiveEditorContext(editor: TextEditor | undefined) {
  const isNeva = editor?.document.languageId === "neva";
  await commands.executeCommand("setContext", nevaEditorContextKey, isNeva);
}

async function setEditorMode(mode: NevaEditorMode) {
  currentMode = mode;
  await commands.executeCommand("setContext", nevaEditorModeContextKey, mode);
  onDidChangeEditorModeEmitter.fire(mode);

  if (mode === "visual") {
    void window.showInformationMessage(
      "Neva visual mode is not implemented yet. This button is a placeholder for the upcoming visual editor API."
    );
  }
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

  await setEditorMode("textual");
  await updateActiveEditorContext(window.activeTextEditor);

  context.subscriptions.push(
    commands.registerCommand(runMainCommandId, runNeva),
    commands.registerCommand(setTextualModeCommandId, () => setEditorMode("textual")),
    commands.registerCommand(setVisualModeCommandId, () => setEditorMode("visual")),
    commands.registerCommand("neva.getEditorMode", () => currentMode),
    commands.registerCommand("neva.onDidChangeEditorMode", (listener: (mode: NevaEditorMode) => void): Disposable =>
      onDidChangeEditorModeEmitter.event(listener)
    ),
    window.onDidChangeActiveTextEditor((editor) => {
      void updateActiveEditorContext(editor);
    }),
    languages.registerCodeLensProvider(
      { language: "neva", scheme: "file" },
      runMainCodeLensProvider
    )
  );

  return getApi();
}

export function deactivate(): Thenable<void> | undefined {
  onDidChangeEditorModeEmitter.dispose();
  return lspClient && lspClient.stop();
}

export function getApi() {
  return {
    getEditorMode: () => currentMode,
    onDidChangeEditorMode: onDidChangeEditorModeEmitter.event as Event<NevaEditorMode>,
    setEditorMode,
  };
}
