## Locals in Directive Controllers
虽然我们现在知道如何实例化一个指令的controller，指令和controller之间的连接不存在：controller恰好随着指令的实例化发生，但是它没有获取到指令的任何其他信息，这降低了它的价值。

我们可以通过让一些东西有效来加强这种controller之间的连接：
* `$scope` - 指令的scope对象
* `$element` - 要应用指令的元素
* `$attrs` - 元素将要应用的属性对象

这些都是可用的指令构造函数：
```js
it('gets scope, element, and attrs through DI', function() {
  var gotScope, gotElement, gotAttrs;
  function MyController($element, $scope, $attrs) {
    gotElement = $element;
    gotScope = $scope;
    gotAttrs = $attrs;
  }
  var injector = createInjector(['ng', function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {controller: 'MyController'};
    });
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive an-attr="abc"></div>');
    $compile(el)($rootScope);
    expect(gotElement[0]).toBe(el[0]);
    expect(gotScope).toBe($rootScope);
        expect(gotAttrs).toBeDefined();
        expect(gotAttrs.anAttr).toEqual('abc');
    }); 
});
```
我们可以使用`locals`支持早些时候添加到`$controller`将这些对象传递到controller构造函数。我们只需要在controller循环里面创建一个合适的locals对象，并且将其传递到`$controller`。
这使得`$scope`,`$element`和`$attrs`对于注入有效：
```js
_.forEach(controllerDirectives, function(directive) {
    var locals = {
      $scope: scope,
      $element: $element,
      $attrs: attrs
    };
    var controllerName = directive.controller;
    if (controllerName === '@') {
      controllerName = attrs[directive.name];
    }
    $controller(controllerName, locals);
});
```
现在controller和指令连接多起来了。事实上，给定的这三个对象，你可以在指令controller里面做在指令link函数中的任何事情。许多人实际上选择组织指令的代码，link函数不多，一切都在controller中代替。
这样做的好处是controller是一个独立的组件，可以在不必实例化指令的情况下进行单元测试 - 这是您不能用link函数做的。