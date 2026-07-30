const path = require('path');
const fs = require('fs');
const process = require('process');
const { downloadAndUnzipVSCode, runTests } = require('@vscode/test-electron');

async function vscodeExecutablePath() {
  const downloadedPath = await downloadAndUnzipVSCode({ version: 'stable' });

  // Recent macOS VS Code archives use `Code`; @vscode/test-electron 2.5.2
  // still resolves the historical `Electron` filename.
  if (process.platform === 'darwin' && !fs.existsSync(downloadedPath)) {
    const codePath = path.join(path.dirname(downloadedPath), 'Code');
    if (fs.existsSync(codePath)) return codePath;
  }

  return downloadedPath;
}

async function main() {
  try {
    if (process.env.NEVA_TEST_TOOLS_DIR) {
      process.env.PATH = `${process.env.NEVA_TEST_TOOLS_DIR}${path.delimiter}${process.env.PATH}`;
    }
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
    const testWorkspacePath = path.resolve(__dirname, '..');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspacePath, '--disable-extensions'],
      vscodeExecutablePath: await vscodeExecutablePath(),
    });
  } catch (error) {
    console.error('Failed to run extension tests');
    console.error(error);
    process.exit(1);
  }
}

main();
