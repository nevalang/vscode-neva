#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-bin}"
ASSET_PATTERN="${NEVA_LSP_ASSET_PATTERN:-neva-lsp-*}"

# shellcheck source=/dev/null
source .github/neva-lsp.lock

tag_commit="$(git ls-remote "https://github.com/${NEVA_LSP_REPOSITORY}.git" "refs/tags/${NEVA_LSP_VERSION}^{}" | awk 'NR == 1 { print $1 }')"
if [[ -z "$tag_commit" ]]; then
  tag_commit="$(git ls-remote "https://github.com/${NEVA_LSP_REPOSITORY}.git" "refs/tags/${NEVA_LSP_VERSION}" | awk 'NR == 1 { print $1 }')"
fi
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

gh release download "$NEVA_LSP_VERSION" --repo "$NEVA_LSP_REPOSITORY" --pattern "$ASSET_PATTERN" --dir "$OUT_DIR"

if [[ "$ASSET_PATTERN" == 'neva-lsp-*' ]]; then
  (cd "$OUT_DIR" && sha256sum -c SHA256SUMS)
else
  downloaded_asset="$(find "$OUT_DIR" -maxdepth 1 -type f -name "$ASSET_PATTERN" -exec basename {} \; | head -n 1)"
  if [[ -z "$downloaded_asset" ]]; then
    echo "No LSP asset matched ${ASSET_PATTERN}" >&2
    exit 1
  fi
  (cd "$OUT_DIR" && grep -F "  ${downloaded_asset}" SHA256SUMS | sha256sum -c -)
fi
