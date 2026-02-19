const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
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
