## Cleaning Up At The End: finally
一般说来，同步的`try...catch`规则，你可以添加一个`finally`块总是在最后执行，无论任务成功或失败。Promises有一个相似的结构，通过`Promise`的`finally`方法有效。

这个方法需要一个callback,在里面你可以做任意的清理工作，在你的异步任务结束的时候需要做的。当Promise被resolved的时候调用这个callback，并且不接受任何参数：
```js
it('invokes a finally handler when fulfilled', function() {
  var d = $q.defer();
  
  var finallySpy  = jasmine.createSpy();
  d.promise.finally(finallySpy);
  d.resolve(42);
  $rootScope.$apply();
  
  expect(finallySpy).toHaveBeenCalledWith();
});
```
`finally`块在Promise被rejected的时候也调用：
```js
it('invokes a finally handler when rejected', function() {
  var d = $q.defer();
  
  var finallySpy  = jasmine.createSpy();
  d.promise. nally(finallySpy);
  d.reject('fail');
  $rootScope.$apply();
  
  expect(finallySpy).toHaveBeenCalledWith();
});
```
我们可以实现`finally`在`then`后面，就像我们实现`catch`一样。我们注册一个成功和失败的callback,他们都被委托到最终的Callback。不管发生什么，都会被调用：
```js
Promise.prototype.finally = function(callback) {
  return this.then(function() {
  	callback();
  }, function() {
    callback();
  }); 
};
```
在本章的稍后我们还会返回`finally`去确保与Promises的链式调用衔接的非常好。在去那边之前，让我们先看看真实的Promises链式调用。
