## 通配符匹配过滤对象（Filtering With Object Wildcards）
如果你想说"我希望对象中的任意属性与此值匹配"，你可以使用一个特殊的通配符`$`在规则对象中：
```js
it('filters with a wildcard property', function() {
  var fn = parse('arr | filter:{$: "o"}');
  expect(fn({arr: [
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'},
    {name: 'Mary', role: 'admin'}
  ]})).toEqual([
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]);
});
```
不像普通对象的属性，属性值的通配符匹配嵌套对象 - 在任何层级：
```js
it('filters nested objects with a wildcard property', function() {
  var fn = parse('arr | filter:{$: "o"}');
  expect(fn({arr: [
    {name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'},
    {name: {first: 'Mary'}, role: 'admin'}
  ]})).toEqual([
    {name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'}
  ]);
});
```
到目前为止，这并没有真正区别于使用一个简单原始类型的filter代替。为什么使用`$:"o"`并不仅仅是`"o"`?主要原因是当你在另一个规则对象中包含一个通配符。
通配符的作用域包含在它的父亲里面：
```js
it('filters wildcard properties scoped to parent', function() {
  var fn = parse('arr | filter:{name: {$: "o"}}');
  expect(fn({arr: [
    {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
    {name: {first: 'Jane', last: 'Quick'}, role: 'moderator'},
    {name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
  ]})).toEqual([
    {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
    {name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
  ]);
});
```
当我们遍历一个期望的对象内容的时候，我们应该检查key是否是`$`。如果是，我们想匹配整个actual对象,不仅仅是匹配它的key（这将要求actual对象需要包含`$`key）:
```js
return _.every(
  _.toPlainObject(expected),
  function(expectedVal, expectedKey) {
    if (_.isUnde ned(expectedVal)) {
      return true;
    }
    var isWildcard = (expectedKey === '$');
    var actualVal = isWildcard ? actual : actual[expectedKey];
    return deepCompare(actualVal, expectedVal, comparator);
  }
);
```
此外，在这种情况下，我们想匹配actual对象内的任何属性。它恰好是通配符匹配的。因此，我们需要通过传递第4个参数在递归调用`deepCompare`里：
```js
return _.every(
  _.toPlainObject(expected),
  function(expectedVal, expectedKey) {
    if (_.isUnde ned(expectedVal)) {
      return true;
    }
    var isWildcard = (expectedKey === '$');
    var actualVal = isWildcard ? actual : actual[expectedKey];
    return deepCompare(actualVal, expectedVal, comparator, isWildcard);
  }
);
```
当你使用一个通配符规则在规则对象的顶层，它实际上匹配通配符对于原始类型组成的数组：
```js
it('filters primitives with a wildcard property', function() {
  var fn = parse('arr | filter:{$: "o"}');
  expect(fn({arr: ['Joe', 'Jane', 'Mary']})).toEqual(['Joe']);
});
```
在断言函数我们简单地使用原始表达式的`$`属性的值 - 如果存在 - 当与非对象匹配时候：
```js
function createPredicateFn(expression) {
    var shouldMatchPrimitives =
      _.isObject(expression) && ('$' in expression);
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
    return function predicateFn(item) {
    if (shouldMatchPrimitives && !_.isObject(item)) {
      return deepCompare(item, expression.$, comparator);
    }
    return deepCompare(item, expression, comparator, true);
  };
}
```
最后，通配符属性也可以被嵌套。当你这样做，你需要一些值至少存在一些深度的对象：
```js
it('filters with a nested wildcard property', function() {
  var fn = parse('arr | filter:{$: {$: "o"}}');
  expect(fn({arr: [
    {name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'},
    {name: {first: 'Mary'}, role: 'admin'}
  ]})).toEqual([
    {name: {first: 'Joe'}, role: 'admin'}
  ]);
});
```
这个当前也匹配`role: 'moderator'`即使它匹配`'o'`至少两层深度因为这是我们规则对象指定的。

我们修复它可以通过给`deepCompare`传递第5个参数，叫做`inWildcard`。当从通配符规则递归调用的时候将它设置为true：
```js
function deepCompare(actual, expected, comparator, matchAnyProperty, inWildcard) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
      return !deepCompare(actual, expected.substring(1),
    }
    if (_.isArray(actual)) {
    comparator, matchAnyProperty);
    return _.some(actual, function(actualItem) {
      return deepCompare(actualItem, expected,
    }); }
    comparator, matchAnyProperty);
    if (_.isObject(actual)) {
      if (_.isObject(expected)) {
        return _.every(
          _.toPlainObject(expected),
          function(expectedVal, expectedKey) {
            if (_.isUnde ned(expectedVal)) {
              return true;
            }
            var isWildcard = (expectedKey === '$');
            var actualVal = isWildcard ? actual : actual[expectedKey];
            return deepCompare(actualVal, expectedVal,
    comparator, isWildcard, isWildcard);
    } );
        } else if (matchAnyProperty) {
          return _.some(actual, function(value, key) {
            return deepCompare(value, expected, comparator, matchAnyProperty);
          });
    } else {
          return comparator(actual, expected);
        }
    } else {
        return comparator(actual, expected);
  }
}
```
然后我们可以防止规则对象在一开始使用一个通配符搜索，通过对应的`if`语句来保证。这意味着我们最终在第二分支（`else if(matchAnyProperty)`）,它跳到下一层的嵌套。
在`deepCompare`递归调用里完成，`inWildcard`标识再次成为false,我们在争取的作用域应用第二个通配符：
```js
function deepCompare(actual, expected, comparator, matchAnyProperty, inWildcard) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
      return !deepCompare(actual, expected.substring(1),
    }
    if (_.isArray(actual)) {
    comparator, matchAnyProperty);
    return _.some(actual, function(actualItem) {
      return deepCompare(actualItem, expected,
    }); }
    comparator, matchAnyProperty);
    if (_.isObject(actual)) {
      if (_.isObject(expected) && !inWildcard) {
        return _.every(
          _.toPlainObject(expected),
          function(expectedVal, expectedKey) {
            if (_.isUnde ned(expectedVal)) {
              return true;
            }
            var isWildcard = (expectedKey === '$');
            var actualVal = isWildcard ? actual : actual[expectedKey];
            return deepCompare(actualVal, expectedVal,
    comparator, isWildcard, isWildcard);
    } );
        } else if (matchAnyProperty) {
          return _.some(actual, function(value, key) {
            return deepCompare(value, expected, comparator, matchAnyProperty);
          });
    } else {
          return comparator(actual, expected);
        }
    } else {
        return comparator(actual, expected);
  }
}
```

