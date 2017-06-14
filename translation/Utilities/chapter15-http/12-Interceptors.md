## Interceptors
本章的前面我们讨论了request和response转换,和允许修改request和response的body，主要达到序列化和反序列化目的。现在我们将注意力转移到另一个特性上，它允许类似的，
通用的处理添加到HTTP的requst和response:Interceptors。

Interceptors 是一个更高级，功能更全面的API，并且真真允许任意执行逻辑连接到HTTP request 和 response 处理。有了拦截器，你可以自由的修改或者替换request和response。
由于拦截器基于Promise，你可以在其中进行异步工作 - 这些有的是不能用transforms实现的。

Interceptors使用工厂函数创建。为了注册一个 interceptors,不需要拼接它的工厂函数到`interceptors`数组通过`$httpProvider`。这意味着 interceptor 注册必须在
config阶段。一旦`$http`服务创建，所有注册的interceptor工厂函数都被调用：
```js
it('allows attaching interceptor factories', function() {
  var interceptorFactorySpy = jasmine.createSpy();
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.interceptors.push(interceptorFactorySpy);
  }]);
  $http = injector.get('$http');
  
  expect(interceptorFactorySpy).toHaveBeenCalled();
});
```
我们将在`$HttpProvider`构造函数中设置这个属猪，并且通过`interceptors`属性将它暴露出去：
```js
function $HttpProvider() {
    var interceptorFactories = this.interceptors = [];
    // ...
}
```
然后，当`$http`本身被创建(当`$httpProvider.$get`被调用)，我们将调用所有的注册工厂，给了所有拦截器一个数组：
```js
this.$get = ['$httpBackend', '$q', '$rootScope', '$injector', function($httpBackend, $q, $rootScope, $injector) {
  var interceptors = _.map(interceptorFactories, function(fn) {
    return fn();
    });
    // ...
}];
```
Interceptor工厂需要与依赖注入系统集成。如果一个工厂函数有参数，这些参数都被注入。工厂也许被包裹在数组风格的依赖注入`[‘a’, ‘b’, function(a, b) { }]`。
现在我们有一个 interceptor 工厂包含一个依赖` $rootScope`：
```js
it('uses DI to instantiate interceptors', function() {
  var interceptorFactorySpy = jasmine.createSpy();
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.interceptors.push(['$rootScope', interceptorFactorySpy]);
  }]);
  $http = injector.get('$http');
  var $rootScope = injector.get('$rootScope');
  expect(interceptorFactorySpy).toHaveBeenCalledWith($rootScope);
});
```
我们将使用 injector 的`invoke`方法实例化所有的 interceptors,代替直接调用工厂函数：
```js
this.$get = ['$httpBackend', '$q', '$rootScope', '$injector', function($httpBackend, $q, $rootScope, $injector) {
  var interceptors = _.map(interceptorFactories, function(fn) {
    return $injector.invoke(fn);
    });
    // ...
}];
```
到目前为止，我们已经直接添加 interceptor 工厂到`$httpProvider.interceptors`数组，但是这里也有另外一种方式去注册一个 interceptor。你可以先注册一个Angular工厂，
然后把他们的名字push到`$httpProvider.interceptors`。这就更容易将interceptor作为一个class组件 - "它仅仅是一个工厂"：
```js
it('allows referencing existing interceptor factories', function() {
  var interceptorFactorySpy = jasmine.createSpy().and.returnValue({});
  var injector = createInjector(['ng', function($provide, $httpProvider) {
    $provide.factory('myInterceptor', interceptorFactorySpy);
    $httpProvider.interceptors.push('myInterceptor');
  }]);
  $http = injector.get('$http');
  expect(interceptorFactorySpy).toHaveBeenCalled();
});
```
在 interceptor 创建时，我们必须检测这个 interceptor 是否已经作为一个字符串或者函数被注册。如果是一个字符串，我们可以使用`$injector.get`响应的
interceptor去获取，如果是一个函数我们仅仅只需要调用它像以前一样：
```js
var interceptors = _.map(interceptorFactories, function(fn) {
  return _.isString(fn) ? $injector.get(fn) :
                        $injector.invoke(fn);
});
```
现在我们知道了 interceptor 是如何注册的，我们可以开始讨论他们实际上是什么，以及他们是如何集成到`$http`请求中的。

