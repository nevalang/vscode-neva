// This is modified version of the original wasm_exec_node.js from Go authors.

import * as fs from "fs";
import * as path from "path";
import { TextEncoder, TextDecoder } from "util";
import * as os from "os";
import { performance } from "perf_hooks";
import * as crypto from "crypto";

(globalThis as any).fs = fs;
(globalThis as any).path = path;
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;
(globalThis as any).performance ??= performance;
(globalThis as any).crypto ??= crypto;

require("./wasm_exec.js"); // globalThis must be patched before this line
declare var Go: any; // it injects Go constructor into global scope

const go = new Go();
go.env = Object.assign({ TMPDIR: os.tmpdir() }, process.env);
go.exit = process.exit;

export const loadWasm = async (): Promise<
  WebAssembly.WebAssemblyInstantiatedSource | undefined
> => {
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
