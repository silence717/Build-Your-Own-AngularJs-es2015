## 过滤器注册（Filter Registration）
在表达式可以使用过滤器之前，他们需要在什么地方注册一下。为了实现这个目标，Angular使用一个特殊的过滤器服务。它提供注册filter和查找以前以往注册过的filter功能。

在这一点上，我们使用一对独立的函数`register`和`filter`去实现一个简单的服务版本。稍后我们将进一步开发这种实现使它和注入系统完全继承。

首先，filter服务允许注册过滤器。它通过调用注册函数注册过滤器名称和一个工厂函数。工厂函数期望返回一个filter。然后，注册的filter可以获得使用`filter`函数。
在一个新测试文件测试这个：
```js
'use strict';
var register = require('../src/filter').register;
var  lter   = require('../src/filter'). lter;
describe('filter', function() {
  it('can be registered and obtained', function() {
    var myFilter = function() { };
    var myFilterFactory = function() {
      return myFilter;
    };
    register('my', myFilterFactory);
    expect(filter('my')).toBe(myFilter);
  });
});
```
我们可以用简单的方式实现这个。他们都访问一个存储对象，key值是filter的名称，value是filter。当一个filter被注册的时候，工厂函数的返回值被放在对象中。
对这样的实现需要一个新文件：
```js
'use strict';
var filters = {};
function register(name, factory) {
   var filter = factory();
   filters[name] = filter;
   return  lter;
}
function filter(name) {
   return  lters[name];
}
module.exports = {register: register,  filter: filter};
```
注册函数还支持在单次调用中注册多个filter的简写。你可以通过它传递一个对象，key值是filter的名字，并且value是相应的filter的工厂：
```js
it('allows registering multiple  lters with an object', function() {
  var myFilter = function() { };
  var myOtherFilter = function() { };
  register({
    my: function() {
      return myFilter;
    },
    myOther: function() {
      return myOtherFilter;
    }
  });
  expect(filter('my')).toBe(myFilter);
  expect(filter('myOther')).toBe(myOtherFilter);
});
```
在实现中，如果第一个参数是对象，我们递归调用`register`对象里的每个键值对：
```js
'use strict';
var _ = require('lodash');
var filters = {};
function register(name, factory) {
    if (_.isObject(name)) {
      return _.map(name, function(factory, name) {
        return register(name, factory);
      });
    } else {
        var filter = factory();
        filters[name] = filter;
        return  lter;
    }
}
function filter(name) {
  return filters[name];
}
module.exports = {register: register, filter: filter};
```
这将为现在的filter服务本身的执行。就像一架提到的，一旦有了依赖注入系统，我们将返回它。