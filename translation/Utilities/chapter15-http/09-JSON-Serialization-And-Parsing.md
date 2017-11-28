## JSON Serialization And Parsing
大多数 Angular 应用的很多时间，不管是request还是response的数据都是有JSON格式化。正因为如此，Angular和JSON使工作变得更加容易：如果你的request和response都是
JSON，那你就不需要去执行序列化或者解析，可以依赖框架为你做的。

对于request，如果你添加一个JavaScript对象作为request data,这意味着实际请求是一个该对象的JSON序列化表达：
```js
it('serializes object data to JSON for requests', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: {aKey: 42}
  });
  
  expect(requests[0].requestBody).toBe('{"aKey":42}');
});
```
数组也是如此，添加到 request 的JavaScript书序也会被序列化到JSON：
```js
it('serializes array data to JSON for requests', function() {
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: [1, 'two', 3]
  });
  
  expect(requests[0].requestBody).toBe('[1,"two",3]');
});
```
Angular 使用我们在上一部分刚刚实现的 request 转换功能来做。默认值对于`transformRequest`包含一个函数将request data 序列化为一个JSON，如果它是一个对象（包含数组）：
```js
var defaults = this.defaults = {
  headers: {
    common: {
          Accept: 'application/json, text/plain, */*'
        },
    post: {
          'Content-Type': 'application/json;charset=utf-8'
        },
    put: {
          'Content-Type': 'application/json;charset=utf-8'
        },
    patch: {
          'Content-Type': 'application/json;charset=utf-8'
        }
  },
  transformRequest: [function(data) {
    if (_.isObject(data)) {
        return JSON.stringify(data);
    } else {
        return data;
    }
  }]
 };
```
不过这个负责有几个非常重要的例外。如果response data是一个`Blob`，可能有一些原始的二进制或文本数据，我们不应该碰它，直接把它发送出去使 XMLHttpRequest 处理它：
```js
it('does not serialize blobs for requests', () => {
    let blob;
    if (window.Blob) {
        blob = new Blob(['hello']);
    } else {
        let BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
            window.MozBlobBuilder || window.MSBlobBuilder;
        let bb = new BlobBuilder();
        bb.append('hello');
        blob = bb.getBlob('text/plain');
    }
    $http({
        method: 'POST',
        url: 'http://teropa.info',
        data: blob
    });
    $rootScope.$apply();
    
    expect(requests[0].requestBody).toBe(blob);
});
```
在这个测试中，我们需要尝试几种不同的方式来构建 Blob，由于API标准并不是基于浏览器实现的，不管在哪个浏览器上运行我们都希望测试通过。

