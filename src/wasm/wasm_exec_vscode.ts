// @ts-nocheck

// This is modified version of the original wasm_exec_node.js from Go authors.

"use strict";

globalThis.require = require;
globalThis.fs = require("fs");
globalThis.path = require("path");
globalThis.TextEncoder = require("util").TextEncoder;
globalThis.TextDecoder = require("util").TextDecoder;

globalThis.performance ??= require("performance");

globalThis.crypto ??= require("crypto");

require("./wasm_exec");

const go = new Go();
go.env = Object.assign({ TMPDIR: require("os").tmpdir() }, process.env);
go.exit = process.exit;

export const loadWasm = async (): WebAssembly.WebAssemblyInstantiatedSource => {
  try {
    const source = await WebAssembly.instantiate(
      fs.readFileSync(path.resolve(__dirname, "../../wasm/main.wasm")),
      go.importObject
    );

    process.on("exit", (code) => {
      if (code === 0 && !go.exited) {
        go._pendingEvent = { id: 0 };
        go._resume();
      }
    });

    go.run(source.instance); // async

    return source;
  } catch (err) {
    console.error(err);
  }
};
