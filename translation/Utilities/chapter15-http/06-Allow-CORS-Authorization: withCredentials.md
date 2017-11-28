## Allow CORS Authorization: withCredentials
使 XMLHttpRequests 在当前页面以外的有一些安全相关限制的调用。这些天，这些限制最常做的事情就是跨域资源共享（CORS）。

大部分需要做CORS并不涉及调用JavaScript代码：它几乎是所有的 Web 服务器之间完成的。但是现在我们可以在`$http`做一件事情让它完全支持CORS。默认情况下，跨域请求不包含
任何cookie或身份验证头。如果这些是必要的，需要在 XMLHttpRequest 设置`withCredentials`标识。

在Angular里面，你可以通过在请求对象上添加`withCredentials`标识去实现：
```js
it('allows setting withCredentials', function() {
	$http({
        method: 'POST',
        url: 'http://teropa.info',
        data: 42,
        withCredentials: true
    });
    expect(requests[0].withCredentials).toBe(true);
});
```
这个标识从`$http`中提取，然后作为调用`$httpBackend`的一个参数：
```js
$httpBackend(
  config.method,
  config.url,
  config.data,
  done,
  config.headers,
  config.withCredentials
);
```
在`$httpBackend`中，如果这个标识为真则设置到XMLHttpRequest：
```js
return function(method, url, post, callback, headers, withCredentials) {
    var xhr = new window.XMLHttpRequest();
    xhr.open(method, url, true);
    _.forEach(headers, function(value, key) {
      xhr.setRequestHeader(key, value);
    });
    if (withCredentials) {
      xhr.withCredentials = true;
    }
    xhr.send(post || null);
    // ...
};
```
这个标识也可以被设置为全局的，使用请求的`defaults`配置：
```js
it('allows setting withCredentials from defaults', function() {
  $http.defaults.withCredentials = true;
  
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 42
  });
  
  expect(requests[0].withCredentials).toBe(true);
});
```
当这个请求配置在`$http`里构建，它的默认值将被使用，但只要如果实际配置的值为`undefined`:
```js
function $http(requestConfig) {
  var deferred = $q.defer();
  var config = _.extend({
    method: 'GET'
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
  if (_.isUndefined(config.withCredentials) &&
    !_.isUndefined(defaults.withCredentials)) {
    config.withCredentials = defaults.withCredentials;
  }
  // ...
}
```