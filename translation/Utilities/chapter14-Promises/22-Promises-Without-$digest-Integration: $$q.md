## Promises Without $digest Integration: $$q
我们将使用一个有趣的都熟悉的Angular功能：`$$q`服务结束本章。这是一个Promise实现，像`$q`，但是代替把resolutions集成到`$rootScope` digest，它解决了浏览器
超时问题和不再digest。从这个意义上来说，它比`$q`更接近非Angular的Promise实现。

`$$q`通过使用Angular内部的`$timeout`和`$interval`服务当你使用`skipApply`标识调用它们。它也使用`ngAnimation`为异步工作。

在我们开始测试`$$q`之前，我们应该将它注入到我们的`$q`测试套件，因此我们从injector获取它。这也将暂时破快大量的测试用例:
```js
var $q, $$q, $rootScope;
beforeEach(function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  $q = injector.get('$q');
  $$q = injector.get('$$q');
  $rootScope = injector.get('$rootScope');
});
```
要恢复这些测试用例，首先我们在`src/q.js`文件中为`$$q`创建一个provider，并且改变文件对外暴露包括`$QProvider`和`$QProvider`：
```js
function $$QProvider() {
  this.$get = function() {
  }; 
}
module.exports = {
  $QProvider: $QProvider,
  $$QProvider: $$QProvider
};
```
然后我们在`ng`模块中暴露`$$q`:
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = window.angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
}
```
现在我们可以添加我们对`$$q`的第一个测试用例。我们要做的第一件事情就是你可以在它里面创建Deferreds和Promise,就像你在`$q`中的一样，但是他们不会resolve当你运行一个digest：
```js
describe('$$q', function() {
  it('uses deferreds that do not resolve at digest', function() {
    var d = $$q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise.then(fulfilledSpy);
    d.resolve('ok');
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
  });
});
```
相反，一段时间过去了，这些Promises就得到解决。我们通过使用Jasmine的fake clock feature功能可以很容易的测试。它让我们把时间向前移动，看看会发生什么：
```js
describe('$$q', function() {
	beforeEach(function() {
      jasmine.clock().install();
    });
    afterEach(function() {
      jasmine.clock().uninstall();
    });
    
  it('uses deferreds that do not resolve at digest', function() {
    var d = $$q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise.then(fulfilledSpy);
    d.resolve('ok');
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
  });
  
  
  it('uses deferreds that resolve later', function() {
    var d = $$q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise.then(fulfilledSpy);
    d.resolve('ok');
    jasmine.clock().tick(1);
    expect(fulfilledSpy).toHaveBeenCalledWith('ok');
  });
});
```
现在我们将时间向前调整1秒，并且当我们在后面有一个resolution。

当然，`$$q`一个重要的性能优化的特点是，当它的Promise resolve的时候，它不会引起digest运行:
```js
it('does not invoke digest', function() {
  var d = $$q.defer();
  d.promise.then(_.noop);
  d.resolve('ok');
  var watchSpy = jasmine.createSpy();
  $rootScope.$watch(watchSpy);
  jasmine.clock().tick(1);
  expect(watchSpy).not.toHaveBeenCalled();
});
```
因此，如何创建`$$q`？我们需要把在`$q`里面实现的重新实现一遍？答案是不，我们不会这么做。如果你想一想，`$q`和`$$q`之间在解决Deferred上唯一的不同就是：`$q`使用`$evalAsync`,
但是对于`$$q`使用应该使用`setTimeout`：

因此，我们将要做的是将`$QProvider.$get`里面的所有包裹在一个帮助函数，叫做`qFactory`。然后，我们可以将这个函数的"推迟策略"作为一个参数。现在我们将`$QProvider`和` $$QProvider`更新为如下：

```js
function $QProvider() {
  this.$get = ['$rootScope', function($rootScope) {
    return qFactory(function(callback) {
      $rootScope.$evalAsync(callback);
    });
  }];
}

function $$QProvider() {
  this.$get = function() {
    return qFactory(function(callback) {
      setTimeout(callback, 0);
    });
  }; 
}
```
所有我们已经存在的`$q`设置的代码全部移入`qFactory`，使用提供的"call later"代替`$evalAsync`。最后下面是`q.js`的所有源码：
```js
// 省略
```