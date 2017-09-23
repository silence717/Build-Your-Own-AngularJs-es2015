## Requiring Controllers
Controllers 是用于传递指令逻辑的link函数的替代品，但这并不代表所有的controllers是有用的。Controllers 还可以用来为不同指令之间的通信提供另外一种通道。
这也许是Angular最强大的"跨指令通信"能力：从其他指令引入controllers。

一个指令可以通过名字"require"其他一些指令在指令定义对象中使用特定的`require`可以。完成这个，被引入的指令需要在相同的元素上呈现，被引入的指令controller
作为第4个参数给到指令link函数。

事实上，一个指令可以访问另一个指令的controller，包括它所有的数据和函数。即使指令使用隔离scope也是一样的：
```js
it('can be required from a sibling directive', function() {
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
                require: 'myDirective',
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
                }
            }; 
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDe ned();
        expect(gotMyController instanceof MyController).toBe(true);
    }); 
});
```
这里有两个指令，`myDirective`和`myOtherDirective`，在同一元素上使用。`myDirective`定义了一个controller和隔离scope。`myOtherDirective`
什么也没定义，但是它引入`myDirective`。我们检测`myDirective`的controller传递到`myOtherDirective`link函数。

首先我们添加一些信息到指令的`require`标识给它的link函数。一旦我们在指令的`applyDirectivesToNode`调用`addLinkFns`，我们传递指令的`require`属性：
```js
if (directive.compile) {
    const linkFn = directive.compile($compileNode, attrs);
    const isolateScope = (directive === newIsolateScopeDirective);
    const attrStart = directive.$$start;
    const attrEnd = directive.$$end;
    const require = directive.require;
    
    // 如果linkFn是一个函数
    if (_.isFunction(linkFn)) {
        addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope, require);
        postLinkFns.push(linkFn);
    } else if (linkFn) {
        addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd, isolateScope, require);
    }
}
```
在`addLinkFns`，我们使用这个参数更新`require`属性在pre和postlink函数：
```js
function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope, require) {
    if (preLinkFn) {
        if (attrStart) {
            preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
        }
        preLinkFn.isolateScope = isolateScope;
        preLinkFn.require = require;
        preLinkFns.push(preLinkFn);
    }
    if (postLinkFn) {
        if (attrStart) {
            postLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
        }
        postLinkFn.isolateScope = isolateScope;
        postLinkFn.require = require;
        postLinkFns.push(postLinkFn);
    }
}
```
我们现在从节点link函数调用这些pre和postlink函数，我们可以检查这些是否设置了`require`属性。如果设置了，我们传递第四个参数到link函数。这个参数的值将是
一个叫作`getControllers`的新函数返回值，我们一会将会定义：
```js
// 先循环prelink数组
_.forEach(preLinkFns, linkFn => {
    linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require));
});
// 判断子link是否存在
if (childLinkFn) {
    childLinkFn(scope, linkNode.childNodes);
}
_.forEachRight(postLinkFns, linkFn => {
    linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require));
});
```
`getControllers`函数应该在`applyDirectivesToNode`中被定义，这里它可以访问`cotrollers`变量，它存储当前节点的controllers：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [], controllers = {};
  var newScopeDirective, newIsolateScopeDirective;
  var controllerDirectives;
  function getControllers(require) {
  }
// ...
}
```
这个函数做的是查找required的controller，并且返回它。如果找不到controller，那么抛出一个异常：
```js
function getControllers(require) {
    var value;
    if (controllers[require]) {
      value = controllers[require].instance;
    }
    if (!value) {
      throw 'Controller '+require+' required by directive, cannot be found!';
    }
    return value;
}
```
注意到在`controllers`中存储的是半结构化的controller函数来自于上一部分，因此我们需要访问`instance`属性去获取link函数实际接收的controller对象。
到那时它将完整。