## Default Request Configuration
像我们看到的一样，`$http`函数需要一个request配置对象作为它并且是唯一的参数。这个对象包含发生请求所有的属性：URL、HTTP方法、内容等等。然而，不是所有的这些参数都是必须的。
如果配置参数漏掉了这些属性，他们都有默认的值。

在这一点上，我们得设置这些默认值：request方法。如果一个请求没有method，那就假设它为GET：
```js
it('uses GET method by default', function() {
  $http({
    url: 'http://teropa.info'
  });
  expect(requests.length).toBe(1);
  expect(requests[0].method).toBe('GET');
});
```
我们可以在`$http`函数做到这些，仅仅通过构造一个"默认配置"对象，可以通过给定的参数来扩展配置，允许重写默认值：
```js
return function $http(requestConfig) {
    var deferred = $q.defer();
    var config = _.extend({
      method: 'GET'
    }, requestConfig);
    // ...
};
```
我们需要在`$http.js`中引入LoDash:
```js
var _ = require('lodash');
```
不是`$http`中所有的配置都可以预配置默认值，但是还有一部分的默认值，我们将在下面章节的课程里面添加。