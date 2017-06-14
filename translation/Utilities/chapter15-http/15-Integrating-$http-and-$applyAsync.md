## Integrating $http and $applyAsync
我们通过讨论一个有用的优化去总结这章对`$http`的支持。

回到本书的第一部分，我们已经实现了Scopes,我们讨论了`$applyAsync`功能在Angular1.3已经完成。它本质上是允许一个函数不应理解执行，但在"一点点"的时间过后执行。
这个想法是你可以限制在连续的成功里面去触发digest的次数，推迟他们并且可能结合他们：如果多个`$applyAsync`都是在相同的几毫秒去调用，他们将会被在同一digest调用。

`$applyAsync`最原始的目的是与`$http`一起使用。这是很常见的，尤其是当一个应用启动的时候，同事会向服务器发送多个HTTP请求，获取不同的资源。如果服务器是快的，很可能
这些请求的响应也很快达到。当这种情况发生时，Angular将为每个response开始一个新的digest，因为`$http`就是这样工作的。

我们可以把优化应用在这里，从HTTP请求响应拿到结果的时候使用`$applyAsync`去开始digest。然后，如果几个request到达的很接近，他们的变化将在一个digest种发生。
根据应用程序的不同，这将在应用程序生命周期的关键点上显著地节省时间 - 尤其是第一次加载的时候。

`$applyAsync`优化不是默认启用的。你必须在配置阶段在`$httpProvider`调用`useApplyAsync(true)`去启用它。我们将在测试用例的`beforeEach`块去做：
```js
describe('useApplyAsync', function() {
  beforeEach(function() {
    var injector = createInjector(['ng', function($httpProvider) {
      $httpProvider.useApplyAsync(true);
    }]);
    $http = injector.get('$http');
    $rootScope = injector.get('$rootScope');
  });
});
```
当这个优化启用，当一个response回来的时候response处理程序不会立刻执行。这与我们之前看到的是相反的：
```js
it('does not resolve promise immediately when enabled', function() {
  var resolvedSpy = jasmine.createSpy();
  $http.get('http://teropa.info').then(resolvedSpy);
  $rootScope.$apply();
  
  requests[0].respond(200, {}, 'OK');
  expect(resolvedSpy).not.toHaveBeenCalled();
});
```
取而代之的是在一些时间过后我们将调用response处理程序：
```js
it('resolves promise later when enabled', function() {
  var resolvedSpy = jasmine.createSpy();
  $http.get('http://teropa.info').then(resolvedSpy);
  $rootScope.$apply();
  
  requests[0].respond(200, {}, 'OK');
  jasmine.clock().tick(100);
  
  expect(resolvedSpy).toHaveBeenCalled();
});
```
在`$httpProvider`我们设置`useApplyAsync`方法，和一个内部的`useApplyAsync`布尔标识。这个方法可以使用两种方式调用：当有参数调用的时候设置这个标识，
和没有参数调用，它返回当前标识的值：
```js
function $HttpProvider() {
	var interceptorFactories = this.interceptors = [];
	
    var useApplyAsync = false;
    this.useApplyAsync = function(value) {
      if (_.isUndefined(value)) {
        return useApplyAsync;
      } else {
        useApplyAsync = !!value;
        return this;
      }
    };
    // ...
}
```
在我们的`done`处理程序里面，现在抽离出Promise的resolve到一个叫作`resolvePromise`的帮助函数。根据`useApplyAsync`标识的状态我们将立即调用函数（通过紧跟着的`$rootScope.$apply()`）
或者晚点调用`$rootScope.$applyAsync()`:
```js
function done(status, response, headersString, statusText) {
  status = Math.max(status, 0);
  function resolvePromise() {
    deferred[isSuccess(status) ? 'resolve' : 'reject']({
      status: status,
      data: response,
      statusText: statusText,
      headers: headersGetter(headersString),
      config: config
    });
  }
  if (useApplyAsync) {
      $rootScope.$applyAsync(resolvePromise);
  } else {
    resolvePromise();
    if (!$rootScope.$$phase) {
        $rootScope.$apply();
    }
  }
}  
```