interceptor 大量使用Promise。他们添加`$http`程序逻辑作为Promise处理，并且他们返回Promise。我们已经在`$http`中集成了 Promise，但是在把 interceptor 
集成之前，我们需要充足一些东西。

首先，现在`$http`函数中的一些代码需要在任何 interceptors 之前运行，还有一些在后面。在 interceptors 之后运行的部分需要在一个Promise的callback去运行，
但是我先把它抽取到一个新函数，我们叫作`serverRequest`。此时没有添加新的行为 - 代码只是从一个函数到另一个。我们在创建`config`对象之后和 headers 添加之后进行分区：
```js
function serverRequest(config) {
    // 配置是否可以跨域请求
    if (_.isUndefined(config.withCredentials) && !_.isUndefined(defaults.withCredentials)) {
        config.withCredentials = defaults.withCredentials;
    }
    
    const reqData = transformData(
        config.data,
        headersGetter(config.headers),
        undefined,
        config.transformRequest
    );
    
    // 如果data数据为空，为了不造成误导，那么删除content-type
    if (_.isUndefined(reqData)) {
        _.forEach(config.headers, (v, k) => {
            if (k.toLowerCase() === 'content-type') {
                delete config.headers[k];
            }
        });
    }
    // 转换响应数据
    function transformResponse(response) {
        // 如果data存在处理数据
        if (response.data) {
            response.data = transformData(
                response.data,
                response.headers,
                response.status,
                config.transformResponse);
        }
        // 如果请求成功返回response，失败再次reject
        if (isSuccess(response.status)) {
            return response;
        } else {
            return $q.reject(response);
        }
    }
    return sendReq(config, reqData).then(transformResponse, transformResponse);
}
function $http(requestConfig) {
    
    // 配置默认值
    const config = _.extend({
        method: 'GET',
        transformRequest: defaults.transformRequest,
        transformResponse: defaults.transformResponse,
        paramSerializer: defaults.paramSerializer
    }, requestConfig);
    
    if (_.isString(config.paramSerializer)) {
        config.paramSerializer = $injector.get(config.paramSerializer);
    }
    config.headers = mergeHeaders(requestConfig);
    return serverRequest(config);
}
```
下一步，我们调整一下创建`$http`Promise的方式。之前我们只是`sendReq`创建Promise在最后返回，但是现在我们在`$http`函数从`config`对象创建一个，然后作为*Promise handler*
去调用`serverRequest`。这也没有改变`$http`的行为，但是会使添加 interceptors 变得容易，我们将立即执行:
```js
function $http(requestConfig) {
    
    // 配置默认值
    const config = _.extend({
        method: 'GET',
        transformRequest: defaults.transformRequest,
        transformResponse: defaults.transformResponse,
        paramSerializer: defaults.paramSerializer
    }, requestConfig);
    
    if (_.isString(config.paramSerializer)) {
        config.paramSerializer = $injector.get(config.paramSerializer);
    }
    config.headers = mergeHeaders(requestConfig);
    const promise = $q.when(config);
    return promise.then(serverRequest);
}
```
虽然我们没有真正改变`$http`的行为，但是你可能已经注意到这种改变破坏了大量的测试。这是因为我们正在执行request，在`$http`后调用了下一个 digest 才去发送。
原因是`serverRequest`在Promise的回调中调用，而Promise的回调只有在 digest 中执行。

这个确实在Angular里面发生，但是这确实意味着我们需要对测试做出变更。基本上，在每个`$http`的测试，我们需要在调用`$http()`服务之后去调用`$rootScope.$apply()`，
我们会保证任何request测试。

