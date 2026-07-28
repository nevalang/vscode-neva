const path = require('path');
const process = require('process');
const { runTests } = require('@vscode/test-electron');

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
      version: 'stable',
    });
  } catch (error) {
    console.error('Failed to run extension tests');
    console.error(error);
    process.exit(1);
  }
}

main();
