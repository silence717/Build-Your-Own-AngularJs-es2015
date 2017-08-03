## Controller Instantiation
在AngularJS中通过使用构造函数创建controller。那就是，各种函数都是典型的使用大写函数名字，并且使用`new`操作符实例化：
```js
function MyController() {
  this.someField = 42;
}
```
分工是这样的：应用程序的开发者提供的构造函数和框架的`$controller`服务，当需要的时候去实例化。做到这一点最简单的方法就是仅仅给`$controller`
一个构造函数作为参数，并且期望构造函数的实力作为返回值。这构成了我们为`$controller`的第一个测试用例，让我们为它添加一个新的测试文件：
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('$controller', function() {
  beforeEach(function() {
    delete window.angular;
    publishExternalAPI();
  });
  it('instantiates controller functions', function() {
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');
    function MyController() {
      this.invoked = true;
    }
    var controller = $controller(MyController);
    expect(controller).toBeDe ned();
    expect(controller instanceof MyController).toBe(true);
    expect(controller.invoked).toBe(true);
  }); 
});
```
我们的测试用例检测，给定的构造函数返回的对象确实是一个原型实例化的对象，并且对象调用了构造函数。

在这一点上，通过直接使用`new`操作符创建controller上构造函数，我们没有轻易做的东西。当我们考虑有依赖关系的controller，`$controller`的工作变得有趣。
实际上，构造函数是依赖注入调用的：
```js
it('injects dependencies to controller functions', function() {
  var injector = createInjector(['ng', function($provide) {
    $provide.constant('aDep', 42);
  }]);
  var $controller = injector.get('$controller');
  function MyController(aDep) {
    this.theDep = aDep;
  }
  var controller = $controller(MyController);
  expect(controller.theDep).toBe(42);
});
```
根据这些测试，我们看到`$controller`就是一个函数，因为我们直接调用了它。因此`$get`方法的返回值应该是一个函数：
```js
function $ControllerProvider() {
  this.$get = function() {
    return function() {
  
    };
  }; 
}
```
这函数可以有一个构造函数作为参数，并且返回一个构造函数的实例化，包括注入依赖。在我们的`$injector`服务我们有有一些实际的东西 - `instantiate`。我们可以使用它：
```js
this.$get = ['$injector', function($injector) {
    return function(ctrl) {
      return $injector.instantiate(ctrl);
    };
}];
```
不是所有的controller构造函数参数需要在injector之前注册。我们讨论可以通过提供 locals 对象到`$controller`作为第二个参数。这个事情是我们在应用程序单元测试经常做的提供一个Scope。
```js
it('allows injecting locals to controller functions', function() {
  var injector = createInjector(['ng']);
  var $controller = injector.get('$controller');
  function MyController(aDep) {
    this.theDep = aDep;
  }
  var controller = $controller(MyController, {aDep: 42});
  expect(controller.theDep).toBe(42);
});
```
当它发生的时候，`$injector.instantiate`有对它的内置支持：
```js
this.$get = ['$injector', function($injector) {
    return function(ctrl, locals) {
      return $injector.instantiate(ctrl, locals);
    }; 
}];
```