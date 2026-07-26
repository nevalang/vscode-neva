#!/usr/bin/env bash
set -euo pipefail

override="${1:-}"
if [[ -n "$override" ]]; then
  echo "ref=$override" >> "$GITHUB_OUTPUT"
  echo "version=manual override" >> "$GITHUB_OUTPUT"
  exit 0
fi

# shellcheck source=/dev/null
source .github/neva-tools.lock
repo="https://github.com/nevalang/neva-tools"

# Support both annotated and lightweight tags, but build from the immutable
# commit only. This detects an accidental or malicious tag move before build.
tag_commit="$(git ls-remote "$repo" "refs/tags/${NEVA_TOOLS_VERSION}^{}" | awk 'NR == 1 { print $1 }')"
if [[ -z "$tag_commit" ]]; then
  tag_commit="$(git ls-remote "$repo" "refs/tags/${NEVA_TOOLS_VERSION}" | awk 'NR == 1 { print $1 }')"
fi

if [[ "$tag_commit" != "$NEVA_TOOLS_COMMIT" ]]; then
  echo "Neva Tools lock mismatch: ${NEVA_TOOLS_VERSION} resolves to ${tag_commit:-nothing}, expected ${NEVA_TOOLS_COMMIT}" >&2
  exit 1
fi

echo "ref=$NEVA_TOOLS_COMMIT" >> "$GITHUB_OUTPUT"
echo "version=$NEVA_TOOLS_VERSION" >> "$GITHUB_OUTPUT"
