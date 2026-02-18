# Contributing

> WARNING: If things break, try removing `node_modules` and reinstalling dependencies. For webview changes, restart the `watch` task.

## Structure

Extension consist of 3 parts:

1. Language server (in `nevalang/neva` repo)
2. VSCode extension in `src`
3. Syntax highlighting grammar under `web/syntaxes` directory

## Development

If you use VSCode, you can use `Run Extension` debug task. This will allow to spawn LSP-server manually (in debug-mode) and connect to it with TCP. See [launch.json](../.vscode/launch.json) and [tasks.json](../.vscode/tasks.json).

### LSP

After you make changes to LSP-server, make sure you compile binaries for all supported platforms and put them into `bin` directory in this repo. When you'll use `make pkg` the `vsce` will pack those binaries into vscode extension archive.

In CI, LSP binaries are built from `nevalang/neva-lsp` directly (see `.github/workflows/ci.yml`) and downloaded into `bin/` before packaging. No git submodule is required.
Marketplace publishing is release-only: the workflow publishes to VS Code Marketplace on `release.published` using the `VSCE_PAT` repository secret.

### Testing

After you made/debugged changes you need to test extension locally. To do that use `make pkg` command, then open `Extensions` in VSCode and select `INSTALL from vsix...` option, finally chose generated vsce package file and restart extentions/editor.

## Production

```bash
npm run build # build textmate grammar, webview and vscode extension
make pkg # pack everything into a VSIX package
```

## FAQ

- [Why not use WASM for LSP integration?](https://github.com/nevalang/neva/discussions/374#discussioncomment-7345045)
