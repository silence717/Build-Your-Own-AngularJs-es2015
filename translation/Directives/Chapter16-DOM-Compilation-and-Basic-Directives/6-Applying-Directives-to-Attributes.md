## Applying Directives to Attributes
将元素的名称与指令的名称匹配不上指令与DOM结合的唯一方法。第二个方法就是通过*属性名字*查找匹配。这可能是指令在Angular应用中最普遍的方式：
```js
it('compiles attribute directives', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div my-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
我们为元素名称实现的前缀也适用于属性名称。例如，前缀使用`x`也是允许的:
```js
it('compiles attribute directives with pre xes', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div x:my-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
很容易将这几个属性指令用到同一个元素上：
```js
it('compiles several attribute directives in an element', function() {
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      }; 
    },
    mySecondDirective: function() {
      return {
        compile: function(element) {
          element.data('secondCompiled', true);
        }
      }; 
    }
  });
  injector.invoke(function($compile) {
    var el = $('<div my-directive my-second-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
    expect(el.data('secondCompiled')).toBe(true);
  }); 
});
```
我们也可以在在同一个元素上解释使用element和attribute指令：
```js
it('compiles both element and attributes directives in an element', function() {
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      }; 
    },
    mySecondDirective: function() {
      return {
        compile: function(element) {
          element.data('secondCompiled', true);
        }
      }; 
    }
  });
  injector.invoke(function($compile) {
    var el = $('<my-directive my-second-directive></my-directive>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
    expect(el.data('secondCompiled')).toBe(true);
  }); 
});
```
`collectDirectives`函数的职责是通过属性，这里我们已经实现了通过元素名称匹配。这里，我们将要遍历当前节点所有的属性，并且添加与之匹配的指令 - 忽略大小写：
```js
function collectDirectives(node) {
  var directives = [];
  var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
  addDirective(directives, normalizedNodeName);
  _.forEach(node.attributes, function(attr) {
    var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
    addDirective(directives, normalizedAttrName);
  });
  return directives;
}
```
当我们通过属性应用指令的时候，Angular让我们使用一个特殊的前缀`ng-attr`：
```js
it('compiles attribute directives with ng-attr pre x', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      } 
    };
  });
  injector.invoke(function($compile) {
    var el = $('<div ng-attr-my-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
`ng-attr`前缀也可以和我们之前看到的任意一个前缀结合：
```js
it('compiles attribute directives with data:ng-attr prefix', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div data:ng-attr-my-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
我们会处理这种情况，在指令名称统一化之后，检查它是否以`ngAttr`开始，跟着一个大写字符。如果是，我们移除这部分，并且将第一个字符转为小写：
```js
function collectDirectives(node) {
  var directives = [];
  var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
  addDirective(directives, normalizedNodeName);
  _.forEach(node.attributes, function(attr) {
    var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
    if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
      normalizedAttrName =
        normalizedAttrName[6].toLowerCase() +
        normalizedAttrName.substring(7);
    }
    addDirective(directives, normalizedAttrName);
  });
  return directives;
}
```