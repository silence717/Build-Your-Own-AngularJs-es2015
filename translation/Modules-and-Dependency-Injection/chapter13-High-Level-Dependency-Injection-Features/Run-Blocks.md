## Run Blocks
运行块是配置块的近亲。就像配置块，它们是在injector的构造时间调用的任意函数。
```js
it('runs run blocks when the injector is created', function() {
  var module = window.angular.module('myModule', []);
  var hasRun = false;
  module.run(function() {
    hasRun = true;
  });
  createInjector(['myModule']);
  expect(hasRun).toBe(true);
});
```
配置块和运行块最主要的不同就是运行块从实例化缓存注入：
```js
it('injects run blocks with the instance injector', function() {
  var module = window.angular.module('myModule', []);
  module.provider('a', {$get: _.constant(42)});
  var gotA;
  module.run(function(a) {
gotA = a; });
  createInjector(['myModule']);
  expect(gotA).toBe(42);
});
```
运行块的目的不是配置providers - 你甚至不能再这里注入他们 - 但只是想在Angular的启动过程中运行一些任意的代码。为了实现运行块，我们需要在模块加载器中手机他们，
然后再injector创建之后调用他们。

与配置块不同，运行块不放在模块的调用队列中。他们存储在自己的模块实例化集合中：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
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
我们尝试运行块的最简单的可能实现。我们可以在迭代调用队列后遍历他们，并且使用实例化injector调用每个：
```js
_.forEach(modulesToLoad, function loadModule(moduleName) {
  if (!loadedModules.hasOwnProperty(moduleName)) {
    loadedModules[moduleName] = true;
    var module = window.angular.module(moduleName);
    _.forEach(module.requires, loadModule);
    runInvokeQueue(module._invokeQueue);
    runInvokeQueue(module._con gBlocks);
    _.forEach(module._runBlocks, function(runBlock) {
      instanceInjector.invoke(runBlock);
    });
  }
});
```
这满足了现有的测试套件，但有一个问题。一旦模块加载完成运行就应该运行。当你的injector注入好几个模块，任何运行块应该推迟运行直到所有的模块加载完。当我们看到试图
从其他模块注入依赖的时候，在我们的第一次实现中这个是不正确的：
```js
it('con gures all modules before running any run blocks', function() {
  var module1 = window.angular.module('myModule', []);
  module1.provider('a', {$get: _.constant(1)});
  var result;
  module1.run(function(a, b) {
    result = a + b;
  });
  var module2 = window.angular.module('myOtherModule', []);
  module2.provider('b', {$get: _.constant(2)});
  createInjector(['myModule', 'myOtherModule']);
  expect(result).toBe(3);
});
```
诀窍就是将所有的运行块收集到一个数组中，只有在外部模块加载程勋循环完成后，并且所有的东西都已加载后调用他们：
```js
var runBlocks = [];
_.forEach(modulesToLoad, function loadModule(moduleName) {
  if (!loadedModules.hasOwnProperty(moduleName)) {
    loadedModules[moduleName] = true;
    var module = window.angular.module(moduleName);
    _.forEach(module.requires, loadModule);
    runInvokeQueue(module._invokeQueue);
    runInvokeQueue(module._con gBlocks);
    runBlocks = runBlocks.concat(module._runBlocks);
  }
});
_.forEach(runBlocks, function(runBlock) {
  instanceInjector.invoke(runBlock);
});
```
综上所述，配置块在模块的加载过程中执行，运行块在执行后立即调用。