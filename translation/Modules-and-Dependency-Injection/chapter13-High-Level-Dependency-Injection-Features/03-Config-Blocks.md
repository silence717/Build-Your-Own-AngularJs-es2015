## Config Blocks
使用provider代替我们将在后面章节介绍的更高级别的factories或者services的一个最大的原因是：可配置性。由于你可以在`$get`方法调用前访问provider，
你可以影响依赖实例化的发生。这方面的一个例子就是Angular的`ngRoute`模块中的`$route`能力。_$route_服务职责是在你的应用里面控制URLS路由。
配置它的方式就是使用`$route`的provider。

那是，`$routeProvider`:
```js
$routeProvider.when('/someUrl', {
  templateUrl: '/my/view.html',
  controller: 'MyController'
});
```
唯一的问题是，获取`$routeProvider`需要provider注入，我们目前拥有的唯一地方是其他providers的构造函数。定义一个provider构造函数只是为了配置一些其他provider
是不灵活的。我们真正需要的是在模块加载的时候去执行任意次的"配置函数"，并且给这些函数注入providers。为了这个目的，Angular有*config blocks*。

你可以通过调用模块的`config`函数去定义配置块。你给它一个函数，当injector创建的时候这个函数将会执行：
```js
it('runs config blocks when the injector is created', function() {
    var module = window.angular.module('myModule', []);
    var hasRun = false;
    module.config(function() {
        hasRun = true;
    });
    createInjector(['myModule']);
    expect(hasRun).toBe(true);
});
```
你提供的函数也许被注入（使用第9章节的任意三种注入机制）。例如，你可以注入`$provide`:
```js
it('injects config blocks with provider injector', function() {
    var module = window.angular.module('myModule', []);
    module.config(function($provide) {
        $provide.constant('a', 42);
    });
    var injector = createInjector(['myModule']);
    expect(injector.get('a')).toBe(42);
});
```
因此一个配置块是一个任意的函数，从provider缓存中注入的依赖项。我们可以通过从provider的injector中使用`injector.invoke()`调用一个配置块来满足这些需求。

首先，我们需要在模块上注册一个配置块的API。我们需要对任务进行排队，这将导致provider的injector的`invoke`方法被调用。第一个问题是，我们的调用队列代码现在只
支持在`$provide`调用，不支持`$injector`。我们需要扩展队列项目使他两个都支持。队列项目实际上应该需要三个项目数组：1)调用对象的方法，2)调用方法的名称，3)方法参数：
```js
var invokeLater = function(service, method, arrayMethod) {
    return function() {
        var item = [service, method, arguments];
        invokeQueue[arrayMethod || 'push'](item);
        return moduleInstance;
    };
};
```
我们对`invokeLater`需要做的第二个改变是关联真实的队列使用：我们当前的实现是僵所有的东西放到一个队列，并且期望他们按照注册时候的顺序去执行。如果我们现在考虑配置块，
这不是最佳的。我们比较期望所有的注册在配置块前运行。这种方式使一个模块所有的provider都是有效的，不管它们添加的顺序是什么：
```js
it('allows registering config blocks before providers', function() {
  var module = window.angular.module('myModule', []);

  module.config(function(aProvider) { });
  module.provider('a', function() {
    // 原书中使用lodash的_.constant在3.7版本中已经不存在，导致测试一直通不过
    // this.$get = _.constant(42);
    // 修复为如下
    this.$get = function () {
      return 42;
    };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
为了引入这种顺序的独立性，我们需要为配置块引入第二个队列。我们需要修改`invokeLater`函数去添加第四个可选参数给指定的队列使用。它默认为调用队列：
```js
var createModule = function(name, requires, modules, con gFn) {
  if (name === 'hasOwnProperty') {
    throw 'hasOwnProperty is not a valid module name';
  }
  var invokeQueue = [];
  var configBlocks = [];
  var invokeLater = function(service, method, arrayMethod, queue) {
        return function() {
        queue = queue || invokeQueue;
        queue[arrayMethod || 'push']([service, method, arguments]);
        return moduleInstance;
    };
  };
  // ...
}
```
现在我们可以添加新排列方法，将排队调用`$injector.invoke`。我们也将配置块队列添加到模块实例，以便于injector使用它：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  config: invokeLater('$injector', 'invoke', 'push', configBlocks),
  _invokeQueue: invokeQueue,
  _configBlocks: configBlocks
};
```
我们现在需要在injector中迭代两个队列。首先我们将迭代代码提取到一个函数，并且在两个队列中调用它：
```js
function runInvokeQueue(queue) {
  _.forEach(queue, function(invokeArgs) {
    var method = invokeArgs[0];
    var args = invokeArgs[1];
    providerCache.$provide[method].apply(providerCache.$provide, args);
  });
}
_.forEach(modulesToLoad, function loadModule(moduleName) {
  if (!loadedModules.hasOwnProperty(moduleName)) {
    loadedModules[moduleName] = true;
    var module = window.angular.module(moduleName);
    _.forEach(module.requires, loadModule);
        runInvokeQueue(module._invokeQueue);
        runInvokeQueue(module._con gBlocks);
    }
});
```
我们迭代队列，我们需要动态查找调用对象而不是假设它进入`$provide`。`invokeArgs`数组现在有三个元素：
```js
function runInvokeQueue(queue) {
  _.forEach(queue, function(invokeArgs) {
    var service = providerInjector.get(invokeArgs[0]);
    var method = invokeArgs[1];
    var args = invokeArgs[2];
    service[method].apply(service, args);
  });
}
```
因此，你可以在一个模块实例上通过调用`config()`去注册一个配置块。另一种注册配置块的方式是，当你首次使用`angular.module`创建一个模块实例的时候提供第三个参数：
```js
it('runs a config block added during module registration', function() {
  var module = window.angular.module('myModule', [], function($provide) {
    $provide.constant('a', 42);
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
如果给定这样一个函数，我们首先需要在loader中通过`angular.module`传递它到内部的`createModule`函数：
```js
ensure(angular, 'module', function() {
  var modules = {};
  return function(name, requires, configFn) {
      if (requires) {
        return createModule(name, requires, modules, configFn);
      } else {
        return getModule(name, modules);
      }
  };
});
```
在`createModule`中我们在新模块实例上调用一下`config`即可：
```js
var createModule = function(name, requires, modules, configFn) {
    //...
    if (configFn) {
      moduleInstance.config(configFn);
    }
    //...
};
```