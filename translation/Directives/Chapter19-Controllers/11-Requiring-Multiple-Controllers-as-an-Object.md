## Requiring Multiple Controllers as an Object
当你需要引入其他几个controller的时候，使用数组访问他们并不是很方便，因为你需要记住引入他们的索引。由于这个原因，这里有另一种引入多个controllers的
方式，它使用一个对象代替数组。你在link函数中得到的是一个对象。这个对象的key是引入指令的名称，value是他们的controllers。
```js
it('can be required as an object', function() {
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
                require: {
                    myDirective: 'myDirective',
                    myOtherDirective: 'myOtherDirective'
                },
                link: function(scope, element, attrs, controllers) {
                    gotControllers = controllers;
                }
            }; });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive my-third-directive></div>');
        $compile(el)($rootScope);
        expect(gotControllers).toBeDefined();
        expect(gotControllers.myDirective instanceof MyController).toBe(true);
        expect(gotControllers.myOtherDirective instanceof MyOtherController).toBe(true);
    });
});
```
实现这个很简单。就像在上一部分，我们迭代给定的结合。这个时候我们仅仅需要使用LoDash的`_.mapValues`函数使用相同的keys，返回一个新对象，使用这些值代替我们的mapping函数。
```js
function getControllers(require) {
    if (_.isArray(require)) {
        return _.map(require, getControllers());
    }  else if (_.isObject(require)) {
        return _.mapValues(require, getControllers);
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
就像上面看到的测试用例，使用这个语法就会有很多重复的。keys和对象的values都包含引入指令的名称。但是这不是必须的，因为Angular使得我们省略值，并且使用一个空字符串代替。
```js
it('can be required as an object with values omitted', function() {
    function MyController() { }
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
                require: {
                    myDirective: '',
                },
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
        expect(gotControllers.myDirective instanceof MyController).toBe(true);
    }); 
});
```
我们在指令注册期间填充任何值。当我们实例化一个指令，我们需要一个叫做`getDirectiveRequire`的新帮助函数来处理`require`属性：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory, i) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.priority = directive.priority || 0;
    if (directive.link && !directive.compile) {
      directive.compile = _.constant(directive.link);
    }
    directive.$$bindings = parseDirectiveBindings(directive);
    directive.name = directive.name || name;
    directive.require = getDirectiveRequire(directive);
    directive.index = i;
    return directive;
  });
}]);
```
这个函数检查如果`require`的值是一个对象（而不是一个数组），并且遍历它也是，使用相应的keys去填充丢失的值：
```js
function getDirectiveRequire(directive) {
  var require = directive.require;
  if (!_.isArray(require) && _.isObject(require)) {
    _.forEach(require, function(value, key) {
      if (!value.length) {
        require[key] = key;
      }
    }); 
  }
  return require;
}
```
我们将返回这个函数的更多功能，因为我们添加了从祖先元素中要求控制器的支持。