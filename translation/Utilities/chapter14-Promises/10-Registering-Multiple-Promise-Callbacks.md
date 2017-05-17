## Registering Multiple Promise Callbacks

Deferred 始终应该有一个 Promise,一个 Promise 应该有任意个回调。我们目前的实现不支持这个：

```js
it('may have multiple callbacks', function() {
  var d = $q.defer();
  var firstSpy = jasmine.createSpy();
  var secondSpy = jasmine.createSpy();
  d.promise.then( rstSpy);
  d.promise.then(secondSpy);
  d.resolve(42);
  $rootScope.$apply();
  expect( rstSpy).toHaveBeenCalledWith(42);
  expect(secondSpy).toHaveBeenCalledWith(42);
});
```
这种方式的作用是，不管一个 digest 什么时候执行，并且 Promise 已经被 resolved，任何未被调用的回调都被调用。每个回调仅仅被调用一次，因为我们已经断言：

```js
it('invokes each callback once', function() {
  var d = $q.defer();
  var  rstSpy = jasmine.createSpy();
  var secondSpy = jasmine.createSpy();
  d.promise.then( rstSpy);
  d.resolve(42);
  $rootScope.$apply();
  expect( rstSpy.calls.count()).toBe(1);
  expect(secondSpy.calls.count()).toBe(0);
  d.promise.then(secondSpy);
  expect( rstSpy.calls.count()).toBe(1);
  expect(secondSpy.calls.count()).toBe(0);
  $rootScope.$apply();
  expect( rstSpy.calls.count()).toBe(1);
  expect(secondSpy.calls.count()).toBe(1);
});
```
为了替代我们目前做的只是存储一个挂起的回调，我们需要支持支持多个挂起回调，所以我们需要一个数组：

```js
Promise.prototype.then = function(onFulfilled) {
  this.$$state.pending = this.$$state.pending || [];
  this.$$state.pending.push(onFulfilled);
  if (this.$$state.status > 0) {
    scheduleProcessQueue(this.$$state);
  }
};
```
然后，当我们进入调用回调，我们需要循环他们：
```js
function processQueue(state) {
_.forEach(state.pending, function(onFulfilled) {
  onFulfilled(state.value);
});
}
```
因此，为了确保每个回调实际上只被调用一次，我们需要清除挂起回调在调用他们的时候。在每次的 digest 中，挂起回调被清除。如果更多的回调被注册后，会重新初始化数组，
```js
function processQueue(state) {
var pending = state.pending;
state.pending = undefined;
_.forEach(pending, function(onFulfilled) {
    onFulfilled(state.value);
  });
}
```