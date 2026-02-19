const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, message, timeoutMs = 60000, intervalMs = 750) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) {
      return value;
    }

    await sleep(intervalMs);
  }

  throw new Error(message);
}

suite('Neva extension smoke tests', () => {
  const extensionId = 'nevalang.vscode-nevalang';
  const testFilePath = path.resolve(__dirname, '../../main/main.neva');

  let document;

  suiteSetup(async function suiteSetup() {
    this.timeout(120000);

    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} should be installed in test host`);

    await extension.activate();

    document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document, { preview: false });

    await waitFor(
      async () => {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        return diagnostics.length > 0 ? diagnostics : null;
      },
      'Timed out waiting for diagnostics from Neva language server'
    );
  });

  test('registers Neva run command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('neva.runMain'),
      'Expected neva.runMain to be registered'
    );
  });

  test('receives diagnostics from language server', async () => {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    assert.ok(
      diagnostics.length > 0,
      'Expected diagnostics from Neva language server'
    );
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.source === 'compiler' ||
          diagnostic.message.includes('Component must have network')
      ),
      `Expected compiler diagnostics, got: ${diagnostics
        .map((diagnostic) => diagnostic.message)
        .join('; ')}`
    );
  });
});
