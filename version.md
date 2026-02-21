# Versioning Notes

Use this checklist before bumping `package.json` version.

## 1) Check currently deployed Marketplace version first

Always verify the latest published version in VS Code Marketplace before changing the local version.

Example query:

```bash
payload='{"filters":[{"criteria":[{"filterType":7,"value":"nevalang.vscode-nevalang"}],"pageNumber":1,"pageSize":1,"sortBy":0,"sortOrder":0}],"flags":914}'
curl -sS 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.1-preview.1' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json;api-version=7.1-preview.1;excludeUrls=true' \
  --data "$payload" | jq -r '.results[0].extensions[0].versions[0].version'
```

If Marketplace is `0.7.9` and local `package.json` is already `0.7.10`, do not bump again to `0.7.11` unless `0.7.10` is already published.

## 2) Build and verify release artifacts before publish

1. Rebuild LSP binaries into `bin/`.
2. Run:
   - `npm run check:lsp-binaries`
   - `npm run build`
   - `npm run test:integration`
3. Package VSIX:
   - `npm run package:vsix`

## 3) Publish flow reminder

Marketplace release is driven by GitHub release workflow (`release-marketplace.yml`) and requires `VSCE_PAT`.

