## Integrating Scopes, Expressions, and Filters with The Injector
为了总结我们的依赖注入的覆盖范围，我们将回到本书早期写的代码，并且将他们集成到模块和依赖注入中。这很重要，因为不这么做这些功能将不能暴露给应用开发者。

在第9章的开始，我们看到当你在`loader.js`中调用`setupModuleLoader()`的时候如何生成全局`angular`和模块。现在我们在它上面再添加一个层级。
在这个层我们设置模块加载，并且注册一些核心的组件给它。在这里我们将插入解析表达式，根作用域，过滤器服务和过滤器filter。

核心组件注册我们将在一个叫做`src/angular_public.js`新文件中。我们在`test/angular_public_spec.js`中写第一个测试：
```js
var publishExternalAPI = require('../src/angular_public');
describe('angularPublic', function() {
  it('sets up the angular object and the module loader', function() {
    publishExternalAPI();
    expect(window.angular).toBeDefined();
    expect(window.angular.module).toBeDefined();
  });
});
```
这实际上只是检查`publishExternalAPI`函数应该调用`setupModuleLoader`。这很容易实现：
```js
'use strict';
var setupModuleLoader = require('./loader');
function publishExternalAPI() {
    setupModuleLoader(window);
}
module.exports = publishExternalAPI;
```
这个函数应该做的是设置一个叫做`ng`的模块：
```js
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('angularPublic', function() {
  it('sets up the angular object and the module loader', function() {
    publishExternalAPI();
    expect(window.angular).toBeDefined();
    expect(window.angular.module).toBeDefined();
  });
  it('sets up the ng module', function() {
    publishExternalAPI();
    expect(createInjector(['ng'])).toBeDe ned();
  });
});
```
这个是通过调用`angular.module`实现：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = window.angular.module('ng', []);
}
```
`ng`模块是Angular自己提供的所有服务，指令，过滤器，和其他组件。就像我们看到的启动过程，这个模块会自动地包含到Angular的每个应用，因此作为一个应用开发者你甚至
意识不到它的存在。但是这是Angular暴露它自己的服务给其他的应用。

我们在`ng`模块首先放入的是`$filter`，我们的过滤器服务：
```js
it('sets up the $ lter service', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$ lter')).toBe(true);
});
```
它作为一个provider注入：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
}
```
所以我们期望这里有一个provider的构造函数是`filter.js`默认对外的接口，我们使用对`$filter`的provider。

