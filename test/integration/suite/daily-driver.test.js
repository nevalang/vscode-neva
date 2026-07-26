const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const extensionId = 'nevalang.vscode-nevalang';
const workspaceRoot = path.resolve(__dirname, '../..');
const mainFilePath = path.join(workspaceRoot, 'main/main.neva');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, message, timeoutMs = 60000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error(message);
}

function positionOf(document, text, occurrence = 0, offset = 0) {
  let index = -1;
  for (let i = 0; i <= occurrence; i += 1) {
    index = document.getText().indexOf(text, index + 1);
  }
  assert.notStrictEqual(index, -1, `Fixture should contain ${text}`);
  return document.positionAt(index + offset);
}

function completionItems(result) {
  return Array.isArray(result) ? result : result?.items || [];
}

suite('Neva daily-driver contract', () => {
  let extension;
  let api;
  let mainDocument;

  suiteSetup(async function setup() {
    this.timeout(120000);
    extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} should be installed in test host`);
    api = await extension.activate();
    mainDocument = await vscode.workspace.openTextDocument(mainFilePath);
    await vscode.window.showTextDocument(mainDocument, { preview: false });

    await waitFor(
      async () => completionItems(await vscode.commands.executeCommand(
        'vscode.executeCompletionItemProvider', mainDocument.uri, new vscode.Position(0, 0)
      )).length > 0,
      'Timed out waiting for Neva language-server providers'
    );
  });

  test('registers the promised Neva commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const command of ['neva.runMain', 'neva.openTextualMode', 'neva.openVisualMode']) {
      assert.ok(commands.includes(command), `Expected ${command} to be registered`);
    }
  });

  test('reports compiler diagnostics for an unsaved invalid edit', async () => {
    await vscode.window.showTextDocument(mainDocument, { preview: false });
    const originalText = mainDocument.getText();
    const edit = new vscode.WorkspaceEdit();
    edit.replace(mainDocument.uri, new vscode.Range(0, 0, mainDocument.lineCount, 0), 'def Broken(start) (stop) {\n    // no network\n}\n');
    assert.ok(await vscode.workspace.applyEdit(edit));

    try {
      const diagnostics = await waitFor(
        () => {
          const current = vscode.languages.getDiagnostics(mainDocument.uri);
          return current.length > 0 ? current : null;
        },
        'Timed out waiting for diagnostics from an unsaved invalid edit'
      );
      assert.ok(diagnostics.some((diagnostic) => diagnostic.source === 'compiler'));
    } finally {
      const restore = new vscode.WorkspaceEdit();
      restore.replace(mainDocument.uri, new vscode.Range(0, 0, mainDocument.lineCount, 0), originalText);
      assert.ok(await vscode.workspace.applyEdit(restore));
      await waitFor(
        async () => completionItems(await vscode.commands.executeCommand(
          'vscode.executeCompletionItemProvider', mainDocument.uri, new vscode.Position(0, 0)
        )).some((item) => item.label === 'Echo'),
        'Timed out waiting for the language server to restore the valid program index'
      );
    }
  });

  test('serves completion, hover, definition, references, rename and outline', async () => {
    await vscode.window.showTextDocument(mainDocument, { preview: false });
    const echoDefinition = positionOf(mainDocument, 'def Echo', 0, 4);
    const echoNode = positionOf(mainDocument, 'echo Echo', 0, 5);

    const completions = completionItems(await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', mainDocument.uri, echoNode
    ));
    assert.ok(completions.some((item) => item.label === 'Echo'), 'Expected Echo completion');

    const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', mainDocument.uri, echoNode);
    assert.ok(hovers?.length > 0, 'Expected hover result for Echo node');

    const definitions = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', mainDocument.uri, echoNode);
    assert.ok(definitions?.length > 0, 'Expected definition for Echo node');

    const references = await vscode.commands.executeCommand('vscode.executeReferenceProvider', mainDocument.uri, echoDefinition);
    assert.ok(references?.length >= 2, 'Expected declaration and use references for Echo');

    const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', mainDocument.uri);
    assert.ok(symbols?.some((symbol) => symbol.name === 'Echo'));
    assert.ok(symbols?.some((symbol) => symbol.name === 'Main'));

    const originalText = mainDocument.getText();
    const rename = await vscode.commands.executeCommand(
      'vscode.executeDocumentRenameProvider', mainDocument.uri, echoDefinition, 'EchoRenamed'
    );
    assert.ok(rename, 'Expected rename workspace edit for Echo');
    try {
      assert.ok(await vscode.workspace.applyEdit(rename), 'Expected VS Code to apply the rename edit');
      assert.ok(mainDocument.getText().includes('def EchoRenamed'), 'Expected renamed declaration');
      assert.ok(mainDocument.getText().includes('echo EchoRenamed'), 'Expected renamed reference');
    } finally {
      const restore = new vscode.WorkspaceEdit();
      restore.replace(mainDocument.uri, new vscode.Range(0, 0, mainDocument.lineCount, 0), originalText);
      assert.ok(await vscode.workspace.applyEdit(restore));
    }
  });

  test('provides semantic tokens and the Run CodeLens', async () => {
    await vscode.window.showTextDocument(mainDocument, { preview: false });
    const semanticTokens = await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', mainDocument.uri);
    assert.ok(semanticTokens?.data?.length > 0, 'Expected semantic tokens from the language server');

    const lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', mainDocument.uri);
    const runLens = lenses?.find((lens) => lens.command?.command === 'neva.runMain');
    assert.ok(runLens, 'Expected Run CodeLens for Main');

    await vscode.commands.executeCommand('neva.runMain', mainDocument.uri);
    await waitFor(
      () => vscode.window.terminals.find((terminal) => terminal.name === 'Neva Run'),
      'Timed out waiting for Neva Run terminal'
    );
  });

  test('opens the packaged Visual Mode without a standalone neva-view process', async () => {
    await vscode.window.showTextDocument(mainDocument, { preview: false });
    assert.strictEqual(api.getEditorMode(), 'textual');

    await vscode.commands.executeCommand('neva.openVisualMode');
    await waitFor(
      () => api.getEditorMode() === 'visual',
      'Timed out switching to Visual Mode'
    );
    await waitFor(
      () => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
        .some((tab) => tab.label === 'Neva Visual Mode'),
      'Timed out opening the Visual Mode WebView'
    );

    assert.ok(fs.existsSync(path.resolve(extension.extensionPath, 'dist/webview/index.html')));
    assert.ok(
      !fs.readdirSync(path.resolve(extension.extensionPath, 'bin')).some((file) => file.startsWith('neva-view')),
      'VS Code package must not require a standalone neva-view binary'
    );
  });

  test('keeps the generated TextMate grammar aligned with core Neva constructs', () => {
    const grammar = JSON.parse(fs.readFileSync(path.resolve(extension.extensionPath, 'syntaxes/neva.tmLanguage.json'), 'utf8'));
    const source = JSON.stringify(grammar);
    for (const scope of ['storage.type.dict', 'entity.name.function', 'variable.other.node', 'keyword.control']) {
      assert.ok(source.includes(scope), `Expected TextMate scope ${scope}`);
    }
  });
});
