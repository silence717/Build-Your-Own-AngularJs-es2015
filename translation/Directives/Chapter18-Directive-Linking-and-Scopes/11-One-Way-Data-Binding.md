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