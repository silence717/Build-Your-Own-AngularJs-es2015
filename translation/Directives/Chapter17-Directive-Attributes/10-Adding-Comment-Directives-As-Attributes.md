## Adding Comment Directives As Attributes
就像class属性指令最终在属性对象中一样，注释指令也是一样。就像class指令属性可能与一个值关联，因此可能注释指令也是：
```js
it('adds an attribute with a value from a comment directive', function() {
  registerAndCompile(
    'myDirective',
    '<!-- directive: my-directive and the attribute value -->',
    function(element, attrs) {
      expect(attrs.hasOwnProperty('myDirective')).toBe(true);
      expect(attrs.myDirective).toEqual('and the attribute value');
    }
  ); 
});
```
注释指令比class指令更加容易处理，因为它有可能只是一个方向性的注释节点。不过，就想class指令一样，我们需要用正则表达式处理。我们已经有了一个解析注释指令，我们只需要稍微修改一下。
匹配指令名称完成后，我们会允许一些空格，然后我们会捕捉剩下的注释到一个组，就成为了属性的值：
```js
} else if (node.nodeType === Node.COMMENT_NODE) {
    match = /^\s*directive\:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
    if (match) {
        var normalizedName = directiveNormalize(match[1]);
        if (addDirective(directives, normalizedName, 'M')) {
          attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
        }
    } 
}
```
这里的规则与class相同：如果为注释匹配到一个指令，则将标准化的指令名称添加到属性中。