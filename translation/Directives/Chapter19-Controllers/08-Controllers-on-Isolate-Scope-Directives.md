## Controllers on Isolate Scope Directives

乍一看，使用具有隔离scope的指令controller和使用非隔离scope的上下文中使用不太一样。然而，一些隔离Scope相关的功能缺失存在障碍，需要特别注意。

在进入之前，我们先覆盖一些基本的：当一个指令有一个隔离scope，`$scope`参数注入到controller应该是隔离scope，而不是surrounding scope。
```js
it('gets isolate scope as injected $scope', function() {
  var gotScope;
  function MyController($scope) {
    gotScope = $scope;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {
        scope: {},
        controller: 'MyController'
      };
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(gotScope).not.toBe($rootScope);
  }); 
});
```
为了支持这个行为，我们需要移动节点link函数的代码。任何隔离scope应该在实例化controllers之前创建。在controller实例化之后，我们需要完成剩余的隔离scope设置，原因是显而易见的。

一旦我们有了隔离scope对象，我们传递它到指令controller。我们应该很小心的使用隔离scope仅仅在指令确实需要它的时候。节点上的其他controller仍然接收非隔离scope:
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    var isolateScope;
    if (newIsolateScopeDirective) {
      isolateScope = scope.$new(true);
      $element.addClass('ng-isolate-scope');
      $element.data('$isolateScope', isolateScope);
    }
    if (controllerDirectives) {
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
        $controller(controllerName, locals, directive.controllerAs);
      });
    }
  if (newIsolateScopeDirective) {
    _.forEach(
      newIsolateScopeDirective.$$isolateBindings,
        function(definition, scopeName) {
    // ...
    }}; 
  }
  // ...
}
```
我们已经将隔离scope相关的代码全部移到controller实例化的上面，并且我们的测试用例依然是通过的。那我们为什么将它分成这样呢？

原因是接下来我们实现的功能是关联到隔离Scope的，叫做`bindToController`。这是在指令定义对象中设置的标识，它将控制所有的隔离scope绑定被添加。在上一章节，我们看到所有的
绑定使用`@`，`<`，`=`，或者`&`添加到隔离scope。然而，当`bindToController`标识在指令上被设置，这些绑定应该在controller对象上存在代替隔离scope。这对于可选项`controllerAs`
连接是非常有用的，从而控制所有的隔离绑定对子元素有效。

当我们设置东西的时候，我将遇到一个鸡和蛋的问题：
1. 隔离scope绑定应该在controller构造函数调用前存在，因为构造函数希望它运行的时候这些绑定已经存在。
2. 如果`bindToController`被使用，隔离scope绑定必须添加到controller对象，这意味着在设置隔离绑定之前我们必须要有controller对象。

这意味着在实际调用controller构造函数之前我们需要有controller对象。考虑到JavaScript语言的灵活性，我们确实可能做到这一点，但是我们需要花费很多功夫才能做到。

我们添加几个单元测试来说明我们要做的事情。当一个controller构造函数被调用，所有的隔离scope绑定在scope必须存在：
```js
it('has isolate scope bindings available during construction', function() {
  var gotMyAttr;
  function MyController($scope) {
    gotMyAttr = $scope.myAttr;
  }
  var injector = createInjector(['ng',
      function($controllerProvider, $compileProvider) {
    $controllerProvider.register('MyController', MyController);
    $compileProvider.directive('myDirective', function() {
      return {
        scope: {
          myAttr: '@myDirective'
        },
        controller: 'MyController'
      };
    }); 
  }]);
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive="abc"></div>');
    $compile(el)($rootScope);
    expect(gotMyAttr).toEqual('abc');
  }); 
});	
```
另一方面，如果`bindToController`是有效的，隔离scope绑定将在controller实例上，而不是`$scope`。当controller构造函数被调用，在`this`上已经存在这个属性：
```js
it('can bind isolate scope bindings directly to self', function () {
    var gotMyAttr;
    function MyController() {
        gotMyAttr = this.myAttr;
    }
    var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
            return {
                scope: {
                    myAttr: '@myDirective'
                },
                controller: 'MyController',
                bindToController: true
            };
        });
    }]);
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="abc"></div>');
        $compile(el)($rootScope);
        expect(gotMyAttr).toEqual('abc');
    });
});
```
这些测试用例开始都是失败的，我们继续深入直到他们完成。因此让我们继续，并且深入到细节。

`$controller`函数需要一个可选的第3个参数，叫作`later`，这导致函数返回一个"半结构化"的controller而不是全结构的。

"半结构化"意味着controller对象已经存在，但是controller的构造函数还没有被调用。具体而言，在这种情况下`$controller`的返回值具有以下特点：
* 它是一个函数，当被调用，将会调用controller的构造函数
* 它有一个属性叫做`instance`，指向controller的对象。

这种延迟调用构造函数给`$controller`的调用者一个机会在创建controller对象和调用构造函数之间工作 - 这正是我们设置隔离scope绑定需要的。
```js
it('can return a semi-constructed controller', function() {
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');
    
    function MyController() {
        this.constructed = true;
        this.myAttrWhenConstructed = this.myAttr;
    }
    
    var controller = $controller(MyController, null, true);
    
    expect(controller.constructed).toBeUndefined();
    expect(controller.instance).toBeDefined();
    
    controller.instance.myAttr = 42;
    var actualController = controller();
    
    expect(actualController.constructed).toBeDefined();
    expect(actualController.myAttrWhenConstructed).toBe(42);
});
```
就像我们引入`later`参数到`$controller`，我们早点引入的`identifier`参数作为第4个参数放进去：
```js
this.$get = ['$injector', function($injector) {
    return function(ctrl, locals, later, identifier) {
    // ...
    };
}];    
```
我们希望我们已经存在的测试是通过的，因此我们临时在`compile.js`中设置`later`的值为`false`。我们稍后回来修改这个：
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
  $controller(controllerName, locals, false, directive.controllerAs);
});
```
在`$$controller`我们现在根据这个标识来决定我们应该正常初始化还是其他：
```js
return function(ctrl, locals, later, identifier) {
  if (_.isString(ctrl)) {
    if (controllers.hasOwnProperty(ctrl)) {
      ctrl = controllers[ctrl];
    } else if (globals) {
      ctrl = window[ctrl];
    }
  }
  var instance;
  if (later) {
  	
  } else {
      instance = $injector.instantiate(ctrl, locals);
      if (identifier) {
        addToScope(locals, identifier, instance);
      }
      return instance;
  }
};
```
我们做这个需要两步：
1. 创建一个新对象，它的prototype依赖于构造函数。`Object.create`在这里很方便。
2. 返回"半结构化"controller: 一个函数可用于以后实际调用的构造函数，而且在`instance`属性中有实例化的对象可用。

