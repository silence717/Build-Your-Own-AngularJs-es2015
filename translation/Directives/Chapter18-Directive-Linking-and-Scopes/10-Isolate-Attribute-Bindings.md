## Isolate Attribute Bindings
我们现在已经有了隔离scope，但它是完全空白的。这限制了它们的可用性，正如我们之前讨论的，有几种方式可以绑定数据到他们上面。

其中一种方法 - 我们将要实现的第一种 - 将scope属性绑定到元素的属性上。这些scope属性通过上一章节内置的属性的观察机制去观察，因此不管什么时候元素的属性`$set`，scope属性的值也将更新。

属性绑定在一些方面可能是有用的：你可以很容易的访问定义在DOM/HTML元素上面的属性，并且通过设置这种绑定形式的属性与其他的指令上面的隔离scope进行通信。这是因为一个元素的所有指令，不管隔离与否，共享同样的属性对象。

属性绑定在指令定义对象的scope上定义。key定义属性的名字，值是字符`@`,它是"属性绑定"的缩写。一旦我们添加了这个，并且`$set`属性，它就会弹出隔离scope:
```js
it('allows observing attribute to the isolate scope', function() {
  var givenScope, givenAttrs;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        anAttr: '@'
      },
      link: function(scope, element, attrs) {
        givenScope = scope;
        givenAttrs = attrs;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
  	var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    givenAttrs.$set('anAttr', '42');
    expect(givenScope.anAttr).toEqual('42');
  });
});
```
我们继续并且实现它。处理隔离绑定的第一部分发生在指令注册期间。如果指令有一个隔离scope定义，我们将解析它的内容，以便于进一步处理：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory, i) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.priority = directive.priority || 0;
    if (directive.link && !directive.compile) {
      directive.compile = _.constant(directive.link);
    }
    if (_.isObject(directive.scope)) {
      directive.$$isolateBindings = parseIsolateBindings(directive.scope);
    }
    directive.name = directive.name || name;
    directive.index = i;
    return directive;
  }); 
}]);
```
`parseIsolateBindings`是一个新函数，我们可以添加到`compile.js`的上部。它需要一个scope定义对象为参数，并且返回一个从该对象解析绑定规则的对象。现在，我们只需要这样的定义。这个函数需要一个Scope定义如下：
```js
{
	anAttr: '@'
}
```
返回下面的：
```js
{
  anAttr: {
    mode: '@' 
  }
}
```
稍后我们将构建更多的功能，但这里我们先实现我们需要的：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    bindings[scopeName] = {
      mode: definition
    };
  });
  return bindings;
}
```
处理隔离scope的绑定第二部分实际上是在指令被link的时候。这发生在节点link函数，我们遍历早期创建的`$$isolateBindings`对象：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
  var $element = $(linkNode);
  var isolateScope;
  if (newIsolateScopeDirective) {
    isolateScope = scope.$new(true);
    $element.addClass('ng-isolate-scope');
    $element.data('$isolateScope', isolateScope);
    _.forEach(
      newIsolateScopeDirective.$$isolateBindings,
      function(definition, scopeName) {
    });
  }
// ...
}
```
在这个点上，我们检查如果绑定的模式是属性绑定`@`，如果是的话，在元素相应为响应的属性添加观察。观察器更新scope上的属性值。
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
    switch (definition.mode) {
      case '@':
        attrs.$observe(scopeName, function(newAttrValue) {
          isolateScope[scopeName] = newAttrValue;
        }); 
        break;
  } 
});
```
由于`$observe`仅仅在属性变化的下次调用，我们仍然希望如果它没有实际变化我们希望有这个值，我们立即将把属性初始化的值放到scope，因此当link函数运行的时候它已经在了:
```js
it('sets initial value of observed attr to the isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        anAttr: '@'
      },
      link: function(scope, element, attrs) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.anAttr).toEqual('42');
  }); 
});
```
我们可以在注册观察器的时候这样做：
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
  switch (definition.mode) {
    case '@':
      attrs.$observe(scopeName, function(newAttrValue) {
        isolateScope[scopeName] = newAttrValue;
      });
      if (attrs[scopeName]) {
        isolateScope[scopeName] = attrs[scopeName];
      }
    break; 
  }
});
```
在这个点上，我们已经有了一以对应关系，在元素的属性名和隔离Scope的属性名。但是你可以指定一个scope属性的不同名。通过使用scope属性名称作为scope定义的key,并且指定元素属性名作为`@`字符后缀的值：
```js
it('allows aliasing observed attribute', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        aScopeAttr: '@anAttr'
      },
      link: function(scope, element, attrs) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.aScopeAttr).toEqual('42');
  }); 
});
```
我们需要解析scope定义的的值去抓取Scope的别名。作为依赖注入，正则表达式在这里派上用场。我们可以使用下面，匹配`@`字符，然后0个或多个字符，被抓取到一个组。它也支持周围的空格，和我们感兴趣的所有字符：
```
/\s*@\s*(\w*)\s*/
```
使用这个正则，我们设置一个`attrName`key值在绑定中。由于别名是可选的，`attrName`也可以只是Scope名 - 这是我们之前看到的使用情况：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*@\s*(\w*)\s*/);
    bindings[scopeName] = {
    mode: '@',
    attrName: match[1] || scopeName
    }; 
  });
  return bindings;
}
```
现在我们必须使用`attrName`，当访问元素属性，同时设置隔离绑定：
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
  var attrName = definition.attrName;	
  switch (definition.mode) {
    case '@':
      attrs.$observe(attrName, function(newAttrValue) {
        isolateScope[scopeName] = newAttrValue;
      });
      if (attrs[attrName]) {
        isolateScope[scopeName] = attrs[attrName];
      }
    break; 
  }
});
```