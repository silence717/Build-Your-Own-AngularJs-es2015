## Request Timeouts
有了网络请求，有的会花费时间比较久：服务器可能会花很长时间响应，你可能会遇到服务因为网络故障而没有响应的情况。

浏览器，服务器，和代理一直有超时处理机制，但是你可能想在你的应用程序中控制你准备等待响应的时间。Angular有一些功能能够帮助到这个。

首先，你可以在你的请求配置对象上添加一个`timeout`属性，并且设置一个Promise作为这个属性的值。如果一个Promise的resolve在一个响应接收之前，那么Angular会忽略它。

这是一个非常强大的功能，因为你可以根据应用程序逻辑去控制响应时间：例如，用户可能导航到另一个路由，或者关闭弹框，并且你可以安排一些是使应用程序不再等待那些
永远不会使用的响应。
```js
it('allows aborting a request with a Promise', function() {
  var timeout = $q.defer();
  $http.get('http://teropa.info', {
    timeout: timeout.promise
  });
  $rootScope.$apply();
  
  timeout.resolve();
  $rootScope.$apply();
  
  expect(requests[0].aborted).toBe(true);
});
```
为了这个测试用例，我们需要注入`$q`到这个测试套件：
```js
var $http, $rootScope, $q;
var xhr, requests;
beforeEach(function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  $http = injector.get('$http');
  $rootScope = injector.get('$rootScope');
$q = injector.get('$q');
});
```
timeout管理是在HTTP bankend完成的。我们要做的就是在`$http`中从配置把timeout属性传入：
```js
$httpBackend(
  config.method,
  url,
  reqData,
  done,
  config.headers,
  config.timeout,
  config.withCredentials
);
```
在`$httpBackend`中我们接受这个参数，如果给定的话添加一个Promise处理给它。这个处理会简单的终止正在进行的XMLHttpRequest：
```js
return function (method, url, post, callback, headers, timeout, withCredentials) {
    // 利用原生的 XMLHttpRequest
    const xhr = new window.XMLHttpRequest();
    // 打开一个请求
    xhr.open(method, url, true);
    // 循环headers里面所有的参数
    _.forEach(headers, function (value, key) {
        // 给指定的HTTP请求头赋值
        xhr.setRequestHeader(key, value);
    });
    // 如果标识为真，则可以跨域
    if (withCredentials) {
        xhr.withCredentials = true;
    }
    // 发送请求
    xhr.send(post || null);
    // 监听请求成功事件，触发后执行事件函数
    xhr.onload = function () {
        const response = ('response' in xhr) ? xhr.response : xhr.responseText;
        
        const statusText = xhr.statusText || '';
        callback(xhr.status, response, xhr.getAllResponseHeaders(), statusText);
    };
    // 监听请求失败事件
    xhr.onerror = function () {
        callback(-1, null, '');
    };
    if (timeout) {
      timeout.then(function() {
        xhr.abort();
      });
    }
};
```
除了基于Promise的超时，你也可以提供一个简单的数字作为`timeout`属性的值。Angular会在这些时间过后忽略请求（毫秒）。

我们需要在上一章中使用的Jasimine clock功能，这样问你就可以操作JavaScript的内部clock。添加下面回调调用之前和之后的`$http`测试套件：
```js
beforeEach(function() {
  jasmine.clock().install();
});
afterEach(function() {
  jasmine.clock().uninstall();
});
```
现在我们可以看一下request配置中传递了时间，过了这个时间请求将会被取消：
```js
it('allows aborting a request after a timeout', function() {
  $http.get('http://teropa.info', {
    timeout: 5000
  });
  $rootScope.$apply();
  
  jasmine.clock().tick(5001);
  
  expect(requests[0].aborted).toBe(true);
});
```
在`$httpBackend`里，如果你看到一个数字的timeout，与类似于Promise的timeout相对的，我们将会使用原生的`setTimeout`去中止请求：
```js
if (timeout && timeout.then) {
  timeout.then(function() {
    xhr.abort();
  });
} else if (timeout > 0) {
   setTimeout(function() {
     xhr.abort();
   }, timeout);
}
```
我们也应该确保在取消timeout之前请求已经真正完成。当我们不应该再碰它的时候，我们越不想在XMLHttpRequest中调用`abort`:
```js
return function (method, url, post, callback, headers, timeout, withCredentials) {
    // 利用原生的 XMLHttpRequest
    const xhr = new window.XMLHttpRequest();
    var timeoutId;
    // 打开一个请求
    xhr.open(method, url, true);
    // 循环headers里面所有的参数
    _.forEach(headers, function (value, key) {
        // 给指定的HTTP请求头赋值
        xhr.setRequestHeader(key, value);
    });
    // 如果标识为真，则可以跨域
    if (withCredentials) {
        xhr.withCredentials = true;
    }
    // 发送请求
    xhr.send(post || null);
    // 监听请求成功事件，触发后执行事件函数
    xhr.onload = function () {
    	if (!_.isUndefined(timeoutId)) {
          clearTimeout(timeoutId);
        }
        const response = ('response' in xhr) ? xhr.response : xhr.responseText;
        
        const statusText = xhr.statusText || '';
        callback(xhr.status, response, xhr.getAllResponseHeaders(), statusText);
    };
    // 监听请求失败事件
    xhr.onerror = function () {
    	if (!_.isUndefined(timeoutId)) {
          clearTimeout(timeoutId);
        }
        callback(-1, null, '');
    };
    if (timeout) {
      timeout.then(function() {
        xhr.abort();
      });
    } else if (timeout > 0) {
      timeoutId = setTimeout(function() {
      xhr.abort();
    }, timeout);
  }
};
```