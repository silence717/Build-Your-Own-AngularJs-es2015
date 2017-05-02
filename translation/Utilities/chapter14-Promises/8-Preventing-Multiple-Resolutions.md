## Preventing Multiple Resolutions
Deferreds 一个重要的功能就是它永远只会resolved一次。如果一个 Deferred 已经被 resolved 为一个值，它不会被 resolved 成另外一个值。
Promise 回调也只会最多被调用一次。如果你试着 resolve 一个 Deferred 两次，调用会被忽略，并且没有回调调用：
```js
it('may only be resolved once', function() {
  var d = $q.defer();
  
  var promiseSpy = jasmine.createSpy();
  d.promise.then(promiseSpy);
  
  d.resolve(42);
  d.resolve(43);
  $rootScope.$apply();
  
  expect(promiseSpy.calls.count()).toEqual(1);
  expect(promiseSpy).toHaveBeenCalledWith(42);
});
```
即使在两次resolve调用之间有一个 digest 也是只被调用一次。Deferred 的 resolve 是持久性的：
```js
it('may only ever be resolved once', function() {
  var d = $q.defer();
  var promiseSpy = jasmine.createSpy();
  d.promise.then(promiseSpy);
  d.resolve(42);
  $rootScope.$apply();
  expect(promiseSpy).toHaveBeenCalledWith(42);
  d.resolve(43);
  $rootScope.$apply();
  expect(promiseSpy.calls.count()).toEqual(1);
});
```
我们通过给 Promise 内部`$$state`对象添加一个`status`标识来控制它。一旦 Deferred 被 resolved，Promises的状态被设置为`1`。
当下一次调用的时候，我们会注意到它被设置，并且直接返回：
```js
Deferred.prototype.resolve = function(value) {
    if (this.promise.$$state.status) {
    return; }
    this.promise.$$state.value = value;
    this.promise.$$state.status = 1;
    scheduleProcessQueue(this.promise.$$state);
};
```