## Looking Up A Controller Constructor from The Scope
有一个事情,给`$controller`是controller表达式可以做的，它是指一个controller构造函数添加到scope，代替一个controller构造函数注册到`$controllerProvider`。

这里我们有一个测试，一个叫作`MyCtrlOnScope`的controller用在`ngController`。实际上，没有controller使用这个名字注册，但是scope上有一个函数匹配这个key。
这个函数将被找到并且用于构造controller：
```js
it('allows looking up controller from surrounding scope', function() {
    var gotScope;
    function MyController($scope) {
        gotScope = $scope;
    }
    var injector = createInjector(['ng']);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div ng-controller="MyCtrlOnScope as myCtrl"></div>');
        $rootScope.MyCtrlOnScope = MyController;
        $compile(el)($rootScope);
        expect(gotScope.myCtrl).toBeDe ned();
        expect(gotScope.myCtrl instanceof MyController).toBe(true);
    });
});
```
当`$controller`尝试去寻找controller，它现在也需要查看给定的`locals`对象上面的`$scope`属性（如果有），在使用全局查找之前：
```js
return function(ctrl, locals, later, identi er) {
  if (_.isString(ctrl)) {
    var match = ctrl.match(/^(\S+)(\s+as\s+(\w+))?/);
    ctrl = match[1];
    identifier = identifier || match[3];
    if (controllers.hasOwnProperty(ctrl)) {
      ctrl = controllers[ctrl];
    } else {
      ctrl = (locals && locals.$scope && locals.$scope[ctrl]) ||
         (globals && window[ctrl]);
    } 
  }
// ...
};
```