wasm (go)
    parse(text) -> uin8array (protobuf)
        src = parser(text)
        return proto.marshal(src)

js (vscode)
    binary = wasm.parse(text)
    ast = proto.unmarshal(binary)
    react(ast)