为了调用`$apply`我们首先要在测试设置中去获取一个`$rootScope`:
```js
var $http, $rootScope;
var xhr, requests;

beforeEach(function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  $http = injector.get('$http');
  $rootScope = injector.get('$rootScope');
});
```
然后我们需要在每个`$http`的调用后面添加一个`$rootScope.$apply()`调用。下面是需要测试的第一个用例：
```js
it('makes an XMLHttpRequest to given URL', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 'hello'
  });
  $rootScope.$apply();
  expect(requests.length).toBe(1);
  expect(requests[0].method).toBe('POST');
  expect(requests[0].url).toBe('http://teropa.info');
  expect(requests[0].async).toBe(true);
  expect(requests[0].requestBody).toBe('hello');
});
```
继续给`http_spec.js`中重复这个代码。请注意，某些测试用例使用自己的injector，因此对于他们我们需要从injector获取`$rootScope`。否则我们会调用一个无关的`$rootScope`:
```js
it('exposes default headers through provider', function() {
    var injector = createInjector(['ng', function($httpProvider) {
      $httpProvider.defaults.headers.post['Content-Type'] =
        'text/plain;charset=utf-8';
      }]);
    $http = injector.get('$http');
    $rootScope = injector.get('$rootScope');
    $http({
      method: 'POST',
      url: 'http://teropa.info',
      data: '42'
    });
    $rootScope.$apply();
    expect(requests.length).toBe(1);
      expect(requests[0].requestHeaders['Content-Type']).toBe(
        'text/plain;charset=utf-8');
});
// ...
it('allows substituting param serializer through DI', function() {
  var injector = createInjector(['ng', function($provide) {
    $provide.factory('mySpecialSerializer', function() {
      return function(params) {
        return _.map(params, function(v, k) {
          return k + '=' + v + 'lol';
        }).join('&');
      };
    }); 
  }]);
    injector.invoke(function($http, $rootScope) {
    $http({
      url: 'http://teropa.info',
      params: {
    a: 42,
    b: 43 },
      paramSerializer: 'mySpecialSerializer'
    });
    $rootScope.$apply();
    expect(requests[0].url)
      .toEqual('http://teropa.info?a=42lol&b=43lol');
  });
});
```
最后，我们准备继续执行 interceptor 实现！

interceptors是对象，它包含四个key值的一个或多个：`request`，`requestErroe`，`response`，和`responseError`。这些key的value都是函数，在HTTP request
的过程中不同点上调用。

