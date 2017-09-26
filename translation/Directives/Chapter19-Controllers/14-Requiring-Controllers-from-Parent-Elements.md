## Requiring Controllers from Parent Elements
引入一个同级指令是也是可以的，但是非常有限：我们目前还没有任何方法来应用于一个元素家族的协作（不在一个scope对象上共享）。

实际上`require`标识比我们之前看到的更加灵活，因为它不仅允许从当前元素引入controller，并且也可以从父级元素引入。如果指令名字前面有`^`前缀这种查找的形式就会生效：
```js
it('can be required from a parent directive', function() {
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
                require: '^myDirective',
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDefined();
        expect(gotMyController instanceof MyController).toBe(true);
    });
});
```
这里的`myOtherDirective`引入`^myDirective`，从它的父级元素查找。

当使用`^`前缀，被引入的指令不仅从父元素查找，并且也从当前元素查找（实际上首先搜索当前元素）。准确地说`^`意思是"当前元素或者它的其中一个父元素"。
```js
it(' nds from sibling directive when requiring with parent pre x', function() {
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
                require: '^myDirective',
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
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
为了获取`require`这种系统工作，我们不能只依赖`applyDirectivesToNode`上的`controllers`对象，因为它只有当前元素的controller。我们的controller查找代码也需要了解DOM元素的结构。
朝着这个方向的第一步是通过对当前元素的`getControllers`函数：
```js
// 先循环prelink数组
_.forEach(preLinkFns, linkFn => {
    linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require, $element));
});
// 判断子link是否存在
if (childLinkFn) {
    childLinkFn(scope, linkNode.childNodes);
}
_.forEachRight(postLinkFns, linkFn => {
    linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require, $element));
});
```
在递归调用`getControllers`中我们也需要一直传递这个参数：
```js
function getControllers(require, $element) {
  if (_.isArray(require)) {
    return _.map(require, function(r) {
      return getControllers(r, $element);
    });
  } else if (_.isObject(require)) {
    return _.mapValues(require, function(r) {
      return getControllers(r, $element);
    });
  } else {
    // ...
  } 
}
```
在`getControllers`自谦我们找到需要什么，一旦我们创建了controllers我们需要添加一些信息到DOM。controller也应该作为JQuery的data添加到相应的DOM节点：
```js
_.forEach(controllerDirectives, function(directive) {
  var locals = {
    $scope: directive === newIsolateScopeDirective ? isolateScope : scope,
    $element: $element,
    $attrs: attrs
  };
  var controllerName = directive.controller;
  if (controllerName === '@') {
    controllerName = attrs[directive.name];
  }
  var controller = $controller(controllerName, locals, true, directive.controllerAs);
  controllers[directive.name] = controller;
  $element.data('$' + directive.name + 'Controller', controller.instance);
});
```
现在，`getControllers`应该尝试去匹配`require`参数到常规的表达式，捕获`^`前面的任意字符。如果没有这样的前缀，我们可以像以前那样进行查找，但如果有的话，我们需要做其他的事情：
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
        let match = require.match(/^(\^)?/);
        require = require.substring(match[0].length);
        if (match[1]) {
        } else {
            if (controllers[require]) {
                value = controllers[require].instance;
            }
        }
        if (!value) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value;
    }
}
```
当有一个`^`前缀的时候，我们要做的是向上查找，直到找到匹配引入指令名称的jQuery data（或者一直到DOM树的根节点）：
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
        let match = require.match(/^(\^)?/);
        require = require.substring(match[0].length);
        if (match[1]) {
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
        if (!value) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value;
    }
}
```
除了`^`,`require`属性还支持`^^`前缀。它和`^`非常相似，从父元素找到一个指令controller:
```js
it('can be required from a parent directive with ^^', function() {
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
                require: '^^myDirective',
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
                }
            }; });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDefined();
        expect(gotMyController instanceof MyController).toBe(true);
    });
});
```
`^^`不同的是不从兄弟指令中查找，直接从父元素查找：
```js
it('does not  nd from sibling directive when requiring with ^^', function() {
    function MyController() { }
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                scope: {},
                controller: MyController
            };
        });
        $compileProvider.directive('myOtherDirective', function() {
            return {
                require: '^^myDirective',
                link: function(scope, element, attrs, myController) {
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        expect(function() {
            $compile(el)($rootScope);
        }).toThrow();
    });
});
```
在测试中我们期望在linking的过程中抛出异常，因为我们require的一个指令存在于兄弟节点，但是由于`^^`前缀永远不会被找到。

`getControllers`中的规则应该是选择匹配前缀中的第二个`^`，如果找到了，从当前元素的父元素开始查找，而不是元素本身：
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
        let match = require.match(/^(\^\^?)?/);
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
        if (!value) {
            throw 'Controller ' + require + ' required by directive, cannot be found!';
        }
        return value;
    }
}
```
当为required的controllers引入对象语法时，我们应该能将前缀定义为对象中的值，从而产生以下方便的形式：
```js
require: {
  myDirective: '^'
}
```
这里有个对应的测试：
```js
it('can be required from parent in object form', function() {
    function MyController() { }
    var gotControllers;
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
                link: function(scope, element, attrs, controllers) {
                    gotControllers = controllers;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        expect(gotControllers.myDirective instanceof MyController).toBe(true);
    });
});
```
在`getDirectiveRequire`函数，指令实例化的过程中，我们可以标准化。我们需要使用和`getControllers`相同的正则表达式,因为我们将它抽取到最上层：
```js
var REQUIRE_PREFIX_REGEXP = /^(\^\^?)?/;
```
我们将使用这个变量，首先是`getControllers`中：
```js
var match = require.match(REQUIRE_PREFIX_REGEXP);
```
在`getDirectiveRequire`中我们使用它在每个对象值中提取前缀。然后我们看一下前缀后面的值。如果没有的话，我们使用空格去填充。因此`myDirective: '^' `会变为`myDirective: '^myDirective'`，等等。
```js
function getDirectiveRequire(directive, name) {
  var require = directive.require || (directive.controller && name);
  if (!_.isArray(require) && _.isObject(require)) {
    _.forEach(require, function(value, key) {
        var prefix = value.match(REQUIRE_PREFIX_REGEXP);
        var name = value.substring(prefix[0].length);
        if (!name) {
          require[key] = prefix[0] + key;
        }
    }); 
  }
  return require;
}
```