在本书的第2部分，我们在`filter.js`中只是设置和导出函数叫做`register`和`filter`。现在我们将它包到一个provider中。`register`函数成为provider上的一个方法,
并且`filter`函数成为provider`$get`方法的返回值。换句话说，它成为`$filter`服务：
```js
function $FilterProvider() {
    var filters = {};
    this.register = function(name, factory) {
    if (_.isObject(name)) {
      return _.map(name, _.bind(function(factory, name) {
        return this.register(name, factory);
      }, this));
    } else {
      var filter = factory();
      filters[name] = filter;
      return  filter;
    }
    };
    this.$get = function() {
    return function filter(name) {
      return filters[name];
    }; 
    this.register('filter', require('./filter_filter'));
    }
    module.exports = $FilterProvider;
};
```
现在我们需要回到`filter_spec.js`,使用从`ng`模块的filter provider代替直接公开的`register`和`filter`函数：
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('filter', function() {
    beforeEach(function() {
      publishExternalAPI();
    });
    it('can be registered and obtained', function() {
      var myFilter = function() { };
      var myFilterFactory = function() {
        return myFilter;
      };
      var injector = createInjector(['ng', function($ lterProvider) {
        $filterProvider.register('my', myFilterFactory);
      }]);
      var $filter = injector.get('$filter');
      expect($filter('my')).toBe(myFilter);
    });
    it('allows registering multiple  lters with an object', function() {
      var myFilter = function() { };
      var myOtherFilter = function() { };
      var injector = createInjector(['ng', function($ lterProvider) {
          $filterProvider.register({
            my: function() {
                return myFilter;
            },
            myOther: function() {
              return myOtherFilter;
            }
          });
      }]);
    var $filter = injector.get('$ lter');
    expect($filter('my')).toBe(myFilter);
    expect($filter('myOther')).toBe(myOtherFilter);
    });
});
```
附加的事情，`$filter`服务做的是使用依赖注入实例化过滤器，并且将它们作为常规factories有效。如果你注册了一个叫做`my`的filter,不仅通过``$filter服务调用有效，
并且通过`myFilter`名字作为普通依赖调用也有效：
```js
it('is available through injector', function() {
  var myFilter = function() { };
  var injector = createInjector(['ng', function($filterProvider) {
    $filterProvider.register('my', function() {
      return myFilter;
    });
  }]);
  expect(injector.has('myFilter')).toBe(true);
  expect(injector.get('myFilter')).toBe(myFilter);
});
```
filter factory也可以有注入依赖：
```js
it('may have dependencies in factory', function() {
  var injector = createInjector(['ng', function($provide, $filterProvider) {
    $provide.constant('suffix', '!');
    $filterProvider.register('my', function(suffix) {
      return function(v) {
        return suffix + v;
      };
    });
  }]);
  expect(injector.has('myFilter')).toBe(true);
});
```
`$FilterProvider`使每个filter作为一个普通factory注册到`$provide`服务成为可能：
```js
function $FilterProvider() {
    var filters = {};
    this.register = function(name, factory) {
    if (_.isObject(name)) {
      return _.map(name, _.bind(function(factory, name) {
        return this.register(name, factory);
      }, this));
    } else {
      return $provide.factory(name + 'Filter', factory);
    }
    };
    this.$get = function() {
        return function filter(name) {
          return filters[name];
        };
        this.register('filter', require('./filter_filter'));
    }
    module.exports = $FilterProvider;
};
```
在运行的时候`$filter`服务使用`$injector`去获取filter的函数。在这点上，我们不再需要内部的`filters`对象，所有的东西存储到DI系统：
```js
function $FilterProvider() {
    var filters = {};
    this.register = function(name, factory) {
    if (_.isObject(name)) {
      return _.map(name, _.bind(function(factory, name) {
        return this.register(name, factory);
      }, this));
    } else {
      return $provide.factory(name + 'Filter', factory);
    }
    };
    this.$get = function() {
      this.$get = ['$injector', function($injector) {
          return function filter(name) {
            return $injector.get(name + 'Filter');
          };
      }];
    }
    module.exports = $FilterProvider;
};
```
Angular通过公共模块API提供了一个快捷方式去注册filter。它有一个`filter`方法，使用它filter可以注册。这比通过配置块使用`$filterProvider`注册方便很多：
```js
it('can be registered through module API', function() {
  var myFilter = function() { };
  var module = window.angular.module('myModule', [])
    . lter('my', function() {
      return myFilter;
    });
  var injector = createInjector(['ng', 'myModule']);
  expect(injector.has('myFilter')).toBe(true);
  expect(injector.get('myFilter')).toBe(myFilter);
});
```
在模块加载中我们引入`filter`方法：
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
与所有其他的注册方法，`filter`方法注册没有调用`$provide`方法，它使用`$filterProvider`方法，它是在`filter.js`中定义的provider。

我们需要回到filter fiter,它仍然依赖公开的`filter`方法。我们修复它：
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('filter filter', function() {
    beforeEach(function() {
      publishExternalAPI();
    });
    it('is available', function() {
        var injector = createInjector(['ng']);
        expect(injector.has(' lterFilter')).toBe(true);
    });
    // ...
});
```
进入到表达式解析，它也在`ng`模块：
```js
it('sets up the $parse service', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$parse')).toBe(true);
});
```
它也作为一个provider注册：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
  ngModule.provider('$parse', require('./parse'));
}
```
就像过滤器provider，我们期望在`parse.js`中有一个provider构造函数为`$parse`创建一个provider。它包裹全聚德`parse`函数：
```js
function $ParseProvider() {
    this.$get = function() {
    return function(expr) {
      switch (typeof expr) {
        case 'string':
          var lexer = new Lexer();
          var parser = new Parser(lexer);
          var oneTime = false;
          if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
            oneTime = true;
            expr = expr.substring(2);
          }
          var parseFn = parser.parse(expr);
          if (parseFn.constant) {
            parseFn.$$watchDelegate = constantWatchDelegate;
          } else if (oneTime) {
            parseFn.$$watchDelegate = parseFn.literal ?
          } else if (parseFn.inputs) {
              oneTimeLiteralWatchDelegate :
              oneTimeWatchDelegate;
                  parseFn.$$watchDelegate = inputsWatchDelegate;
                }
          return parseFn;
        case 'function':
          return expr;
        default:
          return _.noop;
        }
      };
   };
}
module.exports = $ParseProvider;
```
所以，以前的 `function parse()`成为provider`$get`方法的返回值。返回值是当你注入`$parse`的时候得到什么。

我们需要做的另一件事就是获得`$filter`服务，在解析器内部使用。首先，文件上部移除`require`这行在filter中现在加载。相反，使用Angular的DI给`Parse`构造函数注入：
```js
this.$get = ['$filter', function($filter) {
    return function(expr) {
      switch (typeof expr) {
        case 'string':
            var lexer = new Lexer();
            var parser = new Parser(lexer, $filter);
            var oneTime = false;
            if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
              oneTime = true;
              expr = expr.substring(2);
            }
            var parseFn = parser.parse(expr);
            if (parseFn.constant) {
              parseFn.$$watchDelegate = constantWatchDelegate;
            } else if (oneTime) {
              parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate :
            } else if (parseFn.inputs) {
            oneTimeWatchDelegate;
            parseFn.$$watchDelegate = inputsWatchDelegate;
          }
          return parseFn;
        case 'function':
          return expr;
        default:
          return _.noop;
      }
    };
}];
```
`Parse`构造函数传递`$filter`给`ASTCompiler`构造函数:
```js
function Parser(lexer, $filter) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast, $filter);
}
```
`ASTCompiler`构造函数将它存储在一个属性上：
```js
function ASTCompiler(astBuilder, $filter) {
    this.astBuilder = astBuilder;
    this.$filter = $filter;
}
```
我们现在需要这个属性的第一个地方是给`filter`函数传递到生成代码中。实际上我们传递的是`$filter`服务。那是将在运行时获得filter:
```js
var fn = new Function(
  'ensureSafeMemberName',
  'ensureSafeObject',
  'ensureSafeFunction',
  'ifDefined',
  'filter',
  fnString)(
    ensureSafeMemberName,
    ensureSafeObject,
    ensureSafeFunction,
    ifDefined,
  this.$filter);
