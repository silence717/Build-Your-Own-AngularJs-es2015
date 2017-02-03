## Filtering With Object Criteria
当你有一个对象数组需要过滤的时候，只适应一个原始类型的值作为filter的条件也许是一个不明智的方式。例如，你可能希望筛选特定属性具有特定值得项。

你可以这么做提供一个对象作为filter条件。这里是一个在输入的数组中查找`name`属性匹配项的。该项还有一个`tole`属性但是filter忽略了它们：
```js
it('filters with an object', function() {
  var fn = parse('arr | filter:{name: "o"}');
  expect(fn({arr: [
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]})).toEqual([
    {name: 'Joe', role: 'admin'}
  ]);
});
```
当在少选对象中指定多个条件的时候，只返回符合所有条件的项：
```js
it('must match all criteria in an object', function() {
  var fn = parse('arr | filter:{name: "o", role: "m"}');
  expect(fn({arr: [
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]})).toEqual([
    {name: 'Joe', role: 'admin'}
  ]);
});
```
因此当规则对象为空时，一切都会通过过滤器：
```js
it('matches everything when filtered with an empty object', function() {
  var fn = parse('arr | filter:{}');
  expect(fn({arr: [
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]})).toEqual([
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]);
});
```
规则对象也许包含嵌套对象。这允许你可以进行任意深度的数据匹配：
```js
it('filters with a nested object', function() {
  var fn = parse('arr | filter:{name: {first: "o"}}');
  expect(fn({arr: [
    {name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'}
  ]})).toEqual([
    {name: {first: 'Joe'}, role: 'admin'}
  ]);
});
```
你也可以在规则对象中对条件取反，通过使用`!`前缀，就像我们处理原始字符串规则一样：
```js
it('allows negation when filtering with an object', function() {
  var fn = parse('arr | filter:{name: {first: "!o"}}');
  expect(fn({arr: [
    {name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'}
  ]})).toEqual([
    {name: {first: 'Jane'}, role: 'moderator'}
  ]);
});
```
这提供了一个很好的初始化测试线告诉我们需要实现什么。首先，让我们设置对象以便为对象过滤器创建断言函数：
```js
function  lterFilter() {
  return function(array, filterExpr) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn = filterExpr;
    } else if (_.isString(filterExpr) ||
               _.isNumber(filterExpr) ||
               _.isBoolean(filterExpr) ||
               _.isNull(filterExpr) ||
               _.isObject(filterExpr)) {
      predicateFn = createPredicateFn(filterExpr);
  } else {
    return array;
  }
  return _.filter(array, predicateFn);
};
```
在`deepCompare`中，如果expected值是一个对象，我们不能直接将它与actual值进行比较。我们需要做一些其他事情代替：
```js
function deepCompare(actual, expected, comparator) {
  if (_.isString(expected) && _.startsWith(expected, '!')) {
    return !deepCompare(actual, expected.substring(1), comparator);
  }
  if (_.isObject(actual)) {
    if (_.isObject(expected)) {

    } else {
        return _.some(actual, function(value, key) {
          return deepCompare(value, expected, comparator);
        });
    }
  } else {
    return comparator(actual, expected);
  }
}
```
我们所做的是在expected对象上循环，并为每个值深度比较实际对象中对应的值。如果对象中的所有规则都匹配，我们就有匹配：
```js
function deepCompare(actual, expected, comparator) {
  if (_.isString(expected) && _.startsWith(expected, '!')) {
    return !deepCompare(actual, expected.substring(1), comparator);
  }
  if (_.isObject(actual)) {
    if (_.isObject(expected)) {
        return _.every(
          _.toPlainObject(expected),
          function(expectedVal, expectedKey) {
            return deepCompare(actual[expectedKey], expectedVal, comparator);
          }
        );
    } else {
        return _.some(actual, function(value, key) {
          return deepCompare(value, expected, comparator);
        });
    }
  } else {
    return comparator(actual, expected);
  }
}
```
这里也考虑到了嵌套的规则对象，因为`deepCompare`递归的检测了嵌套的值是否为一个对象。

