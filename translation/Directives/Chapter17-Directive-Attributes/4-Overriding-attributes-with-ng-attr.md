## Overriding attributes with ng-attr
当我们看到你可以给属性添加一个`ng-attr-`的前缀，属性被收集的时候前缀会被去除。但是当一个元素和没有`ng-attr-`前缀有相同的属性声明会发生什么？
我们现在的实现依赖于他们哪一个首先声明，但Angular实际上有一个独立的顺序行为对于这种：一个`ng-attr-`前缀属性将会覆盖一个没有前缀的。
```js
it('overrides attributes with ng-attr- versions', function() {
  registerAndCompile(
    'myDirective',
    '<input my-directive ng-attr-whatever="42" whatever="41">',
    function(element, attrs) {
      expect(attrs.whatever).toEqual('42');
    }
  ); 
});
```
我们循环属性的是，如果我们看到有一个`ng-attr-`前缀那么为这个属性设置一个标识。然后，当我们存储属性的时候，我们首先检查这个属性是否已经被存储起来。
那就是，除非它有`ng-attr-`前缀，在这种情况下，它的存储会覆盖之前的任何值：
```js
function collectDirectives(node, attrs) {
  var directives = [];
  if (node.nodeType === Node.ELEMENT_NODE) {
    var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
    addDirective(directives, normalizedNodeName, 'E');
    _.forEach(node.attributes, function(attr) {
        var attrStartName, attrEndName;
        var name = attr.name;
        var normalizedAttrName = directiveNormalize(name.toLowerCase());
        var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
        if (isNgAttr) {
          name = _.kebabCase(
            normalizedAttrName[6].toLowerCase() +
            normalizedAttrName.substring(7)
          );
        }
        var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
        if (directiveIsMultiElement(directiveNName)) {
          if (/Start$/.test(normalizedAttrName)) {
            attrStartName = name;
            attrEndName = name.substring(0, name.length - 5) + 'end';
            name = name.substring(0, name.length - 6);
          } 
        }
        normalizedAttrName = directiveNormalize(name.toLowerCase());
        addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);
        if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
          attrs[normalizedAttrName] = attr.value.trim();
          if (isBooleanAttribute(node, normalizedAttrName)) {
            attrs[normalizedAttrName] = true;
          }
        }
    });
        _.forEach(node.classList, function(cls) {
          var normalizedClassName = directiveNormalize(cls);
          addDirective(directives, normalizedClassName, 'C');
        });
  } else if (node.nodeType === Node.COMMENT_NODE) {
    var match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
    if (match) {
      addDirective(directives, directiveNormalize(match[1]), 'M');
    }
  }
  directives.sort(byPriority);
  return directives;
}
```