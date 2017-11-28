## Function Modules
正如我们所看到的，模块就是一个你可以注册应用程序组件的对象。它内部持有这些组件的队列，当模块加载时候执行这些。

这里也有另外一种定义一个模块的方式：一个模块可以只是一个函数，当加载的时候从provider的injector注入。

这里我们定义一个`myModule`作为一个常规模块对象。它有一个依赖，这个依赖是一个函数模块：
```js
it('runs a function module dependency as a config block', function() {
  var functionModule = function($provide) {
    $provide.constant('a', 42);
  };
  window.angular.module('myModule', [functionModule]);
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
你也可以使用函数模块数组形式的依赖注入：
```js
it('runs a function module with array injection as a config block', function() {
  var functionModule = ['$provide', function($provide) {
    $provide.constant('a', 42);
  }];
  window.angular.module('myModule', [functionModule]);
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
函数模块本质上和配置块完全一样：函数使用providers来注入。唯一的不同就是在哪里定义他们：配置块添加到一个模块，函数模块依赖于其他模块。

因为我们做的模块加载，我们不再假设一个模块是一个字符串从`angular.module`中查找。它也可以是一个函数或者数组，这种情况下我们应该通过调用provider注入来"加载"它。
```js
_.forEach(modulesToLoad, function loadModule(module) {
  if (_.isString(module)) {
    if (!loadedModules.hasOwnProperty(module)) {
      loadedModules[module] = true;
      module = window.angular.module(module);
      _.forEach(module.requires, loadModule);
          runInvokeQueue(module._invokeQueue);
          runInvokeQueue(module._con gBlocks);
          runBlocks = runBlocks.concat(module._runBlocks);
      }
    } else if (_.isFunction(module) || _.isArray(module)) {
      providerInjector.invoke(module);
    }
});
```
当你有一个函数模块，你也可以给它一个返回值。这个值会作为一个运行块执行。这个小细节允许一个非常简洁的方式来定义临时模块和相应的运行块，这可能是特别有用的单元测试。
```js
it('supports returning a run block from a function module', function() {
  var result;
  var functionModule = function($provide) {
    $provide.constant('a', 42);
    return function(a) {
        result = a;
    };
  };
  window.angular.module('myModule', [functionModule]);
  createInjector(['myModule']);
  expect(result).toBe(42);
});
```
当一个函数模块执行，我们需要将它的返回值添加到运行块集合。因为从函数模块返回一个运行块是可选的，我们也得做好准备它为`undefined`。
我们在迭代他们之前，我们使用LoDash的_.compact方法从运行块的集合移除掉false的值：
```js
var runBlocks = [];
_.forEach(modulesToLoad, function loadModule(module) {
  if (_.isString(module)) {
    if (!loadedModules.hasOwnProperty(module)) {
      loadedModules[module] = true;
      module = window.angular.module(module);
      _.forEach(module.requires, loadModule);
      runInvokeQueue(module._invokeQueue);
      runInvokeQueue(module._con gBlocks);
      runBlocks = runBlocks.concat(module._runBlocks);
    }
  } else if (_.isFunction(module) || _.isArray(module)) {
    runBlocks.push(providerInjector.invoke(module));
  }
});
_.forEach(_.compact(runBlocks), function(runBlock) {
    instanceInjector.invoke(runBlock);
});
```
我们仍然有一个轻微的问题加载函数模块。像第九章节讨论的一样，每个模块只会加载一次，即使他们被依赖多次。为了这种效果，我们添加`loadedModules`对象，并且在里面存储已经加载的模块名称。

我们不能使用这个对象给函数模块，事实上现在没有凡是去检查它们的重复加载。一个函数模块依赖两次就行执行两次：
```js
it('only loads function modules once', function() {
  var loadedTimes = 0;
  var functionModule = function() {
    loadedTimes++;
  };
  window.angular.module('myModule', [functionModule, functionModule]);
  createInjector(['myModule']);
  expect(loadedTimes).toBe(1);
});
```
我们不能把函数模块放到`loadedModules`对象，因为JavaScript对象的key值只能是字符串，不是函数，我们需要一个通用的键值数据结构：哈希map。

JavaScript没有这样的一直数据结构（直到es2015），所以Angular实现了它，用于`loadedModules`变量。而JavaScript现有存在的这种键值数据结构，我们可以利用它研究
Angular里面它如何工作。因此，我们将从依赖注入开始走些弯路并建立它。