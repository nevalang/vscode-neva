import path from "path";
import fs from "fs";
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
  Location,
  Position,
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
const showReferencesCommandId = "neva.showReferences";
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
  const invocation = resolveRunInvocation(runCwd, getConfiguredCliPath());

  if (
    !runTerminal ||
    runTerminal.exitStatus ||
    runTerminalCwd !== invocation.terminalCwd
  ) {
    runTerminal?.dispose();
    runTerminal = window.createTerminal({
      name: "Neva Run",
      cwd: invocation.terminalCwd,
    });
    runTerminalCwd = invocation.terminalCwd;
  }

  runTerminal.show(true);
  runTerminal.sendText(invocation.command, true);
}

function getConfiguredCliPath() {
  return (
    workspace.getConfiguration("neva").get<string>("cli.path", "neva") ?? "neva"
  );
}

function resolveRunInvocation(runCwd: string, cliPath = "neva") {
  const compilerWorkspaceRoot = findNearestNevaCompilerRoot(runCwd);
  if (compilerWorkspaceRoot) {
    const relativeTarget = formatRelativeTarget(compilerWorkspaceRoot, runCwd);
    return {
      terminalCwd: compilerWorkspaceRoot,
      command: `go run ./cmd/neva run ${relativeTarget}`,
    };
  }

  return {
    terminalCwd: runCwd,
    command: `${cliPath} run .`,
  };
}

function findNearestNevaCompilerRoot(startPath: string) {
  let currentPath = path.resolve(startPath);

  while (true) {
    if (isNevaCompilerWorkspace(currentPath)) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }

  return undefined;
}

function isNevaCompilerWorkspace(folderPath: string) {
  const goModPath = path.join(folderPath, "go.mod");
  const localNevaCliPath = path.join(folderPath, "cmd", "neva", "main.go");
  if (!fs.existsSync(goModPath) || !fs.existsSync(localNevaCliPath)) {
    return false;
  }

  try {
    const goMod = fs.readFileSync(goModPath, "utf8");
    return /^module[ \t]+github\.com\/nevalang\/neva\b/m.test(goMod);
  } catch {
    return false;
  }
}

function formatRelativeTarget(folderPath: string, runCwd: string) {
  const relativePath = path.relative(folderPath, runCwd);
  if (!relativePath || relativePath === ".") {
    return ".";
  }

  const normalizedRelativePath = relativePath.split(path.sep).join("/");
  if (normalizedRelativePath.startsWith(".")) {
    return normalizedRelativePath;
  }
  return `./${normalizedRelativePath}`;
}

type LspPosition = { line?: number; character?: number };
type LspRange = { start?: LspPosition; end?: LspPosition };
type LspLocation = { uri?: string; range?: LspRange };

function toPosition(value: unknown): Position | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const maybe = value as LspPosition;
  if (typeof maybe.line !== "number" || typeof maybe.character !== "number") {
    return undefined;
  }
  return new Position(maybe.line, maybe.character);
}

function toLocation(value: unknown): Location | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const maybe = value as LspLocation;
  if (typeof maybe.uri !== "string") {
    return undefined;
  }
  const start = toPosition(maybe.range?.start);
  const end = toPosition(maybe.range?.end);
  if (!start || !end) {
    return undefined;
  }
  return new Location(Uri.parse(maybe.uri), new Range(start, end));
}

function showReferences(uriArg: unknown, posArg: unknown, locationsArg: unknown) {
  const uri = typeof uriArg === "string" ? Uri.parse(uriArg) : undefined;
  const position = toPosition(posArg);
  const locations = Array.isArray(locationsArg)
    ? locationsArg.map(toLocation).filter((location): location is Location => location !== undefined)
    : [];

  if (!uri || !position || locations.length === 0) {
    return;
  }

  void commands.executeCommand("editor.action.showReferences", uri, position, locations);
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
    commands.registerCommand(showReferencesCommandId, showReferences),
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
    resolveRunInvocationForTests: resolveRunInvocation,
  };
}
