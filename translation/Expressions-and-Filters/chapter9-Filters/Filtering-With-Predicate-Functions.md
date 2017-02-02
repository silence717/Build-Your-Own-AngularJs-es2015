## Filtering With Predicate Functions
使用filter的filter最简单的方式是 - 在一系列的实现中 - 就是给断言函数一个引用。它将利用此函数返回只有元素匹配断言返回真值的另外一个数组：
```js
it('can filter an array with a predicate function', function() {
  var fn = parse('[1, 2, 3, 4] | filter:isOdd');
  var scope = {
    isOdd: function(n) {
      return n % 2 !== 0;
    }
  };
  expect(fn(scope)).toEqual([1, 3]);
});
```
现在我们需要引入`parse`到这个测试文件：
```js
'use strict';
var parse = require('../src/parse');
var filter = require('../src/filter').filter;
```
原因很简单，我们可以将实现委托给LoDash的`filter function`。它需要一个数组和一个断言函数，并且返回一个新数组：
```js
'use strict';
var _ = require('lodash');
function filterFilter() {
    return function(array, filterExpr) {
      return _.filter(array, filterExpr);
    };
}
module.exports = filterFilter;
```