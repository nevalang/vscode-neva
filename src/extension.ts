import { Disposable, ExtensionContext, window } from "vscode";
import { ParseFunc, NevaEditor } from "./editor";
import { loadWasm } from "./wasm/wasm_exec_vscode";

declare global {
  var parseNevaFile: ParseFunc;
}

const viewType = "neva.editNeva";

export async function activate(context: ExtensionContext) {
  await loadWasm(); // injects parseNevaFile into global
  const parse: ParseFunc = global.parseNevaFile;
  const editor = new NevaEditor(context, parse);

  const disposable: Disposable = window.registerCustomEditorProvider(
    viewType,
    editor,
    { supportsMultipleEditorsPerDocument: true }
  );

  context.subscriptions.push(disposable);
}
