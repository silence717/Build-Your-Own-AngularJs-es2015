## Promise Extensions
作为一个`$http`的用户，你可能已经注意到，Promise返回的一些方法在上一章我们没有实现。这些方法是`success`和`error`，事实上这些方法仅仅存在于从`$http`获取的Promise。

这些扩展的目的是为了使 HTTP 响应更容易一些。使用一个正常的`then`或者`catch`处理，你可以把全部响应对象当作一个参数得到。`success`将响应为4个独立未打包的参数：
响应数据,状态码，headers，和原始的请求配置：
```js
it('allows attaching success handlers', function() {
  var data, status, headers, config;
  $http.get('http://teropa.info').success(function(d, s, h, c) {
    data = d;
    status = s;
    headers = h;
    config = c;
  });
  $rootScope.$apply();
  
  requests[0].respond(200, {'Cache-Control': 'no-cache'}, 'Hello');
  $rootScope.$apply();
  
  expect(data).toBe('Hello');
  expect(status).toBe(200);
  expect(headers('Cache-Control')).toBe('no-cache');
  expect(config.method).toBe('GET');
});
```
虽然这不是一个非常重要的功能，但很方便，特别是如果你关心的是相应体 - 你只需要声明一个参数的`success`处理，并且不用关心响应对象的格式。

一个完全相同的扩展也用于错误响应。这是`error`处理：
```js
it('allows attaching error handlers', function() {
  var data, status, headers, config;
  $http.get('http://teropa.info').error(function(d, s, h, c) {
    data = d;
    status = s;
    headers = h;
    config = c;
  });
  $rootScope.$apply();
  
  requests[0].respond(401, {'Cache-Control': 'no-cache'}, 'Fail');
  $rootScope.$apply();
  
  expect(data).toBe('Fail');
  expect(status).toBe(401);
  expect(headers('Cache-Control')).toBe('no-cache');
  expect(config.method).toBe('GET');
});
```
这两个扩展添加到最终的`Promise`对象，在所有的拦截器使用后我们得到这个对象。他们每个都添加一个正常的`then`或者`catch`处理到promise，
并且包含一个未打包的response到分离的参数，在我们的测试用例中可看到：
```js
var promise = $q.when(config);
_.forEach(interceptors, function(interceptor) {
  promise = promise.then(interceptor.request, interceptor.requestError);
});
promise = promise.then(serverRequest);
_.forEachRight(interceptors, function(interceptor) {
  promise = promise.then(interceptor.response, interceptor.responseError);
});
promise.success = function(fn) {
  promise.then(function(response) {
    fn(response.data, response.status, response.headers, config);
    });
  return promise;
};
promise.error = function(fn) {
  promise.catch(function(response) {
    fn(response.data, response.status, response.headers, config);
  });
  return promise;
};
return promise;
```