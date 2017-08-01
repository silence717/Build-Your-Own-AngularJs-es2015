## Expression Binding
第4种也是最后一种绑定一些东西到隔离scope就是绑定表达式，它在scope定义对象使用`&`字符发生。它和其他两个有点不同，因为它主要用于绑定行为而不是data:
当你应用该指令，提供了一个表达式当事件发生时该指令可以调用。这是非常有用的，尤其是事件驱动的指令，例如`ngClick`，但是如果具有普遍适用性。

绑定的表达式在隔离scope作为一个函数呈现，我们可以调用，比如，link函数：
```js
it('allows binding an invokable expression on the parent scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myExpr: '&'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    $rootScope.parentFunction = function() {
      return 42; 
    };
    var el = $('<div my-directive my-expr="parentFunction() + 1"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myExpr()).toBe(43);
  }); 
});
```
隔离scope上的`myExpr`函数实际上就是`parentFunction() + 1`表达式的函数 - 它调用父Scope的`parentFunction`，并且给结果加1.

为了这个工作，我们需要再次访问隔离scope定义去解析函数。在本例中，我们添加`&`字符为`mode`属性允许的字符之一：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<&]|=(\*?))(\??)\s*(\w*)\s*/);
    bindings[scopeName] = {
          mode: match[1][0],
          collection: match[2] === '*',
          optional: match[3],
          attrName: match[4] || scopeName
    }; 
  });
  return bindings;
}
```
剩下的真的非常简单，当遇到一个`&`绑定，我们解析相应的属性到一个表达式函数。然后我们添加一个函数在隔离scope上。所有的表达式函数需要scope作为第一个参数，包裹的函数会提高这个。
关键是，表达式是在父scope的上下文中调用的，而不是隔离scope。这是明智的，因为表达式是指令的用户定义的，而不是指令本身：
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
  var attrName = definition.attrName;
  switch (definition.mode) {
    case '@':
      // ...
      break;
   case '<':
      // ...
      break;
    case '=':
      // ...
      break;
    case '&':
      var parentExpr = $parse(attrs[attrName]);
      isolateScope[scopeName] = function() {
        return parentExpr(scope);
      };
    break;
  }  
});
```
我们现在的实现允许在父Scope上调用函数，但是不允许传递任何参数，有这样的限制。我们可以通过一些修改修复这个。这种方法的工作方式和直接调用函数的方式有些不同。考虑到父scope上的后续表达式：
```angular2html
<div my-expr="parentFunction(a, b)"></div>
```
人们可能希望从隔离scope调用这个
```
scope.myExpr(1, 2);
```
但是事实并不是这样。如果你从指令用户的角度看，`a`和`b`都不是你希望从里面的指令接收的参数，但也可能是父scope自己的属性。如果不能再这些表达式中使用它们，那是相当有限的。

因此，我们如何实现一个解决方案，在它里面，隔离scope表达式可能从里面的隔离scope提供，也可能不是。我们可以做的是命名参数，定义为对象：
```js
scope.myExpr({a: 1, b: 2});
```
然后，如果你的系统设计为只有`b`来自于隔离scope，并且`a`实际上引用的是父scope上的，那么会很容易完成。

这里的想法作为单元测试来表达：
```js
it('allows passing arguments to parent scope expression', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myExpr: '&'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var gotArg;
    $rootScope.parentFunction = function(arg) {
      gotArg = arg;
    };
    var el = $('<div my-directive my-expr="parentFunction(argFromChild)"></div>');
    $compile(el)($rootScope);
    givenScope.myExpr({argFromChild: 42});
    expect(gotArg).toBe(42);
  }); 
});
```
这里我们在父scope上定义一个函数，我们从绑定到隔离scope的`myExpr`表达式调用。在表达式我们指向一个叫做`argFromChild`的参数，这正是我们通过命名参数从隔离Scope传递的。

我们继续，并且实现它。这实际上非常简单，这是因为我们已经有了一个解决方案将命名参数传递到表达式：这是表达式函数可选的第二个`locals`参数。我们的外部函数需要一个参数 - the locals -
并将其作为第二个参数传递到表达式：
```js
case '&':
  var parentExpr = $parse(attrs[attrName]);
  isolateScope[scopeName] = function(locals) {
  return parentExpr(scope, locals);
  }; 
  break;
```
因此当表达式`parentFunction(argFromChild)`被计算，`argFromChild`查找作为它的一部分结果。如果有一个匹配属性的本地对象（与从隔离scope传入的"命名参数"相对应），
它会被当作`argFromChild`的值使用。如果本地没有这样的属性，`argFromChild`从父scope查找。

最后，一个表达式绑定可能会在特定的隔离scope标记为可选。如果这样做了，并且表达式不是指令用户提供的，那么在scope上就不会有函数调用：
```js
it('sets missing optional parent scope expression to unde ned', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myExpr: '&?'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var gotArg;
    $rootScope.parentFunction = function(arg) {
      gotArg = arg;
      };
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(givenScope.myExpr).toBeUndefined();
    }); 
});  
```
回想表达式的章节，当`$parse`给定的东西不知道如何解析（就像`undefined`或者`null`），它仅仅返回LoDash的`_.noop`函数。如果该函数是一个可选绑定，我们可以利用这个事实，跳过创建绑定：
```js
case '&':
    var parentExpr = $parse(attrs[attrName]);
    if (parentExpr === _.noop && definition.optional) {
      break; 
    }
    isolateScope[scopeName] = function(locals) {
      return parentExpr(scope, locals);
    };
    break;
```