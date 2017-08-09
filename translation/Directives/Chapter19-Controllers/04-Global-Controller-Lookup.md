## Global Controller Lookup

我们刚刚看到的注册controller的方法是在Angular应用程序中的首选方法。但是还有另外一种方法支持，通过`$controller`, 就是从全局`window`对象
查找构造函数。然而，默认情况下这是不启用的，这样的查找通常会引发异常：
```js
it('does not normally look controllers up from window', function() {
  window.MyController = function MyController() { };
  var injector = createInjector(['ng']);
  var $controller = injector.get('$controller');
  expect(function() {
    $controller('MyController');
  }).toThrow();
});
```
如果，另一方面，你在配置时间调用`$controllerProvider`上的特殊函数`allowGlobals`，突然从`window`发现可以找到构造函数`$controller`并且使用它：
```js
it('looks up controllers from window when so con gured', function() {
  window.MyController = function MyController() { };
  var injector = createInjector(['ng', function($controllerProvider) {
    $controllerProvider.allowGlobals();
  }]);
  var $controller = injector.get('$controller');
  var controller = $controller('MyController');
  expect(controller).toBeDefined();
  expect(controller instanceof window.MyController).toBe(true);
});
```
使用这个可选的配置不是最佳实践，因为它依赖于全局状态，这可不是模块化的好兆头。它应该只在简单的示例应用程序中使用，在我看来，即使在那些应用程序中，它也有可疑的价值。
但它是存在的，它的工作原理是：`allowGlobals`函数在provider中设置一个内部`globals`标识为`true`。当查找controllers，如果政策查找失败，我们试图去`window`上查找
- 只有当`globals`被设置的时候：
```js
function $ControllerProvider() {
    var controllers = {};
    var globals = false;
    this.allowGlobals = function() {
      globals = true;
    };
    this.register = function(name, controller) {
      if (_.isObject(name)) {
        _.extend(controllers, name);
      } else {
        controllers[name] = controller;
      }
    };
    this.$get = ['$injector', function($injector) {
      return function(ctrl, locals) {
        if (_.isString(ctrl)) {
          if (controllers.hasOwnProperty(ctrl)) {
            ctrl = controllers[ctrl];
          } else if (globals) {
            ctrl = window[ctrl];
          }
        }
      return $injector.instantiate(ctrl, locals);
    };
  }]; 
}
```