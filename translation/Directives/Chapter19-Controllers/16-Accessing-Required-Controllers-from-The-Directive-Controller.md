## Accessing Required Controllers from The Directive Controller
到目前为止我们看到required controllers如何通过指令的link函数第4个参数访问。在Angular1.5版本之前只是唯一的获取方式。但事实上这并不是我们经常需要他们的地方。
我们在指令的controller中经常需要他们，因为这通常的指令的业务逻辑实现的地方。

从Angular1.5版本开始，required的controllers也可以作为指令controller的书序，从而更加自然地访问他们。
```js
function MyController() {
  this.doSomething() {
    this.someRequiredController.doSomethingElse();
  }
}
```
这只发生在使用对象的形式时。此外，只有当指令有`bindToController`并且为true的时候才会发生。这里有一个测试。
```js
it('attaches required controllers on controller when using object', function() {
    function MyController() { }
    var instantiatedController;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                scope: {},
                controller: MyController
            };
        });
        $compileProvider.directive('myOtherDirective', function() {
            return {
                require: {
                    myDirective: '^'
                },
                bindToController: true,
                controller: function() {
                    instantiatedController = this;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        expect(instantiatedController.myDirective instanceof MyController).toBe(true);
    });
});
```
这一切都发生在初始化节点link函数初始化所有的controllers。
```js
_.forEach(controllers, function(controller) {
  controller();
});
_.forEach(controllerDirectives, function(controllerDirective, name) {
});
```
在循环中我们检查先决条件，`require`是对象，并且`bindToController`在当前指令有效：
```js
_.forEach(controllerDirectives, function(controllerDirective, name) {
    var require = controllerDirective.require;
    if (_.isObject(require) && !_.isArray(require) && controllerDirective.bindToController) {
    }
});
```
如果条件成立，我们获取controller对象，和required controllers的对象，我们可以使用`getControllers`获取。然后我们使用LoDash的`assign`函数将required controllers作为属性添加到我们的controller。
```js
_.forEach(controllerDirectives, function(controllerDirective, name) {
    var require = controllerDirective.require;
    if (_.isObject(require) && !_.isArray(require) && controllerDirective.bindToController) {
    	var controller = controllers[controllerDirective.name].instance;
        var requiredControllers = getControllers(require, $element);
        _.assign(controller, requiredControllers);
    }
});
```
现在我们对Angular指令的`require`机制有了一个完整的实现！