```
我们也需要传递`$filter`到`markConstantAndWatchExpressions`,它现在使用的还是全局`filter`函数：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  var extra = '';
  markConstantAndWatchExpressions(ast, this.$filter);
  // ...
};
```
在`markConstantAndWatchExpressions`的实现里面我们需要接收这个参数，并且将它传到各个递归调用，以便于最终我们在`CallExpressions`需要的时候时候可以调用它：
```js
// 忽略代码，只是将所有的调用添加this.$filter
```
当修复了给`parse_spec.js`中新加的单元测试，其他解析的单元测试还是失败的，因为他们仍然依赖全局函数`parse`。我们需要改变`parse_spec.js`去代替`parse`函数，
 它实际上创建一个injector并且在`beforeEach`中得到`$parse`服务。下面是测试文件的新前置：
 ```js
 'use strict';
 var _ = require('lodash');
 var publishExternalAPI = require('../src/angular_public');
 var createInjector = require('../src/injector');
 describe('parse', function() {
     var parse;
     beforeEach(function() {
       publishExternalAPI();
       parse = createInjector(['ng']).get('$parse');
     });
     // ...
 });
 ```
 注册和使用filters的测试也需要更新，以便他们创建自己的injectors，并通过filter provider注册：
 ```js
it('can parse filter expressions', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('upcase', function() {
			return function(str) {
				return str.toUpperCase();
			};
		});
	}]).get('$parse');
	var fn = parse('aString | upcase');
	expect(fn({aString: 'Hello'})).toEqual('HELLO');
});
it('can parse filter chain expressions', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('upcase', function() {
			return function(s) {
				return s.toUpperCase();
			};
		});
		$filterProvider.register('exclamate', function() {
			return function(s) {
				return s + '!';
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | upcase | exclamate');
	expect(fn()).toEqual('HELLO!');
});
it('can pass an additional argument to filters', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('repeat', function() {
			return function(s, times) {
				return _.repeat(s, times);
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | repeat:3');
	expect(fn()).toEqual('hellohellohello');
});
it('can pass several additional arguments to filters', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('surround', function() {
			return function(s, left, right) {
				return left + s + right;
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | surround:"*":"!"');
	expect(fn()).toEqual('*hello!');
});
// ...
it('marks filters constant if arguments are', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('aFilter', function() {
			return _.identity;
		});
	}]).get('$parse');
	expect(parse('[1, 2, 3] | aFilter').constant).toBe(true);
	expect(parse('[1, 2, a] | aFilter').constant).toBe(false);
	expect(parse('[1, 2, 3] | aFilter:42').constant).toBe(true);
	expect(parse('[1, 2, 3] | aFilter:a').constant).toBe(false);
});
```
我们现在回到filter_filter测试套件，通过获取`$parse`服务修复剩下的测试：
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe(' lter  lter', function() {
    var parse;
    beforeEach(function() {
      publishExternalAPI();
      parse = createInjector(['ng']).get('$parse');
    });
    // ...
});
```
随着`$parse`的结束，我们将注意力转向`scope.js`。这里对它已经有的一些测试已经失败了，因为他们仍然依赖已经不存在`parse`和`register`函数。我们将暂时修复。

就像`$filter`和`$parse`，ng模块应该包括有一个scope实例 - `$rootScope`;
```js
it('sets up the $rootScope', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$rootScope')).toBe(true);
});
```
就像`$filter`和`$parse`，`$rootScope`使用一个provider注册：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
}
```
在`scope.js`中实现方式应该是引入`$RootScopeProvider`,并且它的`$get`方法，然后将`scope.js`中所有的代码移到`$get`方法中：
```js
'use strict';
var _ = require('lodash');
function $RootScopeProvider() {
    this.$get = function() {
    //  Move all previous code from scope.js here.
    };
}
module.exports = $RootScopeProvider;
```
我们也需要从`$get`返回一个值，所以最后一件事情就是创建一个`Scope`的实例并返回它：
```js
'use strict';
var _ = require('lodash');
function $RootScopeProvider() {
    this.$get = function() {
        //  Move all previous code from scope.js here.
        var $rootScope = new Scope();
        return $rootScope;
    };
}
module.exports = $RootScopeProvider;
```
返回的scope对象将是`$rootScope`。注意到`scope.js`中的所有对象都是私有的：`Scope`的构造函数或者其他支持的函数在provider的外面都是不可访问的。
`$rootScope`是我们唯一对外暴露的东西。

