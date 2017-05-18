## Promise Chaining
现在我们对 Deferrend-Promise 对行为有了一个好的了解。这本身是一件有用的事情，但是Promises真正来是当你有多个异步任务，并且需要为他们组成一个工作流。这个时候Promises链。

最简单的Promise链组成形式就是将几个callbacks放在then,一个接一个。每个callback接收前一个的返回值作为它的参数：
```js
it('allows chaining handlers', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  d.promise.then(function(result) {
    return result + 1;
  }).then(function(result) {
    return result * 2;
  }).then(fulfilledSpy);
  
  d.resolve(20);
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(42);
});
```
这里发生了什么？每一次调用`then`返回另一个Promise可以用于未来的callbacks。重要的是要理解，每次这个发生都会创建一个新的Promise。其他的callbacks对最初的Promise不产生影响：
```js
it('does not modify original resolution in chains', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  
  d.promise.then(function(result) {
      return result + 1;``
  }).then(function(result) {
    return result * 2;
  });
  d.promise.then(fulfilledSpy);
  d.resolve(20);
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(20);
});
```
我们需要在`then`里面做的是创建一个新 Deferred - 一个在`onFulfilled`callback的回调。我们将它的Promise返回给调用者：
```js
Promise.prototype.then = function(onFulfilled, onRejected) {
    var result = new Deferred();
    this.$$state.pending = this.$$state.pending || [];
    this.$$state.pending.push([null, onFulfilled, onRejected]);
    if (this.$$state.status > 0) {
      scheduleProcessQueue(this.$$state);
    }
    return result.promise;
};
```
然后我们需要把 Deferred 传到`onFulfilled`callback真正调用的地方，所以结果可以被传递。我们将它设置为`$$state.pending`数组中的第一项：
```js
Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Deferred();
  this.$$state.pending = this.$$state.pending || [];
  this.$$state.pending.push([result, onFulfilled, onRejected]);
  if (this.$$state.status > 0) {
    scheduleProcessQueue(this.$$state);
  }
  return result.promise;
};
```
然后我们在`processQueue`中调用callback,我们也将它的返回值传给 Deferred：
```js
function processQueue(state) {
  var pending = state.pending;
  state.pending = undefined;
  _.forEach(pending, function(handlers) {
    var deferred = handlers[0];
    var fn = handlers[state.status];
    if (_.isFunction(fn)) {
      deferred.resolve(fn(state.value));
    } 
  });
}
```
这就是链式`then`是如何工作的。每一个创建一个新的 Deferred，并且关联到一个新的 Promise。新的 Deferred 是独立于最初的，但是当最初的一个被resolved它就会被resolved。

注意到一个`then`调用通常会创建一个新Deferred，并且返回一个 Promise。某个点来说，你可能会在链的最后端，并且你没有使用最后一个Promise做任何事情。它仍然是存在的，只是被忽略。

链的另外一个重要方面是，如何传值直到回调函数被发现。例如，在下面我们有一个Deferred被rejected。我们只给它添加了一个成功的callback，但是下一个，Promise链我们添加了一个
失败的callback。失败通过第二个Promise传递。所以你可以有一个结构像`one.then(two).catch(three)`并且依赖`three`捕获`one`和`two`的错误：
```js
it('catches rejection on chained handler', function() {
  var d = $q.defer();
  
  var rejectedSpy = jasmine.createSpy();
  d.promise.then(_.noop).catch(rejectedSpy);
  
  d.reject('fail');
  $rootScope.$apply();
  
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
这个不仅发生在rejections，resolutions 也是一样的。当一个Promise仅仅只有一个错误处理，在链中它的 resolutions 传递到下一个 Promise，谁的成功 callbacks 将得到
resolved值：
```js
it('fulfills on chained handler', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  d.promise.catch(_.noop).then(fulfilledSpy);
  
  d.resolve(42);
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(42);
});
```
这个测试使用`_.noop`,因此我们需要将LoDash引入测试文件：
```js
'use strict';
var _ = require('lodash');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
```
所有的一切变为可能只需要简单的修改一下`processQueue`函数。对于每一个handler，如果我们已经有的状态没有callback,我们仅仅 resolve 或者 reject Deferred链使用当前的
Promise 值。这是通过链传递值。
```js
function processQueue(state) {
  var pending = state.pending;
  state.pending = undefined;
  _.forEach(pending, function(handlers) {
    var deferred = handlers[0];
    var fn = handlers[state.status];
    if (_.isFunction(fn)) {
      deferred.resolve(fn(state.value));
    } else if (state.status === 1) {
      deferred.resolve(state.value);
    } else {
      deferred.reject(state.value);
  } 
  });
}
```
关于链的另外一点是，当有rejection，下一个catch实际上会捕获它，并且catch本身的返回值会被当作 resolution，而不是一个rejection。我们的实现已经以这种方式正确
运行，但这可能不明显。诀窍是，我们总是当对当前状态有一个callback的时候在`processQueue`中调用`d.resolve`,无论它是 resolution 或者 rejection。

如果你认为它等同于一个传统的catch块，这应该更有意义。catch处理错误，并且不再传递。正常执行继续。
```js
it('treats catch return value as resolution', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  d.promise
    .catch(function() {
      return 42; 
    })
    .then(fulfilledSpy);
  d.reject('fail');
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(42);
});
```