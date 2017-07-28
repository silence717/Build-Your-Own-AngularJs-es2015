## Two-Way Data Binding
双向数据绑定和单向数据绑定非常相似。我们接下来讨论这几个重要的差异，但首先让我们充实已经有了的单向数据绑定。

最简单的双向数据绑定配置就是在Scope定义对象里面使用文本`=`字符：
```js
it('allows binding two-way expression to isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        anAttr: '='
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.anAttr).toBe(42);
  });
});
```
我们也可以使用别名让scope属性与DOM属性有一个不同的名字：
```js
it('allows aliasing two-way expression attribute on isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '=theAttr'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive the-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myAttr).toBe(42);
  });
});
```
双向数据绑定也被watch,就像单向数据绑定：
```js
it('watches two-way expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
          scope: {
            myAttr: '='
          },
          link: function(scope) {
            givenScope = scope;
          }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);
    $rootScope.parentAttr = 41;
    $rootScope.$digest();
    expect(givenScope.myAttr).toBe(42);
  }); 
});
```
并且他们是可选的，当绑定符是特定的`=?`:
```js
it('does not watch optional missing two-way expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '=?'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect($rootScope.$$watchers.length).toBe(0);
  }); 
});
```
我们可以通过在绑定正则表达式里面添加对`=`的支持让这些测试通过。

```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<=])(\??)\s*(\w*)\s*/);
// ...
```
然后通过特定的实现，和对单向绑定里面做的一样：
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
    var attrName = definition.attrName;
    var parentGet, unwatch;
    switch (definition.mode) {
      case '@':
        attrs.$observe(attrName, function(newAttrValue) {
          isolateScope[scopeName] = newAttrValue;
        });
        if (attrs[attrName]) {
          isolateScope[scopeName] = attrs[attrName];
        }
        break;
      case '<':
        if (definition.optional && !attrs[attrName]) {
    break; }
    parentGet = $parse(attrs[attrName]);
    isolateScope[scopeName] = parentGet(scope);
    unwatch = scope.$watch(parentGet, function(newValue) {
      isolateScope[scopeName] = newValue;
    });
    isolateScope.$on('$destroy', unwatch);
    break;
    case '=':
      if (definition.optional && !attrs[attrName]) {
    break; }
      parentGet = $parse(attrs[attrName]);
      isolateScope[scopeName] = parentGet(scope);
      unwatch = scope.$watch(parentGet, function(newValue) {
        isolateScope[scopeName] = newValue;
      });
      isolateScope.$on('$destroy', unwatch);
      break;
    } 
  });
```