import { Disposable, ExtensionContext, window } from "vscode";
import { ParseFunc, NevaEditor } from "./editor";
import { patchGlobal } from "./wasm/wasm_exec_vscode";

declare global {
  var parseNevaFile: ParseFunc;
}

const viewType = "neva.editNeva";

export async function activate(context: ExtensionContext) {
  console.log("vscode neva activated");

  await patchGlobal(); // injects parseNevaFile into global
  const editor = new NevaEditor(context, global.parseNevaFile);

  const disposable: Disposable = window.registerCustomEditorProvider(
    viewType,
    editor,
    { supportsMultipleEditorsPerDocument: true }
  );

  context.subscriptions.push(disposable);
}
