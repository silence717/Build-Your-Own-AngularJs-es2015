## Response Headers
我们现在可以有多种方式给HTTP请求设置头信心，我们将把目光转到另一个主要header处理：响应头。

在Angular里面HTTP服务器返回响应头都是由应用程序提供。他们包含在最终从`$http`得到的响应对象中。响应对象将有指向header获取函数的`headers`属性。
这个函数需要一个header名字作为参数，并且返回相应的header值：
```js
it('makes response headers available', function() {
  var response;
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: 42
  }).then(function(r) {
    response = r;
  });
  requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
  expect(response.headers).toBeDefined();
  expect(response.headers instanceof Function).toBe(true);
  expect(response.headers('Content-Type')).toBe('text/plain');
  expect(response.headers('content-type')).toBe('text/plain');
});
```
注意到像请求头，我们期望响应头的处理也是忽略大小写：获取`Content-Type`头和`content-type`头应该有相同的效果，无论服务器使用的哪个。

我们从HTTP后面开始响应头的实现。他们通过调用XMLHttpRequest的`getAllResponseHeaders()`有效：
```js
xhr.onload = function() {
  var response = ('response' in xhr) ? xhr.response :
                                       xhr.responseText;
  var statusText = xhr.statusText || '';
  callback(
    xhr.status,
    response,
    xhr.getAllResponseHeaders(),
    statusText
  );
};
```
在`$http`现有的头上（在这一点上还是未解析的字符串），我们可以为响应对象创建获取头函数。我们将使用一个叫做`headersGetter`的新帮助方法去创建这个函数：
```js
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
```
`headersGetter`函数需要headers字符串，并且返回一个函数将header的名字转为header对应的值。这将是应用程序代码在访问头时需要调用的函数：
```js
function headersGetter(headers) {
  return function(name) {
    
  }; 
}
```
为了获取单个header，我们需要分析当前拥有的组合 header 字符串。我们需要慢慢的来，直到第一个 header 实际请求还没有任何值被解析。然后我们缓存结果为后续调用：
```js
function headersGetter(headers) {
    var headersObj;
    return function(name) {
    headersObj = headersObj || parseHeaders(headers);
      return headersObj[name.toLowerCase()];
    }; 
}
```
有了这个规则，除非有人真正需要头信息，否则我们确保发解析头的成本不会发生。

真正完成解析头的工作是通过另外一个帮助函数，`parseHeaders`。它需要一个header的字符串作为参数，并且返回一个独立的header对象。首先将header字符串分割到独立行
（HTTP头每行经常是name-value对），然后通过遍历这些行完成：
```js
function parseHeaders(headers) {
  var lines = headers.split('\n');
  return _.transform(lines, function(result, line) {
  
  }, {}); 
}
```
每一个header行都有一个header名字，后面跟一个冒号字符':',再后面跟着对应值。我们仅仅只需要抓住冒号的前后两部分，移除前后空格，把header名字转为小写，然后把它放入结果对象：
```js
function parseHeaders(headers) {
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
```
`header`函数可以不使用参数调用，这种情况下它应该返回完整的、被解析的header对象：
```js
it('may returns all response headers', function() {
  var response;
  $http({
      method: 'POST',
          url: 'http://teropa.info',
          data: 42
        }).then(function(r) {
          response = r;
      });
  requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
  expect(response.headers()).toEqual({'content-type': 'text/plain'});
});
```
这是通过检查给定的headers完成。如果没有给定的头名称，只放完整的分析结果：
```js
function headersGetter(headers) {
  var headersObj;
  return function(name) {
    headersObj = headersObj || parseHeaders(headers);
    if (name) {
      return headersObj[name.toLowerCase()];
    } else {
      return headersObj;
    }
  }; 
}
```
这就是我们的响应头程序！