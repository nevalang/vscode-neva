#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-dist}"

# shellcheck source=/dev/null
source .github/neva-visual-editor.lock

tag_commit="$(git ls-remote "https://github.com/${NEVA_VISUAL_EDITOR_REPOSITORY}.git" "refs/tags/${NEVA_VISUAL_EDITOR_VERSION}" | awk 'NR == 1 { print $1 }')"
if [[ "$tag_commit" != "$NEVA_VISUAL_EDITOR_COMMIT" ]]; then
  echo "Neva Visual Editor lock mismatch: ${NEVA_VISUAL_EDITOR_VERSION} resolves to ${tag_commit:-nothing}, expected ${NEVA_VISUAL_EDITOR_COMMIT}" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
gh release download "$NEVA_VISUAL_EDITOR_VERSION" --repo "$NEVA_VISUAL_EDITOR_REPOSITORY" --pattern "$NEVA_VISUAL_EDITOR_ASSET" --dir "$OUT_DIR"

asset_path="$OUT_DIR/$NEVA_VISUAL_EDITOR_ASSET"
if [[ "$(sha256sum "$asset_path" | awk '{ print $1 }')" != "$NEVA_VISUAL_EDITOR_ASSET_SHA256" ]]; then
  echo 'Neva Visual Editor bundle does not match the lock' >&2
  exit 1
fi

tar -xzf "$asset_path" -C "$OUT_DIR"
test -f "$OUT_DIR/webview/index.html"
