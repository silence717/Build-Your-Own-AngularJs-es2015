## Request Transforms
当与服务器端通信的时候，你经常需要以某种方式来对数据进行预处理，以便于服务器能够理解的格式，例如JSON、XML，或者其他自定义格式。

当在你的的Angular应用里面有这样的预处理，当然我们可以完全对每个请求分别执行：你需要确保请求的data属性里面放的是服务器可以处理的格式。但是必须重复这样的预处理代码
不是最佳的。将这种预处理与实际应用程序逻辑分开是有用的。这就是请求转换的地方：

请求转换是一个函数，在请求发出去之前被调用。转换返回的值将代替原来的请求主体.

一种指定的请求转换的方法是给请求对象添加`transformRequest`属性：
```js
it('allows transforming requests with functions', function() {
	$http({
        method: 'POST',
        url: 'http://teropa.info',
        data: 42,
        transformRequest: function(data) {
          return '*' + data + '*';
        }
    });
    expect(requests[0].requestBody).toBe('*42*');
});
```
转换在`$http`应用，我们在请求发送之前调用一个叫做`transformData`的帮助函数。这个帮助函数给请求数据，并且`transformRequest`属性的值。这个返回值被用于实际的请求data:
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
  
  var reqData = transformData(config.data, config.transformRequest);
    if (_.isUndefined(reqData)) {
    _.forEach(config.headers, function(v, k) {
        if (k.toLowerCase() === 'content-type') {
          delete config.headers[k];
        }
    }); 
  }
    function done(status, response, headersString, statusText) {
      status = Math.max(status, 0);
      deferred[isSuccess(status) ? 'resolve' : 'reject']({
        status: status,
        data: response,
        statusText: statusText,
        headers: headersGetter(headersString),
        config: config
      });
      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      } 
    }
  $httpBackend(
    config.method,
    config.url,
    reqData,
    done,
    config.headers,
    config.withCredentials
  );
  return deferred.promise;
}
```
如果`transformData`是一个函数将调用并转换。否则，它只放原始请求数据：
```js
function transformData(data, transform) {
  if (_.isFunction(transform)) {
    return transform(data);
  } else {
    return data;
  }
}
```
这也有可能是几个请求转换链，这可以通过`transformRequest`属性到转换数组。它们将按顺序调用：
```js
it('allows multiple request transform functions', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 42,
    transformRequest: [function(data) {
      return '*' + data + '*';
    }, function(data) {
      return '-' + data + '-';
    }]
  });
  
  expect(requests[0].requestBody).toBe('-*42*-');
});
```
我们可以通过在`transformdata`使用转换数组去支持。如果没有给定的转换我们也依赖`_.reduce`返回的原始值：
```js
function transformData(data, transform) {
  if (_.isFunction(transform)) {
    return transform(data);
  } else {
    return _.reduce(transform, function(data, fn) {
      return fn(data);
    }, data);
  } 
}
```
在每个请求对象添加`transformRequest`有用，但是更常见的是听过默认配置。如果你添加转换到`$http.defaults`，你可以说"在每个请求发送前运行这个函数"，允许更高的
关注点分离 - 你不需要在每次发请求的时候考虑转换：
```js
it('allows settings transforms in defaults', function() {
  $http.defaults.transformRequest = [function(data) {
    return '*' + data + '*';
  }];
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 42
  });
  
  expect(requests[0].requestBody).toBe('*42*');
});
```
当我们构建请求配置对象的时候我们可以插入默认的`transformRequest`：
```js
function $http(requestConfig) {
  var deferred = $q.defer();
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
  // ...
}
```
当你有默认的请求转换，他们需要更多的信息，不仅仅是请求body去完成他们的工作 - 例如，也许某些转换仅仅在某些确定的HTTP内容类型头时应用。为了这个目标，转换也给定了
请求头作为第二个参数。他们使用一个函数包裹，需要一个header名称，并且返回他们的值：
```js
it('passes request headers getter to transforms', function() {
  $http.defaults.transformRequest = [function(data, headers) {
    if (headers('Content-Type') === 'text/emphasized') {
      return '*' + data + '*';
    } else {
          return data;
    }
  }]; 
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 42,
    headers: {
      'content-type': 'text/emphasized'
    }
  });
  
  expect(requests[0].requestBody).toBe('*42*');
});
```
因此我们需要将请求头传到`transformData`。我们也是这么做的，首先让通过`headersGetter`传递他们，因为获取我们需要的各种。`headersGetter`现在不能处理请求头，我们将一会修复它。
```js
var reqData = transformData(
  config.data,
  headersGetter(config.headers),
  config.transformRequest
);
```
在`transformData`我们现在可以传递头信息给每个独立的请求转换：
```js
function transformData(data, headers, transform) {
    if (_.isFunction(transform)) {
      return transform(data, headers);
    } else {
      return _.reduce(transform, function(data, fn) {
        return fn(data, headers);
      }, data); 
    }
}
```
为了完成这个，我们需要teach`headersGetter`,或者使用更准确的`parseHeaders`函数，去处理我们给定的请求头。

之前我们实现了`parseHeaders`，它使用一个响应头字符作为参数，并且将它解析到一个对象。我们已经有了一个请求头对象。我们唯一要做的就是将头标准化，这样他们可以不区分大小写，
和任何额外的空格被删除。这就是如果一个参数已经是一个对象，我们在`parseHeaders`实现的原因：
```js
function parseHeaders(headers) {
    if (_.isObject(headers)) {
      return _.transform(headers, function(result, v, k) {
        result[_.trim(k.toLowerCase())] = _.trim(v);
      }, {});
    } else {
        var lines = headers.split('\n');
        return _.transform(lines, function(result, line) {
          var separatorAt = line.indexOf(':');
          var name = _.trim(line.substr(0, separatorAt)).toLowerCase();
          var value = _.trim(line.substr(separatorAt + 1));
          if (name) {
            result[name] = value;
          }
        }, {});
    }
}
```