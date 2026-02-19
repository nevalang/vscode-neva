const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
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

  let extensionApi;
  let document;

  suiteSetup(async function suiteSetup() {
    this.timeout(120000);

    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} should be installed in test host`);

    extensionApi = await extension.activate();

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

  test('resolves run invocation from nearest Neva compiler root', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'neva-run-'));
    const compilerRoot = path.join(tempRoot, 'workspace', 'neva');
    const runCwd = path.join(compilerRoot, 'examples', '99_bottles');

    try {
      await fs.mkdir(path.join(compilerRoot, 'cmd', 'neva'), { recursive: true });
      await fs.mkdir(runCwd, { recursive: true });
      await fs.writeFile(
        path.join(compilerRoot, 'go.mod'),
        'module github.com/nevalang/neva\n'
      );
      await fs.writeFile(path.join(compilerRoot, 'cmd', 'neva', 'main.go'), 'package main\n');

      const invocation = extensionApi.resolveRunInvocationForTests(runCwd, 'neva-custom');
      assert.deepStrictEqual(invocation, {
        terminalCwd: compilerRoot,
        command: 'go run ./cmd/neva run ./examples/99_bottles',
      });
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
