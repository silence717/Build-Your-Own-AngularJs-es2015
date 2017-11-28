## Negated Filtering With Strings
筛选不符合规则的项的数组通常是有用的，而不是对项目进行筛选那样做。你可以通过给字符串filter添加前缀`!`实现:
```js
it('allows negating string filter', function() {
  var fn = parse('arr | filter:"!o"');
  expect(fn({arr: ['quick', 'brown', 'fox']})).toEqual(['quick']);
});
```
这个的实现非常简单。当我们进入到`deepCompare`，期望的是以`!`开始的字符串规则，我们将再次调用自己使用一个字符串不包含`!`并且对结果取反：
```js
function deepCompare(actual, expected, comparator) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
      return !deepCompare(actual, expected.substring(1), comparator);
    }
    if (_.isObject(actual)) {
        return _.some(actual, function(value, key) {
          return deepCompare(value, expected, comparator);
        });
    } else {
        return comparator(actual, expected);
    }
}
```