## The Filter Filter
现在我们已经支持filter,让我们把剩余的章放到一个特定的过滤器实现，就是Angular ships: `filter`的过滤器。

简而言之，filter的filter目的就是过滤在表达式中使用的数组到一个子集。我们为匹配的条目定一个具体的标准去和数组匹配，表达式的结果是只匹配标准的另一个数组。
这有点像对某些模式匹配的条目的数组查询。

filter的过滤通常和`ngRepeat`一起使用，当你想为一个数组中的项重复DOM,但是它限制只有某些特定种类的项目而不是整个数组。
但filter是没有限制`ngRepeat`的方式，无论什么时候你在表达式中有一个数组。


让我们首先断点过滤器过滤器实际上应该存在并且通过filter服务可用。这需要一个新的测试文件：
```js
'use strict';
var  filter = require('../src/ lter').filter;
describe(' filter  filter', function() {
  it('is available', function() {
    expect( filter('filter')).toBeDefined();
}); });
```
filter的工厂函数在自己的源文件引入并且export出去:
```js
'use strict';
function filterFilter() {
  return function() {
  };
}
module.exports =  filterFilter;
```
我们在`filter.js`中处理这种filter的注册：
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
        var  filter = factory();
        filters[name] = filter;
        return  lter;
    } }
function  filter(name) {
  return  filters[name];
}
register(' lter', require('./filter_filter'));
module.exports = {register: register, filter: filter};
```
随着设置的方式，我们开始探索这个过滤器实际上能做什么。