import { ExtensionContext } from "vscode";
import { registerNevaEditor } from "./editor";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(registerNevaEditor(context));
}
