## Ensuring that Callbacks Get Invoked
随着事情的发展，当一个 Deferred 得到 resolved 的时候 Promise 的回调函数被安排执行。这个工作非常伟大，但是我在一种情况下有一个盲点：如果 Promise 回调在一个 Deferred 已经被 resolved 
和 一个 digest 已经运行，这个回调永远不会被调用：
```js
it('resolves a listener added after resolution', function() {
    var d = $q.defer();
    d.resolve(42);
    $rootScope.$apply();
    
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    $rootScope.$apply();
    
    expect(promiseSpy).toHaveBeenCalledWith(42);
});
```
我们需要在回调函数注册的时候去检测 status 标识。如果已经被resolved，我们仅仅应该安排回调调用：
```js
Promise.prototype.then = function(onFulfilled) {
    this.$$state.pending = onFulfilled;
    if (this.$$state.status > 0) {
      scheduleProcessQueue(this.$$state);
    }
};
```