## Restricting Directive Application
因此，有4种方式在Angular里面将指令与DOM匹配：通过元素名，属性名，类名，和特殊的注释。

然而，这并不意味着任何给定的指令都可以通过应用程序开发哲选择的方式进行匹配。指令作者有可能限制指令可以使用四种方式中的哪一种。这很有用，例如，因为将一个自定义的元素
应用到注释中是很有意义的。它就是不起作用。

限制可以通过指令定义对象的特定`restrict`属性来实现。这个属性包含一个由单个字符代码和他们组合的微笑的特定区域语言：
* `E` 匹配 element 名
* `A` 匹配 attribute 名
* `C` 匹配 class 名
* `M` 匹配注释
* `EA` 匹配 element 和 attribute 名
* `MCA` 匹配注释、class 和 attribute 名
* 等等

我们使用一些生成测试技术，这样我们就可以在不写几十个测试用例的情况下覆盖很多方面。我们将建立一个由不同 `restrict` 组合的数据结构，并且给出四方式使用不同组合的预期结果。
然后，我们将遍历数据结构，并且声称`describe`块：
```js
_.forEach({
  E:    {element: true,  attribute: false, class: false, comment: false},
  A:    {element: false, attribute: true,  class: false, comment: false},
  C:    {element: false, attribute: false, class: true,  comment: false},
  M:    {element: false, attribute: false, class: false, comment: true},
  EA:   {element: true,  attribute: true,  class: false, comment: false},
  AC:   {element: false, attribute: true,  class: true,  comment: false},
  EAM:  {element: true,  attribute: true,  class: false, comment: true},
  EACM: {element: true,  attribute: true,  class: true,  comment: true},
}, function(expected, restrict) {
  describe('restricted to '+restrict, function() {
  });
});
```
在这个循环中，我们可以添加另一个循环去遍历可以使用的四种DOM结构：
```js
_.forEach({
  E:    {element: true,  attribute: false, class: false, comment: false},
  A:    {element: false, attribute: true,  class: false, comment: false},
  C:    {element: false, attribute: false, class: true,  comment: false},
  M:    {element: false, attribute: false, class: false, comment: true},
  EA:   {element: true,  attribute: true,  class: false, comment: false},
  AC:   {element: false, attribute: true,  class: true,  comment: false},
  EAM:  {element: true,  attribute: true,  class: false, comment: true},
  EACM: {element: true,  attribute: true,  class: true,  comment: true},
}, function(expected, restrict) {
  describe('restricted to '+restrict, function() {
    _.forEach({
      element:   '<my-directive></my-directive>',
      attribute: '<div my-directive></div>',
      class:     '<div class="my-directive"></div>',
      comment:   '<!-- directive: my-directive -->'
    }, function(dom, type) {
    it((expected[type] ? 'matches' : 'does not match')+' on '+type, function() {
        var hasCompiled = false;
        var injector = makeInjectorWithDirectives('myDirective', function() {
          return {
            restrict: restrict,
            compile: function(element) {
              hasCompiled = true;
            }
          }; 
        });
        injector.invoke(function($compile) {
          var el = $(dom);
          $compile(el);
          expect(hasCompiled).toBe(expected[type]);
        }); 
      });
    });
  }); 
});
```
总之，这些循环添加了32个新的测试用例。如果你想为数据结构添加更多的组合，这也是很容易的。

指令的限制将在`addDirectives`函数设置。在做之前，我们需要修改`collectDirectives`以便让`addDirectives`知道现在使用的是四种匹配中的哪个：
```js
function collectDirectives(node) {
  var directives = [];
  if (node.nodeType === Node.ELEMENT_NODE) {
    var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
    addDirective(directives, normalizedNodeName, 'E');
    _.forEach(node.attributes, function(attr) {
      var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
      if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
        normalizedAttrName =
          normalizedAttrName[6].toLowerCase() +
          normalizedAttrName.substring(7);
      }
      addDirective(directives, normalizedAttrName, 'A');
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
  return directives;
}
```
`addDirective`函数可以过滤匹配指令的数组，当前模式是哪一个指令的`restrict`属性字符：
```js
function addDirective(directives, name, mode) {
    if (hasDirectives.hasOwnProperty(name)) {
      var foundDirectives = $injector.get(name + 'Directive');
      var applicableDirectives = _. lter(foundDirectives, function(dir) {
      return dir.restrict.indexOf(mode) !== -1;
    });
      directives.push.apply(directives, applicableDirectives);
    } 
}
```
在这个更改之后，你会注意到一个不幸的结果：我们当前的大部分测试挂掉了。这是因为他们没有我们当前需要的`restrict`属性。我们需要增加一个。从`compiles element directives from a single element`
测试开始，添加一个`restrict`属性，值为`EACM`知道前面的每个测试通过：
```js
it('compiles element directives from a single element', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      restrict: 'EACM',
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<my-directive></my-directive>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```
最后，`restrict`属性有一个默认值`EA`。这意味着，如果你没有定义`restrict`，你的指令只会使用element和attribute名称去匹配：
```js
it('applies to attributes when no restrict given', function() {
  var hasCompiled = false;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        hasCompiled = true;
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div my-directive></div>');
    $compile(el);
    expect(hasCompiled).toBe(true);
  }); 
});

it('applies to elements when no restrict given', function() {
  var hasCompiled = false;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        hasCompiled = true;
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<my-directive></my-directive>');
    $compile(el);
    expect(hasCompiled).toBe(true);
  });
});

it('does not apply to classes when no restrict given', function() {
  var hasCompiled = false;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        hasCompiled = true;
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div class="my-directive"></div>');
    $compile(el);
    expect(hasCompiled).toBe(false);
  }); 
});
```
我们将在指令工厂函数应用默认值，我们首先获得指令函数本身：
```js
this.directive = function(name, directiveFactory) {
  if (_.isString(name)) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid directive name';
    }
    if (!hasDirectives.hasOwnProperty(name)) {
      hasDirectives[name] = [];
      $provide.factory(name + 'Directive', ['$injector', function($injector) {
        var factories = hasDirectives[name];
        return _.map(factories, function(factory) {
          var directive = $injector.invoke(factory);
          directive.restrict = directive.restrict || 'EA';
          return directive;
        });
      }]); 
    }
    hasDirectives[name].push(directiveFactory);
  } else {
    _.forEach(name, _.bind(function(directiveFactory, name) {
      this.directive(name, directiveFactory);
    }, this)); 
  }
};
```