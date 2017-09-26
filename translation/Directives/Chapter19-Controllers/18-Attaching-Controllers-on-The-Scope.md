## Attaching Controllers on The Scope
在这章的前面我们看到通过在指令定义对象上定义`controllerAs`属性添加controller到scope上。

其实还有另外一种方法可以完成这个添加，它经常和`ngController`结合使用。也就是在controller构造函数名称的字符串中定义别名：
```angular2html
<div ng-controller="TodoController as todoCtrl">
<!-- ... -->
</div>
```
我们添加一个测试用例到`ngController`测试套件：
```js
it('allows aliasing controller in expression', function() {
    var gotScope;
    function MyController($scope) {
        gotScope = $scope;
    }
    var injector = createInjector(['ng', function($controllerProvider) {
        $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div ng-controller="MyController as myCtrl"></div>');
        $compile(el)($rootScope);
        expect(gotScope.myCtrl).toBeDefined();
        expect(gotScope.myCtrl instanceof MyController).toBe(true);
    });
});
```
现在，即使我们在`ng_controller_spec.js`有了测试，但是这个功能真正的实现并不在ngController。它在`$controller`服务中。当controller被查找时，`$controller`
首先从给定字符串中提取试剂controller的名称和可选别名。
```js
return function(ctrl, locals, later, identifier) {
  if (_.isString(ctrl)) {
    var match = ctrl.match(/^(\S+)(\s+as\s+(\w+))?/);
    ctrl = match[1];
    if (controllers.hasOwnProperty(ctrl)) {
        ctrl = controllers[ctrl];
        } else if (globals) {
        ctrl = window[ctrl];
    }
  }
// ...
}  
```
正则匹配了一组非空的字符作为controller的名称，然后选择`as`周围的空格，后面跟着一组字符串指定的标识符。

如果这里有一个identifier,我们应该把它赋值给`identifier`变量 - 除非调用方已经显式地给出了它的值。这触发在`addToScope`存在的逻辑，并且添加controller到scope，使我们测试通过。
```js
return function(ctrl, locals, later, identi er) {
  if (_.isString(ctrl)) {
    var match = ctrl.match(/^(\S+)(\s+as\s+(\w+))?/);
    ctrl = match[1];
    identifier = identifier || match[3];
    if (controllers.hasOwnProperty(ctrl)) {
      ctrl = controllers[ctrl];
    } else if (globals) {
      ctrl = window[ctrl];
    }
  }
// ...
}
```