## Applying Directives to Classes
第三种将指令应用于DOM的方法是通过元素的CSS class名称做匹配。我们可以简单的使用一个class名称去匹配一个指令名称：
```js
it('compiles class directives', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div class="my-directive"></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
第二点，就像属性指令，同一个元素的几个class都可以应用指令：
```js
it('compiles several class directives in an element', function() {
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
    var el = $('<div class="my-directive my-second-directive"></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
    expect(el.data('secondCompiled')).toBe(true);
  }); 
});
```
第三点，class名称也有同样的集中前缀，我们在element和attribute（但是他们可能不使用`ng-attr`前缀）：
```js
it('compiles class directives with pre xes', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div class="x-my-directive"></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
为了实现基于class的匹配，我们只需要遍历每个节点的`classList`属性，并且匹配指令到每个统一化的class名称：
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
  _.forEach(node.classList, function(cls) {
    var normalizedClassName = directiveNormalize(cls);
    addDirective(directives, normalizedClassName);
  });
  return directives;
}
```
注意：AngularJS没有使用`classList`因为HTML5功能在旧的浏览器不被支持。相反，它可能手动标识元素的`className`属性。