## Request Headers
当发送HTTP请求到服务器，重要的是一定要有添加headers的能力。头部包含服务器需要知道的各种信息，像鉴权验证，内容类型，和HTTP缓存控制。

`$http`服务完全支持HTTP头，通过`headers`对象你可以添加请求配置对象：
```js
it('sets headers on request', function() {
  $http({
    url: 'http://teropa.info',
    headers: {
      'Accept': 'text/plain',
      'Cache-Control': 'no-cache'
    }
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders.Accept).toBe('text/plain');
  expect(requests[0].requestHeaders['Cache-Control']).toBe('no-cache');
});
```
`$httpBackend`服务在这里会做大多数工作。通过`headers`对象你可以添加request配置对象：
```js
return function $http(requestConfig) {
  // ...
  $httpBackend(
    config.method,
    config.url,
    config.data,
    done,
    config.headers
  );
  return deferred.promise;
};
```
`$httpBackend`做的是拿到所有headers给它的参数，并且在 XMLHttpRequest 设置他们，使用它的`setRequestHeader()`方法：
```js
var _ = require('lodash');
function $HttpBackendProvider() {
  this.$get = function() {
    return function(method, url, post, callback, headers) {
    var xhr = new window.XMLHttpRequest();
    xhr.open(method, url, true);
    _.forEach(headers, function(value, key) {
      xhr.setRequestHeader(key, value);
    });
    xhr.send(post || null);
    // ...
    }; 
  };
}
module.exports = $HttpBackendProvider;
```
这里有一些默认的头被设置，即使从请求的配置对象漏掉的。最重要的是，接受头默认设置一个值，告诉我们希望是JSON相应还是纯文本响应：
```js
it('sets default headers on request', function() {
  $http({
    url: 'http://teropa.info'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders.Accept).toBe(
    'application/json, text/plain, */*');
});
```
我们存储这些默认headers到一个叫做`defaults`的变量，在`$HttpBackendProvider`的构造函数里面设置。变量指向一个具有`headers`key的对象。在里面我们有一个
嵌套的key叫做`common`，存储HTTP方法中常见的所有头。Accept就是其中一个：
```js
function $HttpProvider() {
    var defaults = {
      headers: {
        common: {
          Accept: 'application/json, text/plain, */*'
        }
      } 
    };
// ...
}
```
我们需要将这些默认值与请求配置对象中实际给出的任意headers合并。我们将会在一个叫作`mergeHeaders`的心帮助方法做这个：
```js
return function $http(requestConfig) {
  var deferred = $q.defer();
  
  var config = _.extend({
  method: 'GET'
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
  // ...
};  
```
现在，这个函数仅仅创建一个新对象，它从默认对象中注入所有常见的默认头，然后在请求配置对象中给出所有的头文件：
```js
function mergeHeaders(config) {
  return _.extend(
    {},
    defaults.headers.common,
    config.headers
  ); 
}
```
不是所有的默认头在HTTP方法中都是通用的。POST，例如，需要有一个默认的Content-Type头，设置一个JSON内容类型，而GET方法不应该。这是因为GET请求没有一个body，
所以设置它们的内容类型是不合适的。
```js
it('sets method-specific default headers on request', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: '42'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders['Content-Type']).toBe(
    'application/json;charset=utf-8');
});
```
`defaults`变量也包含这些特殊方法的默认值。我们设置为标准的HTTP方法设置JSON `Content-Type`header，包含body:POST,PUT和PATCH：
```js
var defaults = {
  headers: {
    common: {
      Accept: 'application/json, text/plain, */*'
    },
    post: {
      'Content-Type': 'application/json;charset=utf-8'
    }, put: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    patch: {
      'Content-Type': 'application/json;charset=utf-8'
    }
  } 
};
```
我们现在可以扩展`mergeHeaders`也去包含这些特殊方法的默认头：
```js
function mergeHeaders(config) {
  return _.extend(
    {},
    defaults.headers.common,
    defaults.headers[(config.method || 'get').toLowerCase()],
    config.headers
  );
}
```
默认头的另一面是作为一个程序开发者，不可以改变他们，`$http`服务通过`defaults`属性暴露，我们只能对该属性中的对象进行更改去设置应用的全局默认值：
```js
it('exposes default headers for overriding', function() {
  $http.defaults.headers.post['Content-Type'] = 'text/plain;charset=utf-8';
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: '42'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders['Content-Type']).toBe(
    'text/plain;charset=utf-8');
});
```
我们可以将这个属性添加到`$http`函数，但是要做到这一点，我们还需要重新组织我们的代码，使`$http`函数声明与return语句分离：
```js
function $http(requestConfig) {
	//...
}
$http.defaults = defaults;
return $http;
```
headers不仅仅在`$http`运行时刻有效，并且在`$httpProvider`的配置时间有效。我们可以通过使用通常的函数模块去创建另外一个injector来测试它：
```js
it('exposes default headers through provider', function() {
  var injector = createInjector(['ng', function($httpProvider) {
    $httpProvider.defaults.headers.post['Content-Type'] =
      'text/plain;charset=utf-8';
  }]);
  $http = injector.get('$http');
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: '42'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders['Content-Type']).toBe(
    'text/plain;charset=utf-8');
});
```
我们可以通过简单的添加默认给`this`就像我们一开始在`$HttpProvider`构造函数里面引入他们一样来满足需求：
```js
function $HttpProvider() {
    var defaults = this.defaults = {
      // ...
    };
  // ...
}
```
如果你非常熟悉HTTP headers 如何工作，你也知道他们的名字是忽略大小写的：`Content-Type`和`content-type`是可以交换的。目前我们采用的合并默认请求头的方式与此不一致：
我可能永远相同的头很多次，不同的大小写。我们应该采用不区分大小写的方式去合并头，这样就不会发生这种情况：
```js
it('merges default headers case-insensitively', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: '42',
    headers: {
      'content-type': 'text/plain;charset=utf-8'
    }
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders['content-type']).toBe(
    'text/plain;charset=utf-8');
  expect(requests[0].requestHeaders['Content-Type']).toBeUndefined();
});
```
这意味着我们需要改变`mergeHeaders`函数工作。首先我们将东西分为两个对象：一个队所有headers调用`reqHeaders`组成请求配置对象，另外一个调用`defHeaders`为所有默认headers - 
不管是通用还是特殊的HTTP方法：
```js
function mergeHeaders(config) {
    var reqHeaders = _.extend(
      {},
      config.headers
    );
    var defHeaders = _.extend(
      {},
      defaults.headers.common,
      defaults.headers[(config.method || 'get').toLowerCase()]
    );
}
```
现在我们需要组合这两个对象。我们将`reqHeaders`作为一个开始点，并且从`defHeaders`应用每个。对于每个默认值，我们检测如何已经存在相同名字的header，使用不区分大小写检测。
只有当我们没有它的时候，才把它添加到header结果中：
```js
function mergeHeaders(config) {
    var reqHeaders = _.extend(
      {},
      config.headers
    );
    var defHeaders = _.extend(
      {},
      defaults.headers.common,
      defaults.headers[(config.method || 'get').toLowerCase()]
    );
    _.forEach(defHeaders, function(value, key) {
      var headerExists = _.some(reqHeaders, function(v, k) {
        return k.toLowerCase() === key.toLowerCase();
      });
      if (!headerExists) {
        reqHeaders[key] = value;
      }
    });
    return reqHeaders;
}
```
这是比较完整的header合并，我们将注意力转向一些与header处理相关的进一步特殊情况。

