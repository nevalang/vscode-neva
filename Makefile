# Create .vsix package via vsce command
.PHONY: pkg
pkg:
	npm i
	npm run build
	npx vsce package