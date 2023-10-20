import { Disposable, ExtensionContext, window } from "vscode";
import { ParseFunc, NevaEditor } from "./editor";
import { loadWasm } from "./wasm/wasm_exec_vscode";

declare global {
  var parse: ParseFunc;
}

const viewType = "neva.editNeva";

export async function activate(context: ExtensionContext) {
  await loadWasm();
  const parse: ParseFunc = global.parse; // @ts-ignore
  const editor = new NevaEditor(context, parse);

  const disposable: Disposable = window.registerCustomEditorProvider(
    viewType,
    editor,
    {
      supportsMultipleEditorsPerDocument: true,
    }
  );

  context.subscriptions.push(disposable);
}