如果规则对象中的一些值是undefined，那么他们被忽略：
```js
it('ignores undefined values in expectation object', function() {
  var fn = parse('arr | filter:{name: thisIsUndefined}');
  expect(fn({arr: [
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]})).toEqual([
    {name: 'Joe', role: 'admin'},
    {name: 'Jane', role: 'moderator'}
  ]);
});
```
这个工作的方式是：`undefined`值期望永远是匹配的：
```js
return _.every(
  _.toPlainObject(expected),
  function(expectedVal, expectedKey) {
    if (_.isUndefined(expectedVal)) {
      return true;
    }
    return deepCompare(actual[expectedKey], expectedVal, comparator);
  }
);

```
如果在对象中嵌套数组，则对象被认为是嵌套数组中任何匹配的对象。规则对象有效地"跳"了一个级别，这样你就不需要做任何特别的事情来使它与数组内的项匹配：
```js
it('filters with a nested object in array', function() {
  var fn = parse('arr | filter:{users: {name: {first: "o"}}}');
  expect(fn({arr: [
    {users: [{name: {first: 'Joe'}, role: 'admin'},
             {name: {first: 'Jane'}, role: 'moderator'}]},
    {users: [{name: {first: 'Mary'}, role: 'admin'}]}
  ]})).toEqual([
    {users: [{name: {first: 'Joe'}, role: 'admin'},
    {name: {first: 'Jane'}, role: 'moderator'}]}
  ]);
});
```
我们需要在`deepCompare`中引入一个特殊的情况。当你看到的actual值为一个数组，我们为每项递归调用`deepCompare`，并且如果匹配任意项则返回`true`:
```js
function deepCompare(actual, expected, comparator) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
        return !deepCompare(actual, expected.substring(1), comparator);
    }
    if (_.isArray(actual)) {
      return _.some(actual, function(actualItem) {
        return deepCompare(actualItem, expected, comparator);
      });
    }
    if (_.isObject(actual)) {
        if (_.isObject(expected)) {
          return _.every(
            _.toPlainObject(expected),
            function(expectedVal, expectedKey) {
              if (_.isUnde ned(expectedVal)) {
                return true;
              }
              return deepCompare(actual[expectedKey], expectedVal, comparator);
            }
        );
    } else {
        return _.some(actual, function(value, key) {
            return deepCompare(value, expected, comparator);
        });
    }
    } else {
        return comparator(actual, expected);
  }
}
```
我们队已经实现的规则对象匹配是相当灵活的，但事实证明它仍然有点过于宽松。当有一个规则像`{user: {name: ‘Bob’}}`,我们希望它只匹配有一个`user`属性，
反过来有一个`name`属性包含`Bob`的对象。我们不想在任何层级上匹配`Bob`:
```js
it('filters with nested objects on the same level only', function() {
  var items = [{user: 'Bob'},
               {user: {name: 'Bob'}},
               {user: {name: {first: 'Bob', last: 'Fox'}}}];
  var fn = parse('arr | filter:{user: {name: "Bob"}}');
  expect(fn({arr: [
      {user: 'Bob'},
      {user: {name: 'Bob'}},
      {user: {name: {first: 'Bob', last: 'Fox'}}}
  ]})).toEqual([
      {user: {name: 'Bob'}}
  ]);
});
```
这个测试是失败的，因为我们的规则也匹配`{user: {name: { rst: ‘Bob’, last: ‘Fox’}}}`。为什么会这样呢？

原因是，一旦我们遍历了actual对象和expected对象的`name`属性，expected的值将会成为原始字符串`Bob`。我们看到当我们实现了原始性的字符串匹配，`deepCompare`
匹配对actual对象所有嵌套的属性进行原始匹配。但是在这个用例中我们不希望这么做。我们只想在当前层级上匹配原始。

我们需要扩展`deepCompare`以便于它可以匹配不管是actual的对象的任意属性，还是当前正在检查的。这使用一个新参数`matchAnyProperty`来控制。
只有当它为`true`的时候，我们遍历actual对象去检查是否匹配。否则我们认为是简单原始类型的比较：
```js
function deepCompare(actual, expected, comparator, matchAnyProperty) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
        return !deepCompare(actual, expected.substring(1), comparator);
    }
    if (_.isArray(actual)) {
      return _.some(actual, function(actualItem) {
        return deepCompare(actualItem, expected, comparator);
      });
    }
    if (_.isObject(actual)) {
        if (_.isObject(expected)) {
          return _.every(
            _.toPlainObject(expected),
            function(expectedVal, expectedKey) {
              if (_.isUnde ned(expectedVal)) {
                return true;
              }
              return deepCompare(actual[expectedKey], expectedVal, comparator);
            }
          );
        } else if (matchAnyProperty) {
            return _.some(actual, function(value, key) {
                return deepCompare(value, expected, comparator);
            });
        } else {
            return comparator(actual, expected);
        }
    } else {
        return comparator(actual, expected);
  }
}
```
从断言函数，我们现在需要为这个参数传递`true`值重置默认行为，我们需要匹配任何属性：
```js
return function predicateFn(item) {
    return deepCompare(item, expression, comparator, true);
};
```
我们也需要维持这个参数在所有使用`deepCompare`的递归调用中，与里面的`_.every`函数例外一样，我们不想匹配所有的属性：
```js
function deepCompare(actual, expected, comparator, matchAnyProperty) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
        return !deepCompare(actual, expected.substring(1), comparator, matchAnyProperty);
    }
    if (_.isArray(actual)) {
      return _.some(actual, function(actualItem) {
        return deepCompare(actualItem, expected, comparator, matchAnyProperty);
      });
    }
    if (_.isObject(actual)) {
        if (_.isObject(expected)) {
          return _.every(
            _.toPlainObject(expected),
            function(expectedVal, expectedKey) {
              if (_.isUnde ned(expectedVal)) {
                return true;
              }
              return deepCompare(actual[expectedKey], expectedVal, comparator);
            }
          );
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