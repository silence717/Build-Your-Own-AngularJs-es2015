## Sending HTTP Requests
随着provider是的方式，我们可以开始思考`$http`实际上应该做什么。HTTP的核心是对远程服务器发送请求，并且返回响应。因此让我们把这个作为这部分的目标。

首先，`$http`服务应该是一个函数我们可以调用请求。我们为它添加一个测试用例，在一个新的测试文件`http_spec.js`:
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('$http', function() {
var $http;
  beforeEach(function() {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $http = injector.get('$http');
  });
  it('is a function', function() {
    expect($http instanceof Function).toBe(true);
  }); 
});
```
`$http`函数应该发出一个HTTP请求，并且返回一个response。但是由于HTTP请求都是一步的，函数不能立刻返回一个response。它需要返回一个Promise代替response：
```js
it('returns a Promise', function() {
  var result = $http({});
  expect(result).toBeDefined();
  expect(result.then).toBeDefined();
});
```
我们使这两个测试通过，仅仅只需要`$httpProvider.$get`返回一个函数，创建一个Deferred并返回它的Promise。我们需要注入`$q`去达到目的：
```js
this.$get = ['$httpBackend', '$q', function($httpBackend, $q) {
    return function $http() {
      var deferred = $q.defer();
      return deferred.promise;
    };
}];
```
这就是`$http`服务接收一个请求并最终返回响应，但这中间会发生什么？我们应该只做实际的的HTTP请求，为此我们要使用标准的所有浏览器都支持的`XMLHttpRequest`对象。

我们也希望单元测试这所有，但我们不想做任何实际的网络请求从我们的单元测试，因为这需要一个服务器，这里我们在第0章安装的`SinonJs`库是很方便的。Sinon模拟一个假的XMLHttpRequest
实现这可以暂时的代替浏览器内置的 XMLHttpRequest。它可以用来内现发出什么样的请求，并且返回假的response而从来不离开浏览器的JavaScript运行环境。

为了Sinon的假 XMLHttpRequest 可用，我们需要在`beforeEach`函数中设置它，然后在`afterEach`函数中移除它以便于在每个测试后我们有一个干净的环境：
```js
'use strict';
var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('$http', function() {
    var $http;
    var xhr;
    beforeEach(function() {
      publishExternalAPI();
      var injector = createInjector(['ng']);
        $http = injector.get('$http');
      });
      beforeEach(function() {
        xhr = sinon.useFakeXMLHttpRequest();
      });
      afterEach(function() {
        xhr.restore();
      });
      // ...
});
```
这使得我们检查自己发送的请求更加容易。对于每个请求发送，Sinon都会调用假XHR的`onCreate`函数。如果我们为`onCreate`添加一个函数收集所有的请求到一个数组：
```js
describe('$http', function() {
    var $http;
    var xhr, requests;
    beforeEach(function() {
      publishExternalAPI();
      var injector = createInjector(['ng']);
      $http = injector.get('$http');
    });
    beforeEach(function() {
        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = function(req) {
          requests.push(req);
        };
    });
    afterEach(function() {
      xhr.restore();
    });
    // ...
});
```
现在我们准备好了发送请求的第一个测试。如果我们使用一个对象调用`$http`说"发送一个POST请求，data是`hello`到http://teropa.info",我们可以检查与这些参数与异步XMLHttpRequest是一样的：
```js
it('makes an XMLHttpRequest to given URL', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 'hello'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].method).toBe('POST');
  expect(requests[0].url).toBe('http://teropa.info');
  expect(requests[0].async).toBe(true);
  expect(requests[0].requestBody).toBe('hello');
});
```
就像之前讨论的，`$http`将网络通信真正的任务代理到`$httpBackend`服务，因此这是 XMLHttpRequest 真正创建的地方。我们假设`$httpBackend`是一个函数，并且使用一个method,
URL,data从请求配置中解压的参数：
```js
return function $http(config) {
    var deferred = $q.defer();
    $httpBackend(config.method, config.url, config.data);
    return deferred.promise;
};
```
在`$httpBackend`中新增可创建一个标准的 XMLHttpRequest，使用给定的参数open，并且发送数据：
```js
this.$get = function() {
    return function(method, url, post) {
      var xhr = new window.XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.send(post || null);
    };
};
```
`xhr.open`的三个参数都是HTTP方法需要，URL发送地址，并且标记是否为异步请求（AngularJS中一直都是）。

`xhr.open`的一个参数data是需要发送的数据。不是所有的请求都有data，当没有任何值的时候我们发送的是一个`null`值。

这符合我们当前的测试套件，但我们还缺少关键的一步：Promise的返回的值并不是都被resolve，因为我们没有连接到任何的 XMLHttpRequest。这个Promise应该使用一个response对象来resolve，
给用户HTTP响应的状态和数据，像原始的请求配置一样：
```js
it('resolves promise when XHR result received', function() {
  var requestConfig = {
    method: 'GET',
    url: 'http://teropa.info'
  };
  var response;
  $http(requestConfig).then(function(r) {
    response = r;
  });
  requests[0].respond(200, {}, 'Hello');
  expect(response).toBeDefined();
  expect(response.status).toBe(200);
  expect(response.statusText).toBe('OK');
  expect(response.data).toBe('Hello');
  expect(response.config.url).toEqual('http://teropa.info');
});
```
在测试中我们可以使用Sinon的`respond`方法来响应一个假 XMLHttpRequest。`respond`的三个参数是HTTP状态码，HTTP响应头，还有响应体。

这是`$http`和`$httpBackend`之间的工作方式不需要任何Deferred和Promises。相反，它接收一个传统的回调函数。它在 XMLHttpRequest 上添加一个`onload`处理器，当被
触发的时候调用回调：
```js
this.$get = function() {
    return function(method, url, post, callback) {
        var xhr = new window.XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.send(post || null);
        xhr.onload = function() {
          var response = ('response' in xhr) ? xhr.response :
                                               xhr.responseText;
          var statusText = xhr.statusText || '';
          callback(xhr.status, response, statusText);
        };
    }; 
};
```
在`onload`里，我们试图从`xhr.response`得到响应体，其次获取`xhr.responseText`。有的浏览器支持一个，有的支持另一个，所以我们都要尝试。我们也从响应获取数字和文本状态，
然后将所有东西传递到回调函数。

在`$http`的后面我们将这些全部绑在一起。我们需要构造回调，我们将它叫做`done`。当它被调用的时候，它解决了之前构造的Promise。resolution的值是response对象 - 一个对象
包含所有response的所有信息：
```js
return function $http(config) {
    var deferred = $q.defer();
    function done(status, response, statusText) {
      deferred.resolve({
        status: status,
        data: response,
        statusText: statusText,
        config: config
      }); 
    }
    $httpBackend(config.method, config.url, config.data, done);
    return deferred.promise;
};
```
对于我们目前的测试而言，这是不够的。问题关联到Promise的resolution:你可以会议一下上一章，当一个Promise被resolved，callback没有被立即执行，在下一次的digest中执行。

在`$http`中如果没有脏检查，我们应该开始digest。我们可以使用`$rootScope`的`$apply`函数：
```js
this.$get = ['$httpBackend', '$q', '$rootScope',
  function($httpBackend, $q, $rootScope) {
    return function $http(config) {
      var deferred = $q.defer();
      function done(status, response, statusText) {
        deferred.resolve({
          status: status,
          data: response,
          statusText: statusText,
          config: config
        });
        if (!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      }
    $httpBackend(config.method, config.url, config.data, done);
    return deferred.promise;
  }; 
}];
```
现在测试通过了！

这是在Angular中的Ajax使用`$http`好的一个原因：你不需要考虑调用`$apply`因为框架会为你做。

另外一个原因是当出现错误的时候你知道发生了什么，使用HTTP请求，当出现错误的时候这是经常的事情。服务器会返回HTTP表明失败的状态，或者根本没有响应。这种情况下，我们在Promises中
内置的错误管理就非常有用。我们仅仅只需要reject Promise而不是resolve。这是一种情况，例如，当一个服务返回`401`：
```js
it('rejects promise when XHR result received with error status', function() {
  var requestConfig = {
    method: 'GET',
    url: 'http://teropa.info'
  };
  
  var response;
  $http(requestConfig).catch(function(r) {
    response = r;
  });
  
  requests[0].respond(401, {}, 'Fail');
  
  expect(response).toBeDefined();
  expect(response.status).toBe(401);
  expect(response.statusText).toBe('Unauthorized');
  expect(response.data).toBe('Fail');
  expect(response.config.url).toEqual('http://teropa.info');
});
```
Promise处理的数据和成功的响应是一样的：response对象。唯一的区别就是handle被调用：then 或者 catch。

我们根据状态码动态的选择调用 Deferred 的哪个方法：
```js
function done(status, response, statusText) {
    deferred[isSuccess(status) ? 'resolve' : 'reject']({
        status: status,
        data: response,
        statusText: statusText,
        config: config
    });
    if (!$rootScope.$$phase) {
       $rootScope.$apply();
    }
}
```
新帮助方法`isSuccess`在这里被用作，当状态吗在200和299直接的时候返回`true`，其他的返回`false`：
```js
function isSuccess(status) {
  return status >= 200 && status < 300;
}
```
一个`$http`的Promise被reject的另一个原因是如果请求完全失败，那么没有任何响应。这个的发生有很多种原因：可能是网络挂掉了，可能存在资源的跨域共享问题，或者请求被明确终止。
```js
it('rejects promise when XHR result errors/aborts', function() {
  var requestConfig = {
    method: 'GET',
    url: 'http://teropa.info'
  };
  var response;
  $http(requestConfig).catch(function(r) {
    response = r;
  });
  requests[0].onerror();
  expect(response).toBeDefined();
  expect(response.status).toBe(0);
  expect(response.data).toBe(null);
  expect(response.config.url).toEqual('http://teropa.info');
});
```
在这种情况下，我们期望响应的状态码是0，响应的data是`null`。

在`$httpBackend`里面需要添加一个`onerror`处理来自于原生的 XMLHttpRequest 的错误处理。当它被调用，我们调用回调使用状态码`-1`，`null`响应，和空状态文本：
```js
return function(method, url, post, callback) {
  var xhr = new window.XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.send(post || null);
  xhr.onload = function() {
    var response = ('response' in xhr) ? xhr.response :
                                         xhr.responseText;
    var statusText = xhr.statusText || '';
    callback(xhr.status, response, statusText);
  };
  xhr.onerror = function() {
    callback(-1, null, '');
  };
};
```
所有要在`$http`中做的就是状态码"标准化"。在错误的响应中，`$httpBackend`可能会返回负状态码，但是`$http`永远不会将任何请求resolve小于`0`:
```js
function done(status, response, statusText) {
  status = Math.max(status, 0);
  deferred[isSuccess(status) ? 'resolve' : 'reject']({
    status: status,
    data: response,
    statusText: statusText,
    config: config
  });
  if (!$rootScope.$$phase) {
    $rootScope.$apply();
  }
}
```