## Compiling The DOM with Element Directives
现在我们已经有能力注册一些指令了，我们可以进入对它们的应用了。这个程序叫作*DOM compilation*，它是`$compile`的主要职责。

我们看一下已经有的一个指令`myDirective`。我们可以实现这个指令作为一个函数返回一个对象：
```js
myModule.directive('myDirective', function() {
  return {
  };
});
```
这个对象是*directive definition object*。它的key和value将配置指令的行为。有一个key是`compile`。有了它，我们可以定义指令的*compilation function*。这个函数
`compile`将在traversing DOM的时候调用。它将接收一个参数，是指令将要用于的元素：
```js
myModule.directive('myDirective', function() {
  return {
    compile: function(element) {
      
    } 
  };
});
```
当我们有一个像这样的指令，我们通过添加一个元素匹配指令的名字把它用于DOM：
```angular2html
<my-directive></my-directive>
```
我们把这些作为一个单元测试。在测试里面我们需要创建一个injector，在它里面应用指令。在本书的这部分我们要做很多，因此我们继续，添加一个帮助函数让它变得简单：
```js
function makeInjectorWithDirectives() {
  var args = arguments;
  return createInjector(['ng', function($compileProvider) {
    $compileProvider.directive.apply($compileProvider, args);
  }]);
}
```
这个函数使用两个module创建一个injector:`ng`模块和一个在指令里面使用`$compileProvider`注册的函数模块。

我们可以在我们的新单元测试里面立即使用这个函数：
```js
it('compiles element directives from a single element', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
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
为了使这些工作，我们需要引入引入一些新的方法到代码。我们一个个去看，并且最后我们看一下更新`CompileProvider`全部的源码。

为了开始这个，`CompileProvider`的`$get`方法需要返回一些东西。这个东西就是在我们的测试用例中调用的`$compile`函数：
```js
this.$get = function() {
    function compile($compileNodes) {
    }
    return compile;
};
```
像我们在测试用例中看到的，这个函数需要接收DOM节点作为参数去编译。

我们在`compile`里面做的是调用另一个叫做`compileNodes`的本地函数。现在，这似乎是一个不惜要的间接点，但是我们很快会看到，我们需要坐出区别。
```js
this.$get = function() {
  function compile($compileNodes) {
    return compileNodes($compileNodes);
  }
  function compileNodes($compileNodes) {
  }
  return compile;
};
```
在`compileNodes`，我们将会遍历给定的jQuery对象，去单独处理每一个节点。对于每一个节点，我们将使用一个新函数`collectDirectives`来查找和应用于该节点的所有指令：
```js
function compileNodes($compileNodes) {
_.forEach($compileNodes, function(node) {
  var directives = collectDirectives(node);
});
}
function collectDirectives(node) {
}
```
`collectDirectives`的作用是，给定一个DOM节点，计算哪个指令用于它们并且返回。现在，我们只使用一个策略去做，就是找到适用于元素名字的指令：
```js
function collectDirectives(node) {
    var directives = [];
    var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
    addDirective(directives, normalizedNodeName);
    return directives;
}
```
这些代码使用了两个不存在的帮助函数：`nodeName`和`addDirective`，因此我们现在引入他们。

`nodeName`是定义在`compile.js`最顶层的函数，它返回给定的DOM节点名字，它可能是一个原始的DOM节点或者一个jQuery包裹的节点：
```js
function nodeName(element) {
  return element.nodeName ? element.nodeName : element[0].nodeName;
}
```
`addDirective`函数在`compile.js`实现，在`$get`方法形成的闭包内。它需要一个指令数组，和指令的名字。它检查本地的`hasDirectives`是否已经有了这个名字的指令。
如果有，响应的指令函数将从ibjector获取，并且添加到数组中。
```js
function addDirective(directives, name) {
  if (hasDirectives.hasOwnProperty(name)) {
    directives.push.apply(directives, $injector.get(name + 'Directive'));
  }
}
```
注意到这里使用`push.apply`。我们期望`$injector`给我们指令数组，因为我们之前设置好了。使用`apply`我们基本上将数组和`directives`连接起来。

我们在`addDirective`里面使用`$injector`，但是目前还没有把它注入到我们的代码中。我们需要将它注入到包裹的`$get`方法：
```js
this.$get = ['$injector', function($injector) {
  // ...
}];
```
在`compileNodes`后面，一旦我们为节点收集了指令，我们将应用到它，我们将使用另一个新的函数：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var directives = collectDirectives(node);
    applyDirectivesToNode(directives, node);
  }); 
}
function applyDirectivesToNode(directives, compileNode) {
}
```
这个函数迭代指令，并且在每个调用`compile`函数，给它一个jQuery包裹的元素作为参数。这就是我们在测试用例里面设置的只看定义对象调用`compile`函数：
```js
function applyDirectivesToNode(directives, compileNode) {
    var $compileNode = $(compileNode);
    _.forEach(directives, function(directive) {
      if (directive.compile) {
        directive.compile($compileNode);
      }
    });
}
```
在这点上`compile.js`需要引用jQuery:
```js
'use strict';
var _ = require('lodash');
var $ = require('jquery');
```
现在我们成功的应用了指令给DOM！过程主要是遍历每个给定的节点，并且重复两步：
1. 找到应用到节点的所有指令
2. 通过调用他们的`compile`函数应用这些指令给节点。

这里是`compile.js`的完整代码。
```js
  // 略
```