要解决的问题与`parse`函数现在丢失，我们需要修改我们的代码去使用`$parse`服务代替。由于我们现在需要一个provider和一个`$get`方法，我们注入`$parse`：
```js
'use strict';
var _ = require('lodash');
function $RootScopeProvider() {
    this.$get = ['$parse', function($parse) {
        // All previous code from scope.js goes here.
        var $rootScope = new Scope();
        return $rootScope;
    }];
}
module.exports = $RootScopeProvider;
```
现在我们可以使用`$parse`代替`parse`去改变`$watch`函数：
```js
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  // ...
  watchFn = $parse(watchFn);
  // ...
};
```
对`$watchCollection`做同样的事情：
```js
Scope.prototype.$watchCollection = function(watchFn, listenerFn) {
  // ...
  watchFn = $parse(watchFn);
  // ...
};
```
`$eval`也是一样的：
```js
Scope.prototype.$eval = function(expr, locals) {
    return $parse(expr)(this, locals);
};
```
我们有了`$rootScope`的实现，对于它的测试仍然是失败的。我们去修复它。

首先，更新`scope_spec.js`顶部的引入。除了模块和注入函数，我们不需要再访问任何东西：
```js
'use strict';
var _ = require('lodash');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
```
其次，不幸的是，第一章的第一个单元测试需要去掉：
```js
it('can be constructed and used as an object', function() {
  var scope = new Scope();
  scope.aProperty = 1;
  expect(scope.aProperty).toBe(1);
});
```
一个`Scope`实际上不是使用构造函数构建的，由于构造函数不是有效的，所以这个测试需要被移除。我们可以通过`$rootScope`访问一个scope，
并且在`angular_public_spec.js`我们已经有了对应的测试。

