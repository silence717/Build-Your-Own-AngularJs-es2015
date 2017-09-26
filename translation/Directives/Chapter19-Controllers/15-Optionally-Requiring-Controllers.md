## Optionally Requiring Controllers
`require`现在的实现当被required的controller找不到的时候就会抛出异常。其实你可以选择不那么严格的要求前缀必须是带问号的语句。如果你这么做，而不是抛出异常，那么
你可以得到这个controller的值为`null`：
```js
it('does not throw on required missing controller when optional', function() {
    var gotCtrl;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                require: '?noSuchDirective',
                link: function(scope, element, attrs, ctrl) {
                    gotCtrl = ctrl;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(gotCtrl).toBe(null);
    });
});
```
`REQUIRE_PREFIX_REGEXP`表达式可与词问号匹配：
```js
var REQUIRE_PREFIX_REGEXP = /^(\^\^?)?(\?)?/;
```
在`getControllers`中，当没有给问号，缺少controller的时候我们只是仅仅抛出一个异常。我们应该调整`return`语句以便于没找到controller的时候返回实际上的`null`而不是`undedined`：
```js
function getControllers(require, $element) {
    if (_.isArray(require)) {
        return _.map(require, r => {
            return getControllers(r, $element);
        });
    } else if (_.isObject(require)) {
        return _.mapValues(require, r => {
            return getControllers(r, $element);
        });
    } else {
        let value;
        let match = require.match(REQUIRE_PREFIX_REGEXP);
        const optional = match[2];
        require = require.substring(match[0].length);
        if (match[1]) {
            if (match[1] === '^^') {
                $element = $element.parent();
            }
            while ($element.length) {
                value = $element.data('$' + require + 'Controller');
                if (value) {
                    break;
                } else {
                    $element = $element.parent();
                }
            }
        } else {
            if (controllers[require]) {
                value = controllers[require].instance;
            }
        }
        if (!value && !optional) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value || null;
    }
}
```
我们最后要看的`require`标识逻辑是`^`,`^^`和`?`前缀。Angular实际上会让你先指定`?`不论作为后缀或者前缀是`^`或者`^^`。这意味着`?^`或者`^?`同样有效：
```js
it('allows optional marker after parent marker', function() {
    var gotCtrl;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                require: '^?noSuchDirective',
                link: function(scope, element, attrs, ctrl) {
                    gotCtrl = ctrl;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(gotCtrl).toBe(null);
    });
});

it('allows optional marker before parent marker', function() {
    function MyController() { }
    var gotMyController;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                scope: {},
                controller: MyController
            };
        });
        $compileProvider.directive('myOtherDirective', function() {
            return {
                require: '?^myDirective',
                link: function(scope, element, attrs, ctrl) {
                    gotMyController = ctrl;
                }
            }; });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDefined();
        expect(gotMyController instanceof MyController).toBe(true);
    }); 
});
```
我们的正则表达式必须尝试在问号的前后去匹配`^`字符。
```js
var REQUIRE_PREFIX_REGEXP = /^(\^\^?)?(\?)?(\^\^?)?/;
```
我们应该使用一个和另一个互换：
```js
function getControllers(require, $element) {
    if (_.isArray(require)) {
        return _.map(require, r => {
            return getControllers(r, $element);
        });
    } else if (_.isObject(require)) {
        return _.mapValues(require, r => {
            return getControllers(r, $element);
        });
    } else {
        let value;
        let match = require.match(REQUIRE_PREFIX_REGEXP);
        const optional = match[2];
        require = require.substring(match[0].length);
        if (match[1] || match[3]) {
            if (match[3] && !match[1]) {
                match[1] = match[3];
            }
            while ($element.length) {
                value = $element.data('$' + require + 'Controller');
                if (value) {
                    break;
                } else {
                    $element = $element.parent();
                }
            }
        } else {
            if (controllers[require]) {
                value = controllers[require].instance;
            }
        }
        if (!value && !optional) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value || null;
    }
}
```