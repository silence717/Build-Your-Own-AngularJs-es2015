## Filtering With Other Primitives
filter表达式给filter的值不是必须为一个字符串。它也许是一个数字：
```js
it('filters with a number', function() {
  var fn = parse('arr | filter:42');
  expect(fn({arr: [
    {name: 'Mary', age: 42},
    {name: 'John', age: 43},
    {name: 'Jane', age: 44}
  ]})).toEqual([
    {name: 'Mary', age: 42}
  ]);
});
```
或者是一个布尔值：
```js
it('filters with a boolean value', function() {
  var fn = parse('arr | filter:true');
  expect(fn({arr: [
    {name: 'Mary', admin: true},
    {name: 'John', admin: true},
    {name: 'Jane', admin: false}
  ]})).toEqual([
    {name: 'Mary', admin: true},
    {name: 'John', admin: true}
  ]);
});
```
我们应该创建一个断言函数为这种类型的表达式：
```js
function filterFilter() {
  return function(array, filterExpr) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn = filterExpr;
    } else if (_.isString(filterExpr) ||
           _.isNumber(filterExpr) ||
           _.isBoolean(filterExpr)) {
      predicateFn = createPredicateFn(filterExpr);
    } else {
      return array;
    }
    return _. lter(array, predicateFn);
  };
}
```
然后我只需要在comparator中将他们强制转为字符串：
```js
function comparator(actual, expected) {
  actual = ('' + actual).toLowerCase();
  expected = ('' + expected).toLowerCase();
  return actual.indexOf(expected) !== -1;
}
```
值得注意的是，用数字（或布尔值）并不意味着项目的数值相等。一切都转成一个字符串，因此即使字符串项目，其中包含给定的数字将匹配，下面（传递）测试用例说明：
```js
it('filters with a substring numeric value', function() {
  var fn = parse('arr | filter:42');
  expect(fn({arr: ['contains 42']})).toEqual(['contains 42']);
});
```
你也可以过滤`null`值。当你这么做，只有项目为`null`的将返回。在这个用例中，字符串中包含的子"null"不会匹配：
```js
it('filters matching null', function() {
  var fn = parse('arr | filter:null');
  expect(fn({arr: [null, 'not null']})).toEqual([null]);
});
```
对应的，如果你使用字符串"null"，值为真正`null`的将不会匹配。只有字符串：
```js
it('does not match null value with the string null', function() {
  var fn = parse('arr | filter:"null"');
  expect(fn({arr: [null, 'not null']})).toEqual(['not null']);
});
```
我们也需要为`null`表达式创建一个断言：
```js
function filterFilter() {
  return function(array, filterExpr) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn = filterExpr;
    } else if (_.isString(filterExpr) ||
           _.isNumber(filterExpr) ||
           _.isBoolean(filterExpr) ||
           _.isNull(filterExpr)) {
      predicateFn = createPredicateFn(filterExpr);
    } else {
      return array;
    }
    return _. lter(array, predicateFn);
  };
}
```
在comparator中我们将为`null`引入一个特殊的情况。如果actual还是expected的任一个值为`null`,如果认为他们是匹配的的，那么另一个的值也必须是`null`：
```js
function comparator(actual, expected) {
  if (_.isNull(actual) || _.isNull(expected)) {
    return actual === expected;
  }
  actual = ('' + actual).toLowerCase();
  expected = ('' + expected).toLowerCase();
  return actual.indexOf(expected) !== -1;
}
```
当它们在数组中的值是`undefined`时候，他们不应该匹配字符串`undefined`:
```js
it('does not match unde ned values', function() {
  var fn = parse('arr |  lter:"unde ned"');
  expect(fn({arr: [unde ned, 'unde ned']})).toEqual(['unde ned']);
});
```
这里的规则是`undefined`项永远不能传到过滤器：
```js
function comparator(actual, expected) {
  if (_.isUnde ned(actual)) {
    return false;
  }
  if (_.isNull(actual) || _.isNull(expected)) {
    return actual === expected;
  }
  actual = ('' + actual).toLowerCase();
  expected = ('' + expected).toLowerCase();
  return actual.indexOf(expected) !== -1;
}
```
