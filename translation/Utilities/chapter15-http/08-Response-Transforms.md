## Response Transforms
就像请求发送前转换请求是有用的，在从服务器返回数据，在应用程序代码使用之前转换响应也是有用的。一个典型的应用就是将数据从一些序列化格式解析为JavaScript对象。

响应转换应该与请求转换应该是对称的。你可以在请求配置上添加一个`transformResponse`属性，它会被响应体调用。
```js
it('allows transforming responses with functions', function() {
  var response;
  $http({
    url: 'http://teropa.info',
    transformResponse: function(data) {
      return '*' + data + '*';
    }
  }).then(function(r) {
    response = r;
  });
  
  requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
  
  expect(response.data).toEqual('*Hello*');
});
```
就像请求转换，headers作为第二个参数可供响应转换访问。这一次他们是respnse头而不是request头。
```js
it('passes response headers to transform functions', function() {
  var response;
  $http({
    url: 'http://teropa.info',
    transformResponse: function(data, headers) {
      if (headers('content-type') === 'text/decorated') {
        return '*' + data + '*';
  } else {
        return data;
      }
    }
  }).then(function(r) {
    response = r;
  });
  
  requests[0].respond(200, {'Content-Type': 'text/decorated'}, 'Hello');
  
  expect(response.data).toEqual('*Hello*');
});
```
同样，就像请求转换，响应转换也可以在`$http`默认里面设置，因此你就不需要为每个请求独立的去设置：
```js
it('allows setting default response transforms', function() {
  $http.defaults.transformResponse = [function(data) {
    return '*' + data + '*';
  }];
  var response;
  $http({
    url: 'http://teropa.info'
  }).then(function(r) {
    response = r;
  });
  
  requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
  
  expect(response.data).toEqual('*Hello*');
});
```
在我们开始让这些测试通过之前，让我们花费一点时间重构一下`$http`中的代码。`$http`函数本身已经很大了，我们可以把它拆分到两步：准备请求和发送它。把准备请求的代码放在
`$http`函数中，但是把发送请求的代码抽离到一个叫作`sendReq`的新函数：
```js
function sendReq(config, reqData) {
  var deferred = $q.defer();
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

function $http(requestConfig) {
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
  if (_.isUndefined(config.withCredentials) &&
      !_.isUndefined(defaults.withCredentials)) {
    config.withCredentials = defaults.withCredentials;
  }
  var reqData = transformData(
    config.data,
    headersGetter(config.headers),
    config.transformRequest
  );
  if (_.isUndefined(reqData)) {
    _.forEach(config.headers, function(v, k) {
      if (k.toLowerCase() === 'content-type') {
        delete config.headers[k];
      }
    }); 
  }
  return sendReq(config, reqData);
}
```
现在在代码上添加response转换就会容易一些，因此我们创建一个做这个工作的函数，并且把它作为一个promise回调添加到`sendReq`的返回值：
```js
function $http(requestConfig) {
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest
  }, requestConfig);
  config.headers = mergeHeaders(requestConfig);
  if (_.isUndefined(config.withCredentials) &&
      !_.isUndefined(defaults.withCredentials)) {
    config.withCredentials = defaults.withCredentials;
  }
  var reqData = transformData(
    config.data,
    headersGetter(config.headers),
    config.transformRequest
  );
  if (_.isUndefined(reqData)) {
    _.forEach(config.headers, function(v, k) {
      if (k.toLowerCase() === 'content-type') {
        delete config.headers[k];
      }
    }); 
  }
  function transformResponse(response) {
  }
  return sendReq(config, reqData)
    .then(transformResponse);
}
```
这个函数把response作为参数，并且使用response转换后的结果代替`data`属性。我们已经有一个函数可以运行转换 - `transformData` - 我们在这里再次使用它：
```js
function transformResponse(response) {
    if (response.data) {
      response.data = transformData(response.data, response.headers,
        config.transformResponse);
    }
    return response;
}
```
我们需要支持默认的response转换，因此给配置添加`config.transformResponse`:
```js
function $http(requestConfig) {
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest,
    transformResponse: defaults.transformResponse
  }, requestConfig);
  // ...
}
```
我们不仅需要转换成功的响应，对失败的响应也要做转换，因为他们也有body需要转换：
```js
it('transforms error responses also', function() {
  var response;
  $http({
    url: 'http://teropa.info',
    transformResponse: function(data) {
      return '*' + data + '*';
    }
  }).catch(function(r) {
    response = r;
  });
  
  requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
  
  expect(response.data).toEqual('*Fail*');
});
```
`transformResponse`已经完全有能力这么去做，但是由于它作为一个promise处理，它也需要对失败的响应再次reject。否则，失败会被捕获，并且应用程序代码会在成功的处理中接收
到错误的响应。让我们修复它：
```js
function transformResponse(response) {
  if (response.data) {
    response.data = transformData(response.data, response.headers,
      config.transformResponse);
  }
  if (isSuccess(response.status)) {
    return response;
  } else {
    return $q.reject(response);
  }
}
return sendReq(config, reqData)
  .then(transformResponse, transformResponse);
```
response转换的最后一方面是，他们接收了一个额外的参数，request转换不需要：HTTP的响应状态码。它作为第三个参数传递到每个转换器：
```js
it('passes HTTP status to response transformers', function() {
  var response;
  $http({
    url: 'http://teropa.info',
    transformResponse: function(data, headers, status) {
      if (status === 401) {
        return 'unauthorized';
  } else {
        return data;
      }
    }
  }).catch(function(r) {
    response = r;
  });
  
  requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
  
  expect(response.data).toEqual('unauthorized');
});
```
在`transformResponse`我们可以抽离状态，并且把它传递到`transformData`：
```js
function transformResponse(response) {
  if (response.data) {
    response.data = transformData(
      response.data,
      response.headers,
      response.status,
      config.transformResponse
    );
  }
  if (isSuccess(response.status)) {
    return response;
  } else {
    return $q.reject(response);
  }
}
```
我们仅仅需要添加一个额外的参数给`transformData`，这个函数在request转换里面也被调用，因此我们需要更新代码提供一个明确的`undefined`状态 - request不需要状态：
```js
var reqData = transformData(
  config.data,
  headersGetter(config.headers),
  undefined,
  config.transformRequest
);
```
在`transformData`我们现在可以接收这个参数，并且传递它到转换函数：
```js
function transformData(data, headers, status, transform) {
    if (_.isFunction(transform)) {
      return transform(data, headers, status);
    } else {
      return _.reduce(transform, function(data, fn) {
        return fn(data, headers, status);
      }, data); 
    }
}
```