我们已经看了action的`Content-Type`header，并且看到如何将JSON设置为默认。但是我们应该确保如果实际上请求中的body体没有值`Content-Type`没有被设置。如果没有body,
任何`Content-Type`都会误导，我们应该忽略它，即使它已经被设置：
```js
it('does not send content-type header when no data', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
  expect(requests.length).toBe(1);
  expect(requests[0].requestHeaders['Content-Type']).not.toBe(
    'application/json;charset=utf-8');
});
```
我们完成它只需要迭代所有的headers，并且如果没有数据发送移除掉`Content-Type`：
```js
function $http(requestConfig) {
  var deferred = $q.defer();
  var con g = _.extend({
    method: 'GET'
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
    if (_.isUndefined(config.data)) {
      _.forEach(config.headers, function(v, k) {
        if (k.toLowerCase() === 'content-type') {
          delete config.headers[k];
        }
      }); 
    }
// ...
}
```
请求头的最后一方面是，我们需要讨论一下headrs的值不是一直是字符串，可能是一个函数生成的字符串。如果`$http`遇到一个函数作为header的值，它会调用函数，给它作为参数的请求配置对象。
如果你想设置默认值这可能有用，但是仍然需要分别为每个请求动态的生成：
```js
it('supports functions as header values', function() {
  var contentTypeSpy = jasmine.createSpy().and.returnValue(
    'text/plain;charset=utf-8');
  $http.defaults.headers.post['Content-Type'] = contentTypeSpy;
  var request = {
    method: 'POST',
    url: 'http://teropa.info',
    data: 42
  };
  $http(request);
  expect(contentTypeSpy).toHaveBeenCalledWith(request);
  expect(requests[0].requestHeaders['Content-Type']).toBe(
    'text/plain;charset=utf-8');
});
```
在`mergeHeaders`的最后，我们调用一个叫做`executeHeaderFns`的新帮助函数，它将处理所有的函数headers:
```js
function mergeHeaders(config) {
  // ...
  return executeHeaderFns(reqHeaders, config);
}
```
这个函数迭代所有的headers对象使用`_.transform`,并且使用函数的返回值代替函数，当在request配置中调用：
```js
function executeHeaderFns(headers, config) {
  return _.transform(headers, function(result, v, k) {
    if (_.isFunction(v)) {
      result[k] = v(config);
    }
  }, headers);
}
```
一种情况下，header中的函数结果是`null`或者`undefined`的时候不能被添加到request。这样的值要被忽略：
```js
it('ignores header function value when null/unde ned', function() {
  var cacheControlSpy = jasmine.createSpy().and.returnValue(null);
  $http.defaults.headers.post['Cache-Control'] = cacheControlSpy;
  
  var request = {
    method: 'POST',
    url: 'http://teropa.info',
    data: 42
  };
  $http(request);
  
  expect(cacheControlSpy).toHaveBeenCalledWith(request);
  expect(requests[0].requestHeaders['Cache-Control']).toBeUndefined();
});
```
`executeHeaderFns`明确的检查如果函数是返回值是`null`或者`undefined`,如果是那么移除headers:
```js
function executeHeaderFns(headers, config) {
  return _.transform(headers, function(result, v, k) {
    if (_.isFunction(v)) {
      v = v(config);
      if (_.isNull(v) || _.isUndefined(v)) {
        delete result[k];
      } else {
        result[k] = v;
      }
    }
  }, headers);
}
```