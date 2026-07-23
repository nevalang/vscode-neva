#!/usr/bin/env bash
set -euo pipefail

NEVA_DIR="${1:-./neva-lsp}"
OUT_DIR="${2:-./bin}"

if [[ ! -f "$NEVA_DIR/go.mod" ]]; then
  echo "Expected Go module at $NEVA_DIR/go.mod" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
pushd "$NEVA_DIR" >/dev/null

LSP_ENTRY="./cmd/lsp"
if [[ ! -d "$LSP_ENTRY" ]]; then
  if [[ -f "./main.go" ]]; then
    LSP_ENTRY="."
  else
    echo "Unable to locate LSP entrypoint (expected ./cmd/lsp or ./main.go)" >&2
    exit 1
  fi
fi

CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-darwin-amd64" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-darwin-arm64" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-linux-amd64" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-linux-arm64" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=linux GOARCH=loong64 go build -o "$OUT_DIR/neva-lsp-linux-loong64" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-windows-amd64.exe" "$LSP_ENTRY"
CGO_ENABLED=0 GOOS=windows GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-windows-arm64.exe" "$LSP_ENTRY"

popd >/dev/null
