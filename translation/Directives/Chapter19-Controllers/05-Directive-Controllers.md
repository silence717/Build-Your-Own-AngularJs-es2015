## Directive Controllers
现在我们已经有了`$controller`服务制度如何注册，查找，并且实例化controller，我们开始看controlllers实际使用的情况。这就是指令出现的地方。

你可以添加一个controller到指令，在指令定义对象上通过特殊`controller`key，并且提供一个controller构造函数作为值。当指令在link的时候这个controller被实例化。
```js
// compile_spec.js
describe('controllers', function() {
  it('can be attached to directives as functions', function() {
    var controllerInvoked;
    var injector = makeInjectorWithDirectives('myDirective', function() {
      return {
        controller: function MyController() {
          controllerInvoked = true;
        }
      }; 
    });
    injector.invoke(function($compile, $rootScope) {
      var el = $('<div my-directive></div>');
      $compile(el)($rootScope);
        expect(controllerInvoked).toBe(true);
      }); 
  });
});
```
`controller`key可以指向一个字符串，是已经注册过的controller构造函数名称引用：
```js
it('can be attached to directives as string references', function() {
  var controllerInvoked;
  function MyController() {
    controllerInvoked = true;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {controller: 'MyController'};
    });
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(controllerInvoked).toBe(true);
  });
});  
```
controllers为每个指令单独的实例化，并且在同一个元素上有多个指令有不同的controller没有限制。这里我们在一个元素上有两个指令应用，他们都有自己的controller:
```js
it('can be applied in the same element independent of each other', function() {
  var controllerInvoked;
  var otherControllerInvoked;
  function MyController() {
    controllerInvoked = true;
  }
  function MyOtherController() {
    otherControllerInvoked = true;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $controllerProvider.register('MyOtherController', MyOtherController);
    $compileProvider.directive('myDirective', function() {
      return {controller: 'MyController'};
    });
    $compileProvider.directive('myOtherDirective', function() {
      return {controller: 'MyOtherController'};
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-other-directive></div>');
    $compile(el)($rootScope);
    expect(controllerInvoked).toBe(true);
    expect(otherControllerInvoked).toBe(true);
  }); 
});
```
同样相同的controller使用多次也是没有限制的。每个指令应用获取他们自己的controller实例化，即使同一元素使用相同的构造函数：
```js
it('can be applied to different directives, as different instances', function () {
    var invocations = 0;
    
    function MyController() {
        invocations++;
    }
    
    var injector = createInjector(['ng',
        function ($controllerProvider, $compileProvider) {
            $controllerProvider.register('MyController', MyController);
            $compileProvider.directive('myDirective', function () {
                return {controller: 'MyController'};
            });
            $compileProvider.directive('myOtherDirective', function () {
                return {controller: 'MyController'};
            });
        }]);
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        expect(invocations).toBe(2);
    });
});  
```
我们让这系列的测试通过。首先，我们编译期间在`applyDirectivesToNode`迭代所有的指令，我们应该收集所有包含controller的指令：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [];
  var newScopeDirective, newIsolateScopeDirective;
  var controllerDirectives;
  function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope) {
    // ...
  }
  _.forEach(directives, function(directive) {
    // ...
    if (directive.controller) {
      controllerDirectives = controllerDirectives || {};
      controllerDirectives[directive.name] = directive;
    }
  });
  // ...
}
```
这里我们创建了一个`controllerDirectives`对象，它的keys是指令名称，值是相应的指令对象。

It should be able to handle any value given for a directive controller, whether it’s a constructor function or the name of one:

有了这个对象的帮助，在link阶段我们现在了解到当节点被link的时候所有的controllers应该实例化。我们可以使用我们的新`$controller`服务来完成它。他可以处理给定指令controller的任何值。
无论是构造函数还是函数的名称：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    if (controllerDirectives) {
      _.forEach(controllerDirectives, function(directive) {
        $controller(directive.controller);
      });
    }
    // ...
}
```
这段代码构造之前我们需要注入`$controller`服务到`$compileProvider.$get`:
```js
this.$get = ['$injector', '$parse', '$controller', '$rootScope',
  function($injector, $parse, $controller, $rootScope) {
```
这将使我们的测试用例全部通过。指令controller使用`$controller`实例化，这一点仅仅是把`$compile`和`$controller`链接在一起。

指令控制器集成的一个有趣的附加功能是，当你有一个属性指令和特定的controller名字是字符串`@`，这个controller使用DOM指令属性的值进行查找。
如果你希望不是在指令注册时指定指令controller，但在使用指令时，这是非常有用的。实际上，这允许为相同的指令插入不同的controller。
```js
it('can be aliased with @ when given in directive attribute', function() {
  var controllerInvoked;
  function MyController() {
    controllerInvoked = true;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {controller: '@'};
    });
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive="MyController"></div>');
    $compile(el)($rootScope);
    expect(controllerInvoked).toBe(true);
  }); 
});
```
这种支持是建立在节点link函数，在这个函数中，controller的名称被替换为DOM属性的值，如果它被定义为`@`：
```js
_.forEach(controllerDirectives, function(directive) {
    var controllerName = directive.controller;
    if (controllerName === '@') {
      controllerName = attrs[directive.name];
    }
    $controller(controllerName);
});
```