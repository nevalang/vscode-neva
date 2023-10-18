import { ExtensionContext } from "vscode";
import { registerNevaEditor } from "./editor";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(registerNevaEditor(context));

  // context.subscriptions.push(
  //   vscode.commands.registerCommand()
  // )

  // const panel = vscode.window.createWebviewPanel(
  //   "nevaEditor",
  //   "Neva Editor",
  //   vscode.ViewColumn.Active,
  //   {
  //     enableScripts: true,
  //   }
  // );

  // And set its HTML content
  // panel.webview.html = getWebviewContent();

  // After 5sec, programmatically close the webview panel
  // const timeout = setTimeout(() => panel.dispose(), 5000);

  // reveal panel
  // panel.reveal()

  // Send a message to our webview.
  // You can send any JSON serializable data.
  // panel.webview.postMessage({ command: "refactor" });

  // Handle messages from the webview
  // panel.webview.onDidReceiveMessage()

  // panel.onDidDispose(
  //   () => {
  //     // When the panel is closed, cancel any future updates to the webview content
  //   },
  //   null,
  //   context.subscriptions
  // );
}

// function getWebviewContent() {
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Cat Coding</title>
// </head>
// <body>
//     <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
// </body>
// </html>`;
// }

// handle messages from extension in webview, must be inside getWebviewContent
// vscode.postMessage({
//   command: 'alert',
//   text: '🐛  on line ' + count
// })

// send message from webview to extension
// window.addEventListener('message', event => {})
