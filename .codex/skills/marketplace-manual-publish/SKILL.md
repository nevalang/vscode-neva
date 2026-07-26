---
name: marketplace-manual-publish
description: Prepare and publish a Neva VS Code extension VSIX through the authenticated Visual Studio Marketplace browser UI when API/PAT publishing is unavailable. Use for a manual Marketplace upload, a browser-use publishing dry run, or verification of release/version parity for nevalang/vscode-neva. Never use it to create a GitHub Release, change a version, or bypass confirmation before an external upload.
---

# Manual VS Code Marketplace publish

Use this skill only from the `nevalang/vscode-neva` repository.

## Non-secret identifiers

- Publisher ID: `nevalang`
- Marketplace owner User ID: `e0d4b231-0244-6192-83ea-9ebb6fb32219`
- Public extension page: `https://marketplace.visualstudio.com/items?itemName=nevalang.vscode-nevalang`
- Publisher management page: `https://marketplace.visualstudio.com/manage/publishers/nevalang`

Do not put a PAT, password, OAuth code, browser cookie, or private email address in a command, file, issue, PR, workflow, or browser form.

## Required checks

1. Read `package.json` and record its `version`; do not modify it.
2. Read the latest GitHub Release with `gh release view`; release tag `vX.Y.Z` must equal the package version for a release-triggered publish.
3. Open the public extension page with Browser Use and inspect Version History or the latest release notes to find the published Marketplace version.
4. Stop if the local version is equal to or lower than the published version. Explain that Marketplace does not accept a duplicate or downgrade. A version bump, tag, and GitHub Release require separate explicit authorization.
5. Run `npm ci`, `npm run build`, and `npm run test:daily-driver`. Stop on a failure.
6. Package without publishing:

   ```bash
   npx -y @vscode/vsce@2.24.0 package -o vscode-nevalang.vsix
   ```

7. Check the generated `vscode-nevalang.vsix` exists and report its local path and version. Do not upload it yet.

## Browser upload

Use the `browser:control-in-app-browser` skill. Read its file-upload instructions before choosing the VSIX. Use the existing authenticated Marketplace session if available; otherwise ask the user to sign in in that browser.

1. Open the publisher management page and verify that the selected publisher is `nevalang`.
2. Navigate by visible UI controls to the Neva extension and its update/upload flow. Do not guess selectors or URLs.
3. Before selecting the VSIX file, request confirmation that the exact local file may be uploaded to the `nevalang` publisher. Mention the file name and version.
4. Select only the generated `vscode-nevalang.vsix`. Inspect the Marketplace-provided version and publisher details after selection.
5. Immediately before the final upload/publish control, request confirmation again. State the destination (`Visual Studio Marketplace`, publisher `nevalang`) and extension version.
6. After confirmation, submit once. Do not retry blindly if the UI reports an error.

## Verify and report

After an acknowledged upload, wait for the Marketplace UI to show the new version, then verify:

- Marketplace has exactly the intended version.
- The corresponding GitHub Release remains published, if one exists.
- The workflow status is accurately reported; a failed PAT-based workflow is distinct from a successful manual upload.

Report direct links, the exact version, and whether publication was verified or only prepared. Never claim publication based solely on a selected file or a submitted form.
