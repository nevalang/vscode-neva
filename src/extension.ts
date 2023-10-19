import { ExtensionContext } from "vscode";
import { registerNevaEditor } from "./editor";
import { getWasm } from "./wasm/wasm_exec_node";

export function activate(context: ExtensionContext) {
  getWasm().then(console.log);
  context.subscriptions.push(registerNevaEditor(context));
}
