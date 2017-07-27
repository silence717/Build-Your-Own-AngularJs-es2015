## One-Way Data Binding
虽然属性绑定通常很有用，但最广泛使用的隔离Scope绑定模式是数据绑定：将隔离scope上的scope属性与父scope上的表达式计算链接。

数据绑定允许父和子scope的一些相同的数据共享就想继承scope的一样，但这两个有关键的区别：

| scope继承   |  隔离scope和数据绑定 |  
| :---------  | :---|  
| 从父到子共享所有的东西 | 只有表达式明确定义的属性是可共享的 |  
| 一一对应父和子属性 | 子属性可能没有匹配的父属性，但可以是任何表达式 | 
 
 在Angular里面有两种的数据绑定：单向数据绑定允许表达式将值传进隔离scope。双向数据绑定做同样的工作，但增加了将值更改传递回父scope。
 
 在这两种情况下，单向数据绑定是应用开发者大多数时间需要的。将数据传递到指令或者组件是一个非常有用的情况。双向数据绑定是比较少的，但有时候确实需要。
 
 我们开始探索它是如何工作的。你可以在scope定义对象使用`<`字符配置最简单的单向数据绑定。这句话的意思是："在父scope上计算表达式属性值"。表达式本身不在scope定义对象定义，
 而是当应用指令时在DOM属性定义。这里有一个例子`anAttr`使用这种方式绑定，用于表达式`42`,它被计算为数字42：
 ```js
it('allows binding expression to isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        anAttr: '<'
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
在链接指令后，我们期望对应的scope属性出现。

与属性绑定一样，可以别名数据绑定表达式，这样的scope属性不必和DOM元素属性一样。别名语法和我们使用的属性绑定所做的操作类似：
```js
it('allows aliasing expression attribute on isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '<theAttr'
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
数据绑定中使用的表达式当然不限于常量字符像`42`。当表达式引用父scope的一些属性时这个机制变得真正有用。这就是如何将数据从父scope传递到隔离scope - 直接或者在表达式中得到一个新值， 就像我们下面做的：
```js
it('evaluates isolate scope expression on parent scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '<'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    $rootScope.parentAttr = 41;
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myAttr).toBe(42);
  });
});
```
我们看一下如何让这些测试通过。在其他事情之前，我们需要教我们的隔离绑定解析一些新技巧：它需要能够解析属性绑定（`@`）或者单向数据绑定（`<`）。下面的正则表达式将完成这项任务：
```
/\s*([@<])\s*(\w*)\s*/
```
这扩展了我们以前的正则表达式可以通过接受`@`或者`<`作为第一个字符，并且捕获到一组便于我们抓住它。

如果我们在`parseIsolateBindings`应用表达式，我们可以设置每个绑定到这个字符的`mode`属性便于以后参考：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<])\s*(\w*)\s*/);
    bindings[scopeName] = {
    mode: match[1],
    attrName: match[2] || scopeName
    }; 
  });
  return bindings;
}
```
注意到属性名称组的索引在我们添加一个新组之前发生了变化。

现在我们需要处理新`<`模式绑定在我们link节点并且创建隔离scope的时候。我们需要做：
1. 获取在DOM中应用此绑定的表达式字符串
2. 将字符串作为Anuglar表达式解析
3. 计算在父scope上下文解析的表达式
4. 在隔离scope上设置计算结果作为属性

下面是代码中的4个步骤：
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
    case '<':
      var parentGet = $parse(attrs[attrName]);
      isolateScope[scopeName] = parentGet(scope);
      break;
    } 
  });
```
我们使用早期实现的`$parse`服务去解析表达式，但是为了使用它我们需要把它注入到`CompileProvider`的`$get`函数。我们这么做：
```js
this.$get = ['$injector', '$parse', '$rootScope',
  function($injector, $parse, $rootScope) {
  // ...
};
```
随着我们第一个单向数据绑定的测试用例现在通过，让我们开始扩展它来覆盖更多的地方。数据绑定的一个重要方面是，它不仅像我们当前实现的那样数据绑定一次，并且
观察表达式将隔离scope属性更新到每个新值上在每次digest的时候。

```js
it('watches isolated scope expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '<'
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
我们设置父scope的属性，并且触发一个digest，我们期望绑定的表达式被计算并且更新隔离scope的结果。这正是观察器做的，所以让我们为已经解析的表达式添加一个：
```js
case '<':
  var parentGet = $parse(attrs[attrName]);
  isolateScope[scopeName] = parentGet(scope);
  scope.$watch(parentGet, function(newValue) {
    isolateScope[scopeName] = newValue;
  });
  break;
```
你可以将数据绑定设置为可选，这意味着如果通过绑定的属性引用不存在于DOM元素上，则不会创建观察器。这通过使用绑定父`<?`而不是`<`:
```js
it('does not watch optional missing isolate scope expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '<?'
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
这里我们测试`$rootScope`没有设置watchers在指令link后。我们现在的实现当表达式为`undefined`的时候创建了一个watcher，这当然不是一个突变，但还添加了一些不必要的开销。

扩展一个绑定符的正则表达式。它需要支持在绑定符的后面有一个问号。
```
/\s*([@<])(\??)\s*(\w*)\s*/
```
应用这个正则，我们可以设置一个`optional`标识在绑定对象。注意到现在属性名称现在切到索引`3`去匹配结果：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<])(\??)\s*(\w*)\s*/);
    bindings[scopeName] = {
      mode: match[1],
      optional: match[2],
      attrName: match[3] || scopeName
      }; 
  });
  return bindings;
}
```
现在，如果属性是`undefined`在linking和绑定的中是可选的，我们将跳过watcher创建：
```js
case '<':
    if (definition.optional && !attrs[attrName]) {
      break; 
    }
    // ...
```
单向数据绑定的最后一方面是清理自己本身。由于我们已经设置了一个watcher,我们需要确保当隔离scope被销毁的时候我们需要注销watcher。否则我们将导致内存泄漏，
因为watcher在父Scope,但是在隔离scope上没有销毁。
```js
case '<':
  if (definition.optional && !attrs[attrName]) {
    break; 
  }
  var parentGet = $parse(attrs[attrName]);
  isolateScope[scopeName] = parentGet(scope);
  var unwatch = scope.$watch(parentGet, function(newValue) {
    isolateScope[scopeName] = newValue;
  });
  isolateScope.$on('$destroy', unwatch);
  break;
```
这里我们的单向数据绑定就有了。