第一个key我们看一下`request`。如果一个 interceptor 定义一个`request`方法，它将会在一个请求被发送出去前调用，并且它期望返回一个改变后的request。这意味着
它可以在发生之前转换或替换request - 类似于transform做的：
```js
it('allows intercepting requests', function () {
    var injector = createInjector(['ng', function ($httpProvider) {
        $httpProvider.interceptors.push(function () {
            return {
                request: function (config) {
                    config.params.intercepted = true;
                        return config;
                }
            };
        });
    }]);
    $http = injector.get('$http');
    $rootScope = injector.get('$rootScope');
    
    $http.get('http://teropa.info', {params: {}});
    $rootScope.$apply();
    expect(requests[0].url).toBe('http://teropa.info?intercepted=true');
});
```
这个 interceptor 函数可能为改变后的 request 返回一个Promise，这意味着它所做的任何事情都可以异步执行。这一功能是的 interceptor 比 transform 强大很多：
```js
it('allows returning promises from request intercepts', function() {
    var injector = createInjector(['ng', function($httpProvider) {
        $httpProvider.interceptors.push(function($q) {
            return {
                request: function(config) {
                    config.params.intercepted = true;
                    return $q.when(config);
                }
            };
        });
    }]);
    $http = injector.get('$http');
    $rootScope = injector.get('$rootScope');
    
    $http.get('http://teropa.info', {params: {}});
    $rootScope.$apply();
    expect(requests[0].url).toBe('http://teropa.info?intercepted=true');
});
```
通过我们现在在`$http`中设置东西的方法，集成request interceptors非常简单。每一个都是Promise handle链中的另一个link，实际发送请求是最后一个link:
```js
var promise = $q.when(config);
_.forEach(interceptors, function(interceptor) {
  promise = promise.then(interceptor.request);
});
return promise.then(serverRequest);
```
response 拦截器和request非常相似 - 它们的参数是response而不是request。它们可以修改或替换response，它们的返回值将被用作进一步的拦截器（最后是应用程序代码）：
```js
it('allows intercepting responses', function() {
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.interceptors.push(_.constant({
      response: function(response) {
        response.intercepted = true;
        return response;
      }
    })); 
  }]);
  $http = injector.get('$http');
  $rootScope = injector.get('$rootScope');
  
  var response;
  $http.get('http://teropa.info').then(function(r) {
    response = r;
  });
  $rootScope.$apply();
  
  requests[0].respond(200, {}, 'Hello');
  expect(response.intercepted).toBe(true);
});
```
我们可以给response添加拦截器，通过继续在 promise 链`serverRequest`回调之后添加。另一个与request拦截器不同的是*倒序*遍历拦截器，最后一个注册的拦截器第一个被调用。
如果你思考一下request-response周期：当我们处理response时，我们将返回拦截器链。
```js
var promise = $q.when(config);
_.forEach(interceptors, function(interceptor) {
  promise = promise.then(interceptor.request);
});
promise = promise.then(serverRequest);
_.forEachRight(interceptors, function(interceptor) {
  promise = promise.then(interceptor.response);
});
return promise;
```
（此处有一个图略。。。）
通过拦截器支持的最后两个方法与错误处理相关。`requestError`发放在request被真正发送之前出错的时候调用，也就是说，在这之前有一个拦截器出错：
```js
it('allows intercepting request errors', function() {
  var requestErrorSpy = jasmine.createSpy();
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.interceptors.push(_.constant({
      request: function(config) {
        throw 'fail';
      }
    }));
    $httpProvider.interceptors.push(_.constant({
      requestError: requestErrorSpy
    }));
  }]);
  
  $http = injector.get('$http');
  $rootScope = injector.get('$rootScope');
  
  $http.get('http://teropa.info');
  $rootScope.$apply();
  
  expect(requests.length).toBe(0);
  expect(requestErrorSpy).toHaveBeenCalledWith('fail');
});
```
我们可以在集成`requestError`拦截器的同时去集成`request`拦截器。`requestError`函数添加到Promise的失败回调：
```js
var promise = $q.when(config);
_.forEach(interceptors, function(interceptor) {
  promise = promise.then(interceptor.request, interceptor.requestError);
});
promise = promise.then(serverRequest);
_.forEachRight(interceptors, function(interceptor) {
  promise = promise.then(interceptor.response);
});
return promise;
```
response 错误拦截器在 HTTP 响应后有了以后发生错误的时候捕获。就像`response`拦截器，它也会倒序调用，因此它们实际接收错误从真正的 HTTP response，
或者从前面注册的 response 拦截器接收：
```js
it('allows intercepting response errors', function() {
  var responseErrorSpy = jasmine.createSpy();
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.interceptors.push(_.constant({
      responseError: responseErrorSpy
    }));
    $httpProvider.interceptors.push(_.constant({
      response: function() {
        throw 'fail';
      }
    })); 
  }]);
  $http = injector.get('$http');
  $rootScope = injector.get('$rootScope');
  
  $http.get('http://teropa.info');
  $rootScope.$apply();
  
  requests[0].respond(200, {}, 'Hello');
  $rootScope.$apply();
  
  expect(responseErrorSpy).toHaveBeenCalledWith('fail');
});
```
注册`responseError`拦截器和注册`requestError`拦截器是完全对称的：当`response`拦截器注册的时候同时它们添加一个失败的回调：
```js
var promise = $q.when(config);
_.forEach(interceptors, function(interceptor) {
  promise = promise.then(interceptor.request, interceptor.requestError);
});
promise = promise.then(serverRequest);
_.forEachRight(interceptors, function(interceptor) {
  promise = promise.then(interceptor.response, interceptor.responseError);
});
return promise;
```
这里我们对 interceptors 有了一个完整的实现。它们有很多的功能，但是有效地使用他们需要对`$http`的Promise链有一个好的了解。我们现在清楚了。