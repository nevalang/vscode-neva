#!/usr/bin/env bash
set -euo pipefail

NEVA_DIR="${1:-./neva-main}"
OUT_DIR="${2:-./bin}"

if [[ ! -f "$NEVA_DIR/go.mod" ]]; then
  echo "Expected Go module at $NEVA_DIR/go.mod" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
pushd "$NEVA_DIR" >/dev/null

CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-darwin-amd64" ./cmd/lsp
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-darwin-arm64" ./cmd/lsp
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-linux-amd64" ./cmd/lsp
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-linux-arm64" ./cmd/lsp
CGO_ENABLED=0 GOOS=linux GOARCH=loong64 go build -o "$OUT_DIR/neva-lsp-linux-loong64" ./cmd/lsp
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o "$OUT_DIR/neva-lsp-windows-amd64.exe" ./cmd/lsp
CGO_ENABLED=0 GOOS=windows GOARCH=arm64 go build -o "$OUT_DIR/neva-lsp-windows-arm64.exe" ./cmd/lsp

popd >/dev/null
