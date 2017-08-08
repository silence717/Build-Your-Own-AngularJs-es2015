## Controller Registration

虽然这是一个良好的开始，我们刚开始的`$controller`provider还没有太多进展。它实际上仅仅是`$injector.instantiate`的一个包装。当我们考虑provider的典型用例时，
改变将会开始。你可以在配置使其注册controller，然后在运行时查找他们。

这里我们使用一个叫做`register`的新方法在provider注册一个controller构造函数在配置块里。然后我们通过名称访问Controller的实例。就像以前一样，我们期望得到controller构造函数的实例：
```js
it('allows registering controllers at config time', function() {
  function MyController() {
  }
  var injector = createInjector(['ng', function($controllerProvider) {
    $controllerProvider.register('MyController', MyController);
  }]);
  var $controller = injector.get('$controller');
  var controller = $controller('MyController');
  expect(controller).toBeDefined();
  expect(controller instanceof MyController).toBe(true);
});
```
`$controller`provider在一个内部对象记住这些注册的构造函数，他们的key值是controller名称，values是构造函数。你可以使用provider的`register`方法去添加：
```js
function $ControllerProvider() {
    var controllers = {};
    this.register = function(name, controller) {
      controllers[name] = controller;
    };
    this.$get = ['$injector', function($injector) {
        return function(ctrl, locals) {
          return $injector.instantiate(ctrl, locals);
      }; 
    }];
}
```
实际上`$controller`函数现在可以检查它是否直接实例化构造函数，或者通过检查第一个参数的类型查找之前注册过的构造函数：
```js
this.$get = ['$injector', function($injector) {
  return function(ctrl, locals) {
    if (_.isString(ctrl)) {
      ctrl = controllers[ctrl];
    }
    return $injector.instantiate(ctrl, locals);
  };
}];
```
在这个点我们需要在`controller.js`中引入LoDash:
```js
'use strict';
var _ = require('lodash');
```
就像你可以使用指令，你也可以调用`$controllerProvider.register`注册多个controller,如果你给一个对象key值是controller名称，并且values是他们的构造函数：
```js
it('allows registering several controllers in an object', function() {
  function MyController() { }
  function MyOtherController() { }
  var injector = createInjector(['ng', function($controllerProvider) {
    $controllerProvider.register({
      MyController: MyController,
      MyOtherController: MyOtherController
    }); 
  }]);
  var $controller = injector.get('$controller');
  var controller = $controller('MyController');
  var otherController = $controller('MyOtherController');
  
  expect(controller instanceof MyController).toBe(true);
  expect(otherController instanceof MyOtherController).toBe(true);
});
```
如果`register`给定的是一个对象，它可以很简单的扩展内部`controllers`对象，因为两个对象具有相同的结构：
```js
this.register = function(name, controller) {
    if (_.isObject(name)) {
      _.extend(controllers, name);
    } else {
      controllers[name] = controller;
    }
};
```
作为Angular应用的开发者，`$controllerProvider`的`register`方法也许你并不熟悉。这是因为比较常用的注册controller构造函数是在模块上进行。Modules都有
`controller`方法，使用它可以在模块上注册一个controller:
```js
it('allows registering controllers through modules', function() {
  var module = window.angular.module('myModule', []);
  module.controller('MyController', function MyController() { });
  var injector = createInjector(['ng', 'myModule']);
  var $controller = injector.get('$controller');
  var controller = $controller('MyController');
  expect(controller).toBeDefined();
});
```
我们在模块对象是只是排队调用我们刚刚创建的`$controllerProvider.register`方法。当我们调用 module.controller`,`$controllerProvider.register`在模块加载的时候会被调用：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  factory: invokeLater('$provide', 'factory'),
  value: invokeLater('$provide', 'value'),
  service: invokeLater('$provide', 'service'),
  decorator: invokeLater('$provide', 'decorator'),
  filter: invokeLater('$filterProvider', 'register'),
  directive: invokeLater('$compileProvider', 'directive'),
  controller: invokeLater('$controllerProvider', 'register'),
  config: invokeLater('$injector', 'invoke', 'push', configBlocks),
  run: function(fn) {
      moduleInstance._runBlocks.push(fn);
      return moduleInstance;
  },
  _invokeQueue: invokeQueue,
  _configBlocks: configBlocks,
  _runBlocks: []
};
```