#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-bin}"

# shellcheck source=/dev/null
source .github/neva-lsp.lock

tag_commit="$(git ls-remote "https://github.com/${NEVA_LSP_REPOSITORY}.git" "refs/tags/${NEVA_LSP_VERSION}" | awk 'NR == 1 { print $1 }')"
if [[ "$tag_commit" != "$NEVA_LSP_COMMIT" ]]; then
  echo "Neva LSP lock mismatch: ${NEVA_LSP_VERSION} resolves to ${tag_commit:-nothing}, expected ${NEVA_LSP_COMMIT}" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
gh release download "$NEVA_LSP_VERSION" --repo "$NEVA_LSP_REPOSITORY" --pattern SHA256SUMS --dir "$OUT_DIR"

if [[ "$(sha256sum "$OUT_DIR/SHA256SUMS" | awk '{ print $1 }')" != "$NEVA_LSP_CHECKSUMS_SHA256" ]]; then
  echo 'Neva LSP checksum manifest does not match the lock' >&2
  exit 1
fi

gh release download "$NEVA_LSP_VERSION" --repo "$NEVA_LSP_REPOSITORY" --pattern 'neva-lsp-*' --dir "$OUT_DIR"
(cd "$OUT_DIR" && sha256sum -c SHA256SUMS)