当我们最后调用构造函数，我们不能使用`$injector.instantiate`，因为在这个点上，还没有实例化任何东西。我们可以使用普通的`$injector.invoke`依赖注入函数调用它。我们只需要传递构造函数对象作为`self`参数，因此`this`被正确绑定。
```js
return function(ctrl, locals, later, identifier) {
  if (_.isString(ctrl)) {
    if (controllers.hasOwnProperty(ctrl)) {
      ctrl = controllers[ctrl];
    } else if (globals) {
      ctrl = window[ctrl];
    }
  }
  var instance;
  if (later) {
  	instance = Object.create(ctrl);
    return _.extend(function() {
      $injector.invoke(ctrl, instance, locals);
      return instance;
    }, {
      instance: instance
    });
  } else {
      instance = $injector.instantiate(ctrl, locals);
      if (identifier) {
        addToScope(locals, identifier, instance);
      }
      return instance;
  }
};
```
由于`$controller`支持依赖注入，给到它的第一个参数应该是数组风格的依赖注入包裹而不是普通的函数。它仍然支持`later`标识：
```js
it('can return a semi-constructed ctrl when using array injection', function() {
    var injector = createInjector(['ng', function($provide) {
        $provide.constant('aDep', 42);
    }]);
    
    var $controller = injector.get('$controller');
    function MyController(aDep) {
        this.aDep = aDep;
        this.constructed = true;
    }
    
    var controller = $controller(['aDep', MyController], null, true);
    expect(controller.constructed).toBeUndefined();
    var actualController = controller();
    expect(actualController.constructed).toBeDefined();
    expect(actualController.aDep).toBe(42);
});
```
当我们在prototype传递到` Object.create`，如果已经有了依赖注入wrapper我们需要去掉：
```js
var ctrlConstructor = _.isArray(ctrl) ? _.last(ctrl) : ctrl;
instance = Object.create(ctrlConstructor.prototype);
return _.extend(function() {
  $injector.invoke(ctrl, instance, locals);
  return instance;
}, {
  instance: instance
});
```
现在，结合第三个`later`和第四个`identifier`参数，我们期望`$controller`在scope上绑定半结构化controller如果我们访问的时候：
```js
it('can bind semi-constructed controller to scope', function() {
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');
    function MyController() {
    }
    var scope = {};
    var controller = $controller(MyController, {$scope: scope}, true, 'myCtrl');
    expect(scope.myCtrl).toBe(controller.instance);
});
```
这里通过在这个分支调用相同的`addToScope`帮助函数去完成，我们在"eager construction"分支已经调用：
```js
if (later) {
    instance = Object.create(ctrl);
    if (identifier) {
      addToScope(locals, identifier, instance);
    }
    return _.extend(function() {
      $injector.invoke(ctrl, instance, locals);
      return instance;
    }, {
      instance: instance
    });
} else {
  instance = $injector.instantiate(ctrl, locals);
  if (identifier) {
    addToScope(locals, identifier, instance);
  }
  return instance;
}
```
现在我们已经有了在`$controller`中需要的基础设施，我们通过在`$compile`中做一些改变来将他们连接起来。

首先，
