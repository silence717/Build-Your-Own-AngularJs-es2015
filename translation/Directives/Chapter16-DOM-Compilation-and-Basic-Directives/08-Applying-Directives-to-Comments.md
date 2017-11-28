## Applying Directives to Comments
最后的Angular指令匹配可能是最难懂的：应用指令到HTML注释。通过编写一个从文本`directive`开始的注释是可能的，然后是指令名称：
```angular2html
<!-- directive: my-directive -->
```
同样的这里有一个单元测试：
```js
it('compiles comment directives', function() {
  var hasCompiled;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        hasCompiled = true;
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<!-- directive: my-directive -->');
    $compile(el);
    expect(hasCompiled).toBe(true);
  }); 
});
```
当我们进入`collectDirectives`函数的时候手边的对象是一个DOM节点。它可能是一个元素或者是其他东西，比如注释。我们需要做的是根据节点类型执行不同的代码。
类型可以通过节点的`nodeType attribute`来决定。

我们把为元素编写的代码封装到`if`分支中，并引入一个新的分支：
```js
function collectDirectives(node) {
    var directives = [];
    if (node.nodeType === Node.ELEMENT_NODE) {
        var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
        addDirective(directives, normalizedNodeName);
        _.forEach(node.attributes, function(attr) {
          var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
          if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
            normalizedAttrName = normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7);
          }
          addDirective(directives, normalizedAttrName);
        });
        _.forEach(node.classList, function(cls) {
          var normalizedClassName = directiveNormalize(cls);
          addDirective(directives, normalizedClassName);
        });
    } else if (node.nodeType === Node.COMMENT_NODE) {
      
    }
    return directives;
}
```
我们在节点分支中做的事情就是将正则表达式与注释文本值匹配，并查看它是否以`directive`开头：如果是，我们接收它后面的指令名，统一化它，并找到匹配它的任意指令。
```js
function collectDirectives(node) {
    var directives = [];
    if (node.nodeType === Node.ELEMENT_NODE) {
        var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
        addDirective(directives, normalizedNodeName);
        _.forEach(node.attributes, function(attr) {
          var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
          if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
            normalizedAttrName = normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7);
          }
          addDirective(directives, normalizedAttrName);
        });
        _.forEach(node.classList, function(cls) {
          var normalizedClassName = directiveNormalize(cls);
          addDirective(directives, normalizedClassName);
        });
    } else if (node.nodeType === Node.COMMENT_NODE) {
      var match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
      if (match) {
        addDirective(directives, directiveNormalize(match[1]));
      }
    }
    return directives;
}
```
注意到正则表达式允许注释的开头有空格，`directive`前缀后面也允许。