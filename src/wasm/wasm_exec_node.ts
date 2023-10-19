// @ts-nocheck

// Copyright 2021 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

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

export const getWasm = () =>
  WebAssembly.instantiate(
    fs.readFileSync(path.resolve(__dirname, "../../wasm/main.wasm")),
    go.importObject
  )
    .then((result) => {
      process.on("exit", (code) => {
        if (code === 0 && !go.exited) {
          go._pendingEvent = { id: 0 };
          go._resume();
        }
      });
      return go.run(result.instance);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
