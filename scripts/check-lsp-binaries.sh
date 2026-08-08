#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${ROOT_DIR}/bin"

REQUIRED_BINARIES=(
  "neva-lsp-windows-arm64.exe"
  "neva-lsp-windows-amd64.exe"
  "neva-lsp-linux-arm64"
  "neva-lsp-linux-amd64"
  "neva-lsp-darwin-arm64"
  "neva-lsp-darwin-amd64"
)

if [[ ! -d "${BIN_DIR}" ]]; then
  echo "error: missing ${BIN_DIR}. Build/copy Neva LSP binaries first."
  exit 1
fi

missing=0
for binary in "${REQUIRED_BINARIES[@]}"; do
  binary_path="${BIN_DIR}/${binary}"

  if [[ ! -f "${binary_path}" ]]; then
    echo "error: missing binary: ${binary_path}"
    missing=1
    continue
  fi

  if [[ "${binary}" != *.exe && ! -x "${binary_path}" ]]; then
    echo "error: binary is not executable: ${binary_path}"
    missing=1
  fi

done

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "ok: all required LSP binaries are present in ${BIN_DIR}"