我们应该也要跳过JSON序列化对于`FormData`。就像Blobs,FormData也是 XMLHttpRequest 已经知道如何去处理，我们不需要再将他们转为JSON：
```js
it('does not serialize form data for requests', function() {
  var formData = new FormData();
  formData.append('aField', 'aValue');
  $http({
    method: 'POST',
    url: 'http://teropa.info',
    data: formData
  });
  
  expect(requests[0].requestBody).toBe(formData);
});
```
在我们的转换器中，我们应该保证序列化调用，检测它是否为对象中的一个。我们也要维护第三种类型的对象 - `File` - 尽管我们没有对它进行单元测试，坦率来说，构建一个对象
比它的价值更麻烦：
```js
transformRequest: [function(data) {
  if (_.isObject(data) && !isBlob(data) &&
    !isFile(data) && !isFormData(data)) {
    return JSON.stringify(data);
  } else {
    return data;
  }
}]
```
我们在这里使用3个新的帮助函数，每个函数都查看对象的字符串表达式组成，并检查它的类型是否我我们感兴趣的：
```js
function isBlob(object) {
  return object.toString() === '[object Blob]';
}
function isFile(object) {
  return object.toString() === '[object File]';
}
function isFormData(object) {
  return object.toString() === '[object FormData]';
}
```
这是我们对JSON请求所需要的。`$http`另一半对JSON的支持是response: 如果服务器在response显示一个JSON的内容类型，你得到的响应数据是一个JavaScript数据结构是从
response解析来的。
```js
it('parses JSON data for JSON responses', function() {
  var response;
  $http({
    method: 'GET',
    url: 'http://teropa.info'
  }).then(function(r) {
    response = r;
  });
  requests[0].respond(
  	200,
    {'Content-Type': 'application/json'},
    '{"message":"hello"}'
  );

  expect(_.isObject(response.data)).toBe(true);
  expect(response.data.message).toBe('hello');
});
```
现在我们需要在这个测试文件引入LoDash:
```js
'use strict';
var _ = require('lodash');
var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
```
就像request一样,这也是通过转换完成的。让我们为默认值添加一个响应转换函数：
```js
transformRequest: [function(data) {
    if (_.isObject(data) && !isBlob(data) &&
        !isFile(data) && !isFormData(data)) {
      return JSON.stringify(data);
    } else {
      return data;
    }
}],
transformResponse: [defaultHttpResponseTransform]
```
这是一个函数 - 就像reponse转换 - 需要reponse数据和header作为参数：
```js
function defaultHttpResponseTransform(data, headers) {
	
}
```
函数的作用是检查响应数据是否为字符串，如果指定的类型内容为`application/json`。如果这两个条件都为真，response data被当作JSON解析，否则返回本身：
```js
function defaultHttpResponseTransform(data, headers) {
    if (_.isString(data)) {
      var contentType = headers('Content-Type');
      if (contentType && contentType.indexOf('application/json') === 0) {
        return JSON.parse(data);
      }
    }
    return data;
}
```
Angular实际上比这个要聪明很多：它将尝试将响应解析为JSON如果他们看起来像JSON，即使服务器并没有将它的内容类型表示为JSON。例如，即使下面的response数据没有
`Content-Type`头也会被解析：
```js
it('parses a JSON object response without content type', function() {
  var response;
  $http({
    method: 'GET',
    url: 'http://teropa.info'
  }).then(function(r) {
    response = r;
  });
  requests[0].respond(200, {}, '{"message":"hello"}');
  
  expect(_.isObject(response.data)).toBe(true);
  expect(response.data.message).toBe('hello');
});
```
对于数组也是的 - 解析一个JSON数组字符串即使没有content-type:
```js
it('parses a JSON array response without content type', function() {
  var response;
  $http({
    method: 'GET',
    url: 'http://teropa.info'
  }).then(function(r) {
      response = r;
  });
  requests[0].respond(200, {}, '[1, 2, 3]');
  
  expect(_.isArray(response.data)).toBe(true);
  expect(response.data).toEqual([1, 2, 3]);
});
```
因此，在我们的JSON响应转换器中，我们不应该只看content type,并且也要看数据本身 - 是否像JSON？
```js
function defaultHttpResponseTransform(data, headers) {
  if (_.isString(data)) {
    var contentType = headers('Content-Type');
    if ((contentType && contentType.indexOf('application/json') === 0) ||
        isJsonLike(data)) {
      return JSON.parse(data);
    }
  }
  return data;
}
```
我们可以简答的认为一个用花括号或者方括号开始的来标识为类JSON：
```js
function isJsonLike(data) {
  return data.match(/^\{/) || data.match(/^\[/);
}
```
Angular在这一点上更加聪明。类似于有效的JSON响应，但并不是因为起始字符和结束字符不一样，不应该导致错误：
```js
it('does not choke on response resembling JSON but not valid', function() {
  var response;
  $http({
    method: 'GET',
    url: 'http://teropa.info'
  }).then(function(r) {
    response = r;
  });
  requests[0].respond(200, {}, '{1, 2, 3]');
  
  expect(response.data).toEqual('{1, 2, 3]');
});
```
另一种情况就是response字符串以两个花括号开始 - 它看起来像JSON但不是。我们需要考虑这种特殊情况的原因是因为`$http`也会被用作加载Angular模板，对于那些以
`{{interpolation expression}}`开头的并不常见：
```js
it('does not try to parse interpolation expr as JSON', function() {
  var response;
  $http({
    method: 'GET',
    url: 'http://teropa.info'
  }).then(function(r) {
    response = r;
  });
  requests[0].respond(200, {}, '{{expr}}');
  
  expect(response.data).toEqual('{{expr}}');
});
```
下面是一个更新类JSON测试，将考虑到这两种情况。如果数据以花括号开始，它也应该以一个花括号结尾，对于方括号也是一样的。我们还要检测一个开始的花括号是否紧跟着另一个花括号，使用一个超前的表达:
```js
function isJsonLike(data) {
    if (data.match(/^\{(?!\{)/)) {
      return data.match(/\}$/);
    } else if (data.match(/^\[/)) {
      return data.match(/\]$/);
    }
}
```