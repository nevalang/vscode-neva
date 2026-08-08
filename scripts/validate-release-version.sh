#!/usr/bin/env bash
set -euo pipefail

tag="${1:?release tag is required}"
release_name="${2:-$tag}"
version="$(node -p "require('./package.json').version")"
expected="v${version}"

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "package.json version must be plain SemVer MAJOR.MINOR.PATCH: $version" >&2
  exit 1
}
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "release tag must be vMAJOR.MINOR.PATCH: $tag" >&2
  exit 1
}
[[ "$tag" == "$expected" ]] || {
  echo "release tag ($tag) does not match package.json ($expected)" >&2
  exit 1
}
[[ "$release_name" == "$expected" ]] || {
  echo "release name ($release_name) must be exactly $expected" >&2
  exit 1
}

echo "ok: release is $expected"
