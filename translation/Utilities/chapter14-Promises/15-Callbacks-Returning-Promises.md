## Callbacks Returning Promises
因此，当一个Promise返回一个值，这个值在链中会成为下一个Promise的 resolution 。当一个Promise callback抛出一个异常，这个异常会成为下一个Promise的rejection。
在这两种情况下，值和异常来源于同步的回调。但是你真的不想做一些 Promise 的异步回调工作吗？换句话说，一个Promise的回调返回另一个Promise?

答案是，我们应该将回调返回的 Promise 与链中的下一个回调链接起来：
```js
it('waits on promise returned from handler', function() {
  var d = $q.defer();
  var fulfilledSpy = jasmine.createSpy();
  
  d.promise.then(function(v) {
    var d2 = $q.defer();
    d2.resolve(v + 1);
    return d2.promise;
  }).then(function(v) {
    return v * 2;
  }).then(fulfilledSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(42);
});
```
在这里我们有三个Promise的callback。他们中的第一个会去做一些"异步"自己的工作，只有它被 resolved ，我们继续回到链中的第二个callback。

另一种方式是结合异步工作流用另一个Promise来resolve一个Promise。这种情况下，一个Promise的 resolution 成为另一个Promise:
```js
it('waits on promise given to resolve', function() {
  var d = $q.defer();
  var d2 = $q.defer();
  var fulfilledSpy = jasmine.createSpy();
  
  d.promise.then(fulfilledSpy);
  d2.resolve(42);
  d.resolve(d2.promise);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(42);
});
```
类似的事情也发生在rejections。当一个内部Promise被rejected，rejection在链中传递：
```js
it('rejects when promise returned from handler rejects', function() {
  var d = $q.defer();
  
  var rejectedSpy = jasmine.createSpy();
  d.promise.then(function() {
      var d2 = $q.defer();
      d2.reject('fail');
      return d2.promise;
  }).catch(rejectedSpy);
  d.resolve('ok');
  
  $rootScope.$apply();
  
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
所有这些有效的手段是，一个 Deferred 可能被另一个Promise resolved，在这种情况下，Deferred 的 resolution 依赖于另外的Promise。因此，当我们当我们在`resolve`里面
给定一个值，我们必须检查这个值看起来是不是一个Promise。如果我们决定这么做，我们不马上解决，而是给它添加回调，稍后会叫我们自己resolve(或reject):
```js
Deferred.prototype.resolve = function(value) {
  if (this.promise.$$state.status) {
    return; 
  }
  if (value && _.isFunction(value.then)) {
    value.then(
      _.bind(this.resolve, this),
      _.bind(this.reject, this)
    );
  } else {
    this.promise.$$state.value = value;
    this.promise.$$state.status = 1;
    scheduleProcessQueue(this.promise.$$state);
  }
};
```
现在我们的resolve(或reject)方法当Promise resolve的时候会被稍后再次调用。这实际上会让我们所有的测试通过，由于他们所有都经过resolve。

