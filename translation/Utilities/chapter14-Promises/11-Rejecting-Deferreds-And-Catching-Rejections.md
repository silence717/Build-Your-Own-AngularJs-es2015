## Rejecting Deferreds And Catching Rejections

就像在本章开始讨论的一样，回调风格编程最大的困难时缺少一般的错误处理机制。错误通过任意选择的回调参数，并且从库到库，从应用到应用的方式都有所不同。

Promises 解决这个问题有内置的错误处理。这个解决方案有两部分，第一个是你可以向某个 Deferred 标记有东西出错了。这个叫做拒绝 Deferred。第二部分是接收通知 rejection 已经发生。
你可以通过给你的Promise的 `then`方法添加第二个参数。第二个参数是一个回调方法，如果 promise 被reject可以调用。
```js
it('can reject a deferred', function() {
  var d = $q.defer();
  var fulfillSpy = jasmine.createSpy();
  var rejectSpy  = jasmine.createSpy();
  d.promise.then(fulfillSpy, rejectSpy);
  d.reject('fail');
  $rootScope.$apply();
  expect(fulfillSpy).not.toHaveBeenCalled();
  expect(rejectSpy).toHaveBeenCalledWith('fail');
});
```
一个 Promise 最多可以被rejected一次：
```js
it('can reject just once', function() {
  var d = $q.defer();
  var rejectSpy  = jasmine.createSpy();
  d.promise.then(null, rejectSpy);
  d.reject('fail');
  $rootScope.$apply();
  expect(rejectSpy.calls.count()).toBe(1);
  d.reject('fail again');
  $rootScope.$apply();
  expect(rejectSpy.calls.count()).toBe(1);
});
```
你也不能 resolved 你已经 reject 的东西（反之亦然）。正确的是，一个 Promise 只能有一个结果，被处理或者被拒绝：
```js
it('cannot ful ll a promise once rejected', function() {
  var d = $q.defer();
  var fulfillSpy = jasmine.createSpy();
  var rejectSpy  = jasmine.createSpy();
  d.promise.then(fulfillSpy, rejectSpy);
  d.reject('fail');
  $rootScope.$apply();
  d.resolve('success');
  $rootScope.$apply();
  expect(fulfillSpy).not.toHaveBeenCalled();
});
```
`Deferred`的`reject`方法和`resolve`非常相似。最主要的区别就是 promise 的rejected状态被设置为`2`而不是`1`:
```js
Deferred.prototype.reject = function(reason) {
  if (this.promise.$$state.status) {
    return; 
  }
  this.promise.$$state.value = reason;
  this.promise.$$state.status = 2;
  scheduleProcessQueue(this.promise.$$state);
};
```
`Promise`的`then`方法现在需要接收两个 callbacks - 成功回调和失败回调。`pending`中的项现在成为回调数组。我们将成功callback放在下标为1的数组，失败的callback放在
下标为2的数组。这种方式让下标和我们使用的 Promise 的状态像匹配：
```js
Promise.prototype.then = function(onFulfilled, onRejected) {
this.$$state.pending = this.$$state.pending || [];
this.$$state.pending.push([null, onFulfilled, onRejected]);
if (this.$$state.status > 0) {
    scheduleProcessQueue(this.$$state);
  }
};
```
在`processQueue`我们使用`status`获取正确的处理，并且我们不需要做太多去覆盖成功和失败的情况：
```js
function processQueue(state) {
  var pending = state.pending;
  state.pending = undefined;
  _.forEach(pending, function(handlers) {
    var fn = handlers[state.status];
    fn(state.value);
  }); 
}
```
这是这种实现的一个问题，它是假设每个调用都支持成功和失败的回调函数。它实际上应该省略一个或者其他（技术上两个都可以）：
```js
it('does not require a failure handler each time', function() {
  var d = $q.defer();
  
  var fulfillSpy = jasmine.createSpy();
  var rejectSpy  = jasmine.createSpy();
  d.promise.then(fulfillSpy);
  d.promise.then(null, rejectSpy);
  
  d.reject('fail');
  $rootScope.$apply();
  
  expect(rejectSpy).toHaveBeenCalledWith('fail');
});
it('does not require a success handler each time', function() {
  var d = $q.defer();
  
  var fulfillSpy = jasmine.createSpy();
  var rejectSpy  = jasmine.createSpy();
  d.promise.then(fulfillSpy);
  d.promise.then(null, rejectSpy);
  
  d.resolve('ok');
  $rootScope.$apply();
  
  expect(fulfillSpy).toHaveBeenCalledWith('ok');
});
```
修复的方法很简单是使用检测实际上是一个函数保护回调函数调用：
```js
function processQueue(state) {
  var pending = state.pending;
  state.pending = undefined;
  _.forEach(pending, function(handlers) {
    var fn = handlers[state.status];
    if (_.isFunction(fn)) {
      fn(state.value);
    }
  }); 
}
```
这种情况下还有一张快捷方法，你仅仅只想提供一个失败回调。你可以使用`promise.then(null, callback)`，你可以可以使用一个叫做`catch`的方法：
```js
it('can register rejection handler with catch', function() {
  var d = $q.defer();
  
  var rejectSpy  = jasmine.createSpy();
  d.promise.catch(rejectSpy);
  d.reject('fail');
  $rootScope.$apply();
  
  expect(rejectSpy).toHaveBeenCalled();
});
```
这个方法是`then`的一系列。这里没有什么特别之处 - 它只是为了方便：
```js
Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
};
```