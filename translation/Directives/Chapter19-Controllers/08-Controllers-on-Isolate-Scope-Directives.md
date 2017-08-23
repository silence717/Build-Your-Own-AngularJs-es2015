## Controllers on Isolate Scope Directives

乍一看，使用具有隔离scope的指令controller和使用非隔离scope的上下文中使用不太一样。然而，一些隔离Scope相关的功能缺失存在障碍，需要特别注意。

在进入之前，我们先覆盖一些基本的：当一个指令有一个隔离scope，`$scope`参数注入到controller应该是隔离scope，而不是surrounding scope。
```js
it('gets isolate scope as injected $scope', function() {
  var gotScope;
  function MyController($scope) {
    gotScope = $scope;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {
        scope: {},
        controller: 'MyController'
      };
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(gotScope).not.toBe($rootScope);
  }); 
});
```
为了支持这个行为，我们需要移动节点link函数的代码。任何隔离scope应该在实例化controllers之前创建。在controller实例化之后，我们需要完成剩余的隔离scope设置，原因是显而易见的。

一旦我们有了隔离scope对象，我们传递它到指令controller。我们应该很小心的使用隔离scope仅仅在指令确实需要它的时候。节点上的其他controller仍然接收非隔离scope:
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    var isolateScope;
    if (newIsolateScopeDirective) {
      isolateScope = scope.$new(true);
      $element.addClass('ng-isolate-scope');
      $element.data('$isolateScope', isolateScope);
    }
    if (controllerDirectives) {
      _.forEach(controllerDirectives, function(directive) {
        var locals = {
          $scope: directive === newIsolateScopeDirective ? isolateScope : scope,
          $element: $element,
          $attrs: attrs
        };
        var controllerName = directive.controller;
        if (controllerName === '@') {
             controllerName = attrs[directive.name];
        }
        $controller(controllerName, locals, directive.controllerAs);
      });
    }
  if (newIsolateScopeDirective) {
    _.forEach(
      newIsolateScopeDirective.$$isolateBindings,
        function(definition, scopeName) {
    // ...
    }}; 
  }
  // ...
}
```
我们已经将隔离scope相关的代码全部移到controller实例化的上面，并且我们的测试用例依然是通过的。那我们为什么将它分成这样呢？

原因是接下来我们实现的功能是关联到隔离Scope的，叫做`bindToController`。这是在指令定义对象中设置的标识，它将控制所有的隔离scope绑定被添加。在上一章节，我们看到所有的
绑定使用`@`，`<`，`=`，或者`&`添加到隔离scope。然而，当`bindToController`标识在指令上被设置，这些绑定应该在controller对象上存在代替隔离scope。这对于可选项`controllerAs`
连接是非常有用的，从而控制所有的隔离绑定对子元素有效。

当我们设置东西的时候，我将遇到一个鸡和蛋的问题：
1. 隔离scope绑定应该在controller构造函数调用前存在，因为构造函数希望它运行的时候这些绑定已经存在。
2. 如果`bindToController`被使用，隔离scope绑定必须添加到controller对象，这意味着在设置隔离绑定之前我们必须要有controller对象。

这意味着在实际调用controller构造函数之前我们需要有controller对象。考虑到JavaScript语言的灵活性，我们确实可能做到这一点，但是我们需要花费很多功夫才能做到。

我们添加几个单元测试来说明我们要做的事情。当一个controller构造函数被调用，所有的隔离scope绑定在scope必须存在：
```js
it('has isolate scope bindings available during construction', function() {
  var gotMyAttr;
  function MyController($scope) {
    gotMyAttr = $scope.myAttr;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {
        scope: {
          myAttr: '@myDirective'
        },
        controller: 'MyController'
      };
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive="abc"></div>');
    $compile(el)($rootScope);
    expect(gotMyAttr).toEqual('abc');
  }); 
});	
```