## Attaching Directive Controllers on The Scope

我们知道如何传递scope对象到controller。相反，你也可以做，将controller对象添加到scope。这使得发布的应用程序controller数据和函数使用`this`代替`$scope`，同时在DOM的
插值表达式中有效，以及子指令和controllers。

当指令定义对象定义一个`controllerAs`key值，它指定的key值就是controller对象将添加到scope上：
```js
it('can be attached on the scope', function() {
  function MyController() { }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {
        controller: 'MyController',
        controllerAs: 'myCtrl'
      };
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect($rootScope.myCtrl).toBeDe ned();
    expect($rootScope.myCtrl instanceof MyController).toBe(true);
  }); 
});
```
在这个用例中，指令没有请求继承或者隔离scope，因此scope获取的controller是`$rootScope`，使得测试变得简单。

为了支持这个用例，`$controller`函数需要一个附加的，可选的参数，它定义scope上面的controller标识符。在节点link函数中，我们可以使用`controllerAs`的值就像我们调用`$controller`:
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
  $controller(controllerName, locals, directive.controllerAs);
});
```
如果可选参数给到`$controller`，它将调用内置的帮助函数添加controller到scope：
```js
return function(ctrl, locals, identifier) {
    if (_.isString(ctrl)) {
      if (controllers.hasOwnProperty(ctrl)) {
        ctrl = controllers[ctrl];
      } else if (globals) {
        ctrl = window[ctrl];
      }
    }
    var instance = $injector.instantiate(ctrl, locals);
    if (identifier) {
      addToScope(locals, identifier, instance);
    }
    return instance;
};
```
`addToScope`查找scope - 它在给定的`locals`对象 - 并且使用identifier将controller实例放到locals上。如果一个identifier已经给定，但是在locals对象上没有`$scope`，抛出异常。

这个函数可以定义在`controller.js`的一级：
```js
function addToScope(locals, identi er, instance) {
  if (locals && _.isObject(locals.$scope)) {
    locals.$scope[identi er] = instance;
  } else {
    throw 'Cannot export controller as ' + identi er +
      '! No $scope object provided via locals';
} }
```