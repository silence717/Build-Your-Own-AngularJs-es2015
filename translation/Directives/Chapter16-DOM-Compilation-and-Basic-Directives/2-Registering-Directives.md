## Registering Directives
`$compile`的主要工作是给DOM应用指令。为此将需要有一些指令要应用。这意味着我们需要注册指令的方法。

指令注册通过模块发生，就像services,factories,和其他组件的注册。一个指令的注册使用一个module对象的`directive`方法。不管指令怎么注册，它会自动的获取`Directive`后缀，
所以当我们注册指令`abc`,injector将会有一个指令叫作`abcDirective`:
```js
'use strict';
var _ = require('lodash');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
  describe('$compile', function() {
    beforeEach(function() {
    delete window.angular;
    publishExternalAPI();
  });
  it('allows creating directives', function() {
    var myModule = window.angular.module('myModule', []);
    myModule.directive('testing', function() { });
    var injector = createInjector(['ng', 'myModule']);
    expect(injector.has('testingDirective')).toBe(true);
  }); 
});
```
module对象的`directive`方法和之前为filters创建的一个方法类似。他们排队调用`$compileProvider`的`directive`方法：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  factory: invokeLater('$provide', 'factory'),
  value: invokeLater('$provide', 'value'),
  service: invokeLater('$provide', 'service'),
  decorator: invokeLater('$provide', 'decorator'),
  filter: invokeLater('$filterProvider', 'register'),
  directive: invokeLater('$compileProvider', 'directive'),
  config: invokeLater('$injector', 'invoke', 'push', configBlocks),
  run: function(fn) {
    moduleInstance._runBlocks.push(fn);
    return moduleInstance;
  },
  _invokeQueue: invokeQueue,
  _configBlocks: configBlocks,
  _runBlocks: []
};
```
现在，我们需要这种新方法回到`$provide`去注册指令工厂。为了这个目的，我们需要给`$CompileProvider`注入`$provide`。我们也添加`$inject`属性使inject更加安全：
```js
function $CompileProvider($provide) {
    this.directive = function(name, directiveFactory) {
      $provide.factory(name + 'Directive', directiveFactory);
    };
    this.$get = function() {
    }; 
}
$CompileProvider.$inject = ['$provide'];
```
因此，当我们注册一个指令，injector只是一个factory。这里的指令工厂有一个特殊的方面是其他工厂没有的：可能有几个相同名字的指令。
```js
it('allows creating many directives with the same name', function() {
  var myModule = window.angular.module('myModule', []);
  myModule.directive('testing', _.constant({d: 'one'}));
  myModule.directive('testing', _.constant({d: 'two'}));
  var injector = createInjector(['ng', 'myModule']);
  
  var result = injector.get('testingDirective');
  expect(result.length).toBe(2);
  expect(result[0].d).toEqual('one');
  expect(result[1].d).toEqual('two');
});
```
在这个测试里面我们注册了两个叫做`testing`的指令，然后看看当我们从injector获取`testingDirective`的是哪一个。我们期望得到的是两个指令的数组。

因此，与其他组件不同的是，你不能通过仅仅同名的其他指令去重写这个指令，要想改变已经存在的指令，你需要使用装饰器。

允许具有相同名称的多个指令的原因是指令名字用于与DOM 元素和属性匹配。如果Angular强制让指令的名字唯一，你不能有两个指令同时匹配相同的元素。这类似于jQuery的实现，
不允许相同的选择器用于不同的目的。这将是非常严格的限制。

我们在`$CompileProvider.directive`做的是引入一个内部指令注册，每个指令名字指向指令工厂的数组：
```js
function $CompileProvider($provide) {
    var hasDirectives = {};
    this.directive = function(name, directiveFactory) {
    if (!hasDirectives.hasOwnProperty(name)) {
      hasDirectives[name] = [];
    }
    hasDirectives[name].push(directiveFactory);
    };
    this.$get = function() {
    	
    }; 
}
```
然后，我们给`$provider`注册的是一个函数，它从内部注册的寻找指令工厂，并且使用`$injecctor`调用每一个。不管是谁调用指令，将接收一个调用的结果数组：
```js
this.directive = function(name, directiveFactory) {
  if (!hasDirectives.hasOwnProperty(name)) {
    hasDirectives[name] = [];
    $provide.factory(name + 'Directive', ['$injector', function($injector) {
      var factories = hasDirectives[name];
      return _.map(factories, $injector.invoke);
    }]);
    }
  hasDirectives[name].push(directiveFactory);
};
```
我们现在需要在`compile.js`中引入LoDash:
```js
'use strict';
var _ = require('lodash');
```
作为一个应用开发者，我们很少向自己的代码注入指令，因为指令一般的应用方法是通过DOM编译。但是，如果你确实需要通过一个注入来获取一个指令，这也是可能的。你仅仅需要
获取它封装到一个数组，因为你知道指令工厂函数是如何实现的。

一个特殊的情况就是，你仍然需要在这个代码中处理与`hasOwnProperty`方法的关联使用。就像在我们之前的章节中做的，我们再次需要阻止任何人通过名字注册一个指令，因为
它会覆盖方法中的`hasDirectives`对象：
```js
it('does not allow a directive called hasOwnProperty', function() {
  var myModule = window.angular.module('myModule', []);
  myModule.directive('hasOwnProperty', function() { });
  expect(function() {
    createInjector(['ng', 'myModule']);
  }).toThrow();
});
```

此限制可以在`directive`方法中作为一个简单的字符串比较实现：
```js
this.directive = function(name, directiveFactory) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid directive name';
    }
      if (!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];
        $provide.factory(name + 'Directive', ['$injector', function($injector) {
          var factories = hasDirectives[name];
          return _.map(factories, $injector.invoke);
        }]);
    }
    hasDirectives[name].push(directiveFactory);
};
```
这里还有一个指令注册的特殊功能需要我们去处理：同一时间注册多个指令的快捷方法。这可以通过给`directive`方法一个对象作为参数来完成。对象的key值被当作一个指令的名字，
它的值作为factories:
```js
it('allows creating directives with object notation', function() {
  var myModule = window.angular.module('myModule', []);
  myModule.directive({
    a: function() { },
    b: function() { },
    c: function() { }
  });
  var injector = createInjector(['ng', 'myModule']);
  
  expect(injector.has('aDirective')).toBe(true);
  expect(injector.has('bDirective')).toBe(true);
  expect(injector.has('cDirective')).toBe(true);
});
```
在`directive`方法中我们需要检查调用者的使用方法：
```js
this.directive = function(name, directiveFactory) {
	if (_.isString(name)) {
        if (name === 'hasOwnProperty') {
          throw 'hasOwnProperty is not a valid directive name';
        }
          if (!hasDirectives.hasOwnProperty(name)) {
            hasDirectives[name] = [];
            $provide.factory(name + 'Directive', ['$injector', function($injector) {
              var factories = hasDirectives[name];
              return _.map(factories, $injector.invoke);
            }]);
        }
        hasDirectives[name].push(directiveFactory);
    } else {
		
    }
};
```
在给定对象的情况下，我们遍历所有的对象成员，并为每一个递归调用注册函数：
```js
this.directive = function(name, directiveFactory) {
	if (_.isString(name)) {
        if (name === 'hasOwnProperty') {
          throw 'hasOwnProperty is not a valid directive name';
        }
          if (!hasDirectives.hasOwnProperty(name)) {
            hasDirectives[name] = [];
            $provide.factory(name + 'Directive', ['$injector', function($injector) {
              var factories = hasDirectives[name];
              return _.map(factories, $injector.invoke);
            }]);
        }
        hasDirectives[name].push(directiveFactory);
    } else {
		_.forEach(name, _.bind(function(directiveFactory, name) {
          this.directive(name, directiveFactory);
        }, this));
    }
};
```
