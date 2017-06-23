## Passing Attributes to the compile Function
从上一章我们实现的指令支持DOM编译，和指令的`compile`函数。我们看到这个函数接收JQuery（jqLite）包裹的DOM元素作为参数。该元素当然也提供访问DOM元素。然而，这里有一个更简单的方式去获取这些属性，
给compile函数使用第二个参数。第二个参数是一个对象，属性是DOM元素的属性，他们的名字是驼峰：
```js
describe('attributes', function() {
  it('passes the element attributes to the compile function', function() {
    var injector = makeInjectorWithDirectives('myDirective', function() {
      return {
        restrict: 'E',
        compile: function(element, attrs) {
          element.data('givenAttrs', attrs);
        }
      }; 
    });
    injector.invoke(function($compile) {
      var el = $('<my-directive my-attr="1" my-other-attr="two"></my-directive>');
      $compile(el);
      expect(el.data('givenAttrs').myAttr).toEqual('1');
      expect(el.data('givenAttrs').myOtherAttr).toEqual('two');
    });
  }); 
});
```
在这个测试里面，我们期望`compile`函数接收第二个参数，我们添加到元素上作为data属性。然后我们检查它，看它是否与DOM节点中存在的属性相对应。

除了驼峰化名称，另外一件事情就是去除空格。任何属性的空格值都应该被去除：
```js
it('trims attribute values', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      restrict: 'E',
      compile: function(element, attrs) {
        element.data('givenAttrs', attrs);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<my-directive my-attr=" val "></my-directive>');
    $compile(el);
    expect(el.data('givenAttrs').myAttr).toEqual('val');
  });
});
```
我们为DOM编译添加这个的支持。我们需要为正在变异的每个节点构建一个属性对象。这个在`compileNodes`的节点循环发生。我们创建一个属性对象，然后首先传递它到`collectDirectives`，在到`applyDirectivesToNode`:
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var attrs = {};
    var directives = collectDirectives(node, attrs);
    var terminal = applyDirectivesToNode(directives, node, attrs);
    if (!terminal && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  }); 
}
```
在`applyDirectivesToNode`对象直接指向编译函数，我们的测试用例将会捕获它：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
    var $compileNode = $(compileNode);
    var terminalPriority = -Number.MAX_VALUE;
    var terminal = false;
    _.forEach(directives, function(directive) {
      if (directive.$$start) {
        $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
      }
      if (directive.priority < terminalPriority) {
        return false;
      }
      if (directive.compile) {
        directive.compile($compileNode, attrs);
      }
      if (directive.terminal) {
        terminal = true;
        terminalPriority = directive.priority;
      }
    });
  return terminal;
}
```
收集属性和将他们放到对象的真实工作发生在`collectDirectives`。由于我们已经在哪个函数迭代所有的属性（目的是匹配它们到指令），我们可以在同一个迭代里面添加所有的属性到对象：
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
        if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
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
          addDirective(directives,
            normalizedAttrName, 'A', attrStartName, attrEndName);
          attrs[normalizedAttrName] = attr.value.trim();
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