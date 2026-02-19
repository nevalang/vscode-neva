const path = require('path');
const fs = require('fs');
const Mocha = require('mocha');

function run() {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 120000,
  });

  const testsRoot = __dirname;

  fs.readdirSync(testsRoot)
    .filter((file) => file.endsWith('.test.js'))
    .forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
      } else {
        resolve();
      }
    });
  });
}

module.exports = { run };
