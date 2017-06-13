## Shorthand Methods
我们已经对`$http`所有内容进行了详细的介绍，这些内容营销了实际的HTTP响应的实现，本章的剩余部分将集中讨论与`$http`提供给应用的API相关的部分，以及与请求的异步Promise工作流。

`$http`给应用程序提供的便利质疑就是一些快捷方法，可以使请求更加简化，而不是原始的`$http`函数。例如，这里有一个`get`方法，它需要一个请求的URL和一个可选请求配置，并发出GET请求：
```js
it('supports shorthand method for GET', function() {
  $http.get('http://teropa.info', {
    params: {q: 42}
  });
  
  expect(requests[0].url).toBe('http://teropa.info?q=42');
  expect(requests[0].method).toBe('GET');
});
```
该方法调用底层的`$http`函数，确保配置对象具有给定的URL和GET方法：
```js
$http.defaults = defaults;
$http.get = function(url, config) {
  return $http(_.extend(config || {}, {
    method: 'GET',
    url: url 
  }));
};
return $http;
```
对于 HEAD 和 DELETE 请求也提供了完全相同的快捷方法：
```js
it('supports shorthand method for HEAD', function() {
  $http.head('http://teropa.info', {
    params: {q: 42}
  });
  
  expect(requests[0].url).toBe('http://teropa.info?q=42');
  expect(requests[0].method).toBe('HEAD');
});
it('supports shorthand method for DELETE', function() {
  $http.delete('http://teropa.info', {
    params: {q: 42}
  });
  
  expect(requests[0].url).toBe('http://teropa.info?q=42');
  expect(requests[0].method).toBe('DELETE');
});
```
这些方法的实现和GET也完全一样 - 除了配置的HTTP方法之外：
```js
$http.head = function(url, config) {
  return $http(_.extend(config || {}, {
    method: 'HEAD',
    url: url 
  }));
};
$http.delete = function(url, config) {
  return $http(_.extend(config || {}, {
    method: 'DELETE',
    url: url
  })); 
};
```
实际上，这三个方法是相似的，我们可以在循环中生成他们，避免代码中俄重复：
```js
$http.defaults = defaults;
_.forEach(['get', 'head', 'delete'], function(method) {
  $http[method] = function (url, config) {
    return $http(_.extend(config || {}, {
      method: method.toUpperCase(),
      url: url
    })); 
  };
});
return $http;
```
还有三种HTTP方法提供了快捷方法：POST,PUT和PATCH。这三个和前三个的区别在于它们支持request body，也就是说你可以在请求上设置`data`属性。所以这一次的快捷方法需要3个参数：
URL，可选的request data，和可选的请求配置对象：
```js
it('supports shorthand method for POST with data', function() {
    $http.post('http://teropa.info', 'data', {
        params: {q: 42}
    });
    
    expect(requests[0].url).toBe('http://teropa.info?q=42');
    expect(requests[0].method).toBe('POST');
    expect(requests[0].requestBody).toBe('data');
});

it('supports shorthand method for PUT with data', function() {
    $http.put('http://teropa.info', 'data', {
        params: {q: 42}
    });
    
    expect(requests[0].url).toBe('http://teropa.info?q=42');
    expect(requests[0].method).toBe('PUT');
    expect(requests[0].requestBody).toBe('data');
});

it('supports shorthand method for PATCH with data', function() {
    $http.patch('http://teropa.info', 'data', {
        params: {q: 42}
    });
    
    expect(requests[0].url).toBe('http://teropa.info?q=42');
    expect(requests[0].method).toBe('PATCH');
    expect(requests[0].requestBody).toBe('data');
});
```
我们在另一个循环生成这些方法，在GET、HEAD、和DELETE下面添加这个循环：
```js
_.forEach(['post', 'put', 'patch'], function(method) {
  $http[method] = function(url, data, config) {
    return $http(_.extend(config || {}, {
      method: method.toUpperCase(),
      url: url,
      data: data
    })); 
  };
});
```
