## Resolving A Deferred
现在我们知道如何创建 Deferreds 和 Promises，我们可以讨论存在的真实点，使异步编程变得简单。

当我们有一个 Deferred 和 Promise，我们可以在 Promise 上添加一个回调。然后，Deferred 被 resolved 一个值，Promise 上的回调
可能在未来的某个点上去调用这个值。测试时我们可以添加一个 Jasmine 的间谍方法作为回调：
```js
it('can resolve a promise', function(done) {
  var deferred = $q.defer();
  var promise  = deferred.promise;
  var promiseSpy = jasmine.createSpy();
  promise.then(promiseSpy);
  deferred.resolve('a-ok');
  setTimeout(function() {
    expect(promiseSpy).toHaveBeenCalledWith('a-ok');
    done();
  }, 1); 
});
```
我们回到"在未来某个点"在上下文的意思，但暂时先让我们的第一个测试通过。Promises 在`$$state`属性上存储内部的state:
```js
function Promise() {
  this.$$state = {};
}
```
当一个 Promises 的`then`方法被调用，给定的回调被存储在哪个state里：
```js
function Promise() {
  this.$$state = {};
}
Promise.prototype.then = function(onFulfilled) {
  this.$$state.pending = onFulfilled;
};
```
然后，作为配对 Deferred 被 resolved，我们可以通过 Promise 调用回调：
```js
function Deferred() {
  this.promise = new Promise();
}
Deferred.prototype.resolve = function(value) {
  this.promise.$$state.pending(value);
};
```
这种实现满足我们的测试用例执行，但是为我们所需要的仍然过于简单。一方面，这个版本对于事情完成的顺序要求严格。
当 Deferred 已经被 resolved，注册一个 Promise 回调是完全可以的，并且仍然调用回调：
```js
it('works when resolved before promise listener', function(done) {
  var d = $q.defer();
  d.resolve(42);
  var promiseSpy = jasmine.createSpy();
  d.promise.then(promiseSpy);
  setTimeout(function() {
    expect(promiseSpy).toHaveBeenCalledWith(42);
    done();
  }, 
  0); 
});
```
一般情况，依赖的顺序通过调用 resolve 来实现，Promise 回调不会立刻调用，我们之前提到过。
这就是在我们的第一个测试里面为什么使用 setTimeout。
```js
it('does not resolve promise immediately', function() {
  var d = $q.defer();
  var promiseSpy = jasmine.createSpy();
  d.promise.then(promiseSpy);
  d.resolve(42);
  expect(promiseSpy).not.toHaveBeenCalled();
});
```
所以，如果Promise回调不会立刻调用，那他们什么时候调用？这就是 digest 循环到来的时候。Promise 回调在 Deferred resolved之后的下一次
循环得到调用。 为了测试这个，我们需要在测试文件中引入 Scope，所以我们从injector获取一个：
```js
var $q, $rootScope;
beforeEach(function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  $q = injector.get('$q');
  $rootScope = injector.get('$rootScope');
});
```
现在我们可以测试Promise的回调在digest中被调用：
```js
it('resolves promise at next digest', function() {
  var d = $q.defer();
  var promiseSpy = jasmine.createSpy();
  d.promise.then(promiseSpy);
  d.resolve(42);
  $rootScope.$apply();
  expect(promiseSpy).toHaveBeenCalledWith(42);
});
```
代替在 `Deferred.resolve` 中直接调用 Promise 回调，我们存储 resolved 的值并且调用一个帮助函数，它的作用是延迟调用Promise 回调：
```js
Deferred.prototype.resolve = function(value) {
  this.promise.$$state.value = value;
  scheduleProcessQueue(this.promise.$$state);
};
```
这个帮助函数使用 `$evalAsync` 函数从 root scope 触发digest。回想一下这个函数可以用于添加链接回调函数在下一次 digest 中运行，并且可以在 `setTimeout`后触发一个 digest，如果这个没有被执行。
我们的回调调用了另外一个帮助函数：
```js
function scheduleProcessQueue(state) {
  $rootScope.$evalAsync(function() {
    processQueue(state);
  });
}
```
为了调用`$evalAsync`，我们需要在`$QProvider`中保持一个`$rootScope`，因此我们 inject 它到`$get`方法：
```js
this.$get = ['$rootScope', function($rootScope) {
// ...
}];
```
最后，我们定义一个`processQueue`函数在digest中调用。这里我们调用真正的 promise 回调：
```js
function processQueue(state) {
  state.pending(state.value);
}
```