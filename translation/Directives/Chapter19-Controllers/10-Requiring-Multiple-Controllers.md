## Requiring Multiple Controllers
实际上你需要的不止是一个，而是多个其他指令的controller到你的指令。如果你定义了一个字符串数组作为`require`的值，link函数的第四个参数将有
相应的controller对象数组：
```js
it('can be required from multiple sibling directives', function() {
    function MyController() { }
    function MyOtherController() { }
    var gotControllers;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                scope: true,
                controller: MyController
            };
        });
        $compileProvider.directive('myOtherDirective', function() {
            return {
                scope: true,
                controller: MyOtherController
            };
        });
        $compileProvider.directive('myThirdDirective', function() {
            return {
                require: ['myDirective', 'myOtherDirective'],
                link: function(scope, element, attrs, controllers) {
                    gotControllers = controllers;
                }
            }; 
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive my-third-directive></div>');
        $compile(el)($rootScope);
        expect(gotControllers).toBeDefined();
        expect(gotControllers.length).toBe(2);
        expect(gotControllers[0] instanceof MyController).toBe(true);
        expect(gotControllers[1] instanceof MyOtherController).toBe(true);
    });
});
```
在这个用例中在同一个元素上有三个指令。前两个都定义了controllers。第三个require前两个。然后我们检查第三个指令link函数是否接受前两个的controller。

使这个工作真的非常简单。如果给`getControllers`是一个数组，我们将返回递归调用`getControllers`的值对应数组 - 一个controller数组：
```js
function getControllers(require) {
    if (_.isArray(require)) {
        return _.map(require, getControllers());
    } else {
        let value;
        if (controllers[require]) {
            value = controllers[require].instance;
        }
        if (!value) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value;
    }
}
```