现在我们需要完成在`scope_spec.js`中嵌套的每个`describe`块，并且使用injector设置一个scope对象，以便于现有的测试获得一个。

在每个测试块开始`describe(‘digest’), describe(‘$eval’), describe(‘$apply’), describe(‘$evalAsync’), describe(‘$applyAsync’), describe(‘$$postDigest’), describe(‘$watchGroup’), describe(‘$watchGroup’)`,
我们修改`beforeEach`从injector获取一个root scope:
```js
var scope;
beforeEach(function() {
    publishExternalAPI();
    scope = createInjector(['ng']).get('$rootScope');
});
```
在`describe(‘inheritance’)`块，我们添加一个新`beforeEach`去获取root scope,我们将在测试中作为parent 使用：
```js
describe('inheritance', function() {
    var parent;
    beforeEach(function() {
      publishExternalAPI();
      parent = createInjector(['ng']).get('$rootScope');
    });
    // ...
});
```
在`describe(‘inheritance’)`块的每个测试，我们现在需要移除第一行，就是设置parent scope（`var parent = new Scope()`）。他们被在`beforeEach`中定义的
parent scope代替。所以，例如，第一个测试只是使用parent,但是没有构造它：
```js
it('inherits the parents properties', function() {
  parent.aValue = [1, 2, 3];
  var child = parent.$new();
  expect(child.aValue).toEqual([1, 2, 3]);
});
```
对块中所有的测试重复同样的技巧。

这里有两个异常，第一个在"can be nested at any depth"测试，我们只是将`parent`赋值给`a`:
```js
it('can be nested at any depth', function() {
  var a = parent;
  // ...
});
```
第二个异常是"can take some other scope as the parent"测试，在里面我们从root scope制造了两个parents:
```js
it('can take some other scope as the parent', function() {
  var prototypeParent = parent.$new();
  var hierarchyParent = parent.$new();
  var child = prototypeParent.$new(false, hierarchyParent);
  // ...
});
```
在`describe(‘$watchCollection’)`块，我们将再次使用injector获取root scope，代替使用`Scope`的构造函数：
```js
describe('$watchCollection', function() {
  var scope;
  beforeEach(function() {
    publishExternalAPI();
    scope = createInjector(['ng']).get('$rootScope');
  });
  // ...
});
```
在`describe(‘Events’)`块，我们将设置parent scope为root scope，并且保持剩下的设置像这样：
```js
describe('Events', function() {
  var parent;
  var scope;
  var child;
  var isolatedChild;
  beforeEach(function() {
    publishExternalAPI();
    parent = createInjector(['ng']).get('$rootScope');
    scope = parent.$new();
        child = scope.$new();
        isolatedChild = scope.$new(true);
  });
  // ..
});
```
最后，有一个测试在`scope_spec.js`中注册一个filter，我们应该改变它自己的injector，并且使用`$filterProvider`:
```js
it('allows $stateful filter value to change over time', function(done) {
  var injector = createInjector(['ng', function($ lterProvider) {
    $ lterProvider.register('withTime', function() {
      return _.extend(function(v) {
        return new Date().toISOString() + ': ' + v;
      }, {
        $stateful: true
      });
  });
  }]);
  scope = injector.get('$rootScope');
  var listenerSpy = jasmine.createSpy();
  scope.$watch('42 | withTime', listenerSpy);
  scope.$digest();
  var  rstValue = listenerSpy.calls.mostRecent().args[0];
  setTimeout(function() {
    scope.$digest();
    var secondValue = listenerSpy.calls.mostRecent().args[0];
    expect(secondValue).not.toEqual( rstValue);
    done();
  }, 100);
});
```
到这里，所有的测试应该再次通过。
