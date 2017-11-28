## 自定义比较过滤器（Filtering With Custom Comparators）
你还可以自定义策略，通过该filter比较两个值，通过你自己提供的comparator函数作为第2个附加参数。例如，这里我们提供一个comparator去使用严格等式`===`比较两个值：
```js
it('allows using a custom comparator', function() {
  var fn = parse('arr | filter:{$: "o"}:myComparator');
  expect(fn({
    arr: ['o', 'oo', 'ao', 'aa'],
    myComparator: function(left, right) {
      return left === right;
    }
  })).toEqual(['o']);
});
```
这与前面提供的filter断言函数不同。然后一个filter断言决定，依据任意的规则，无论给的的项目是否可以通过filter,comparator函数比较给定的项与filter的值（或它的一部分）
并且决定他们应该如何比较。

我们需要接受filter函数需要第三个参数，并且把它传递到断言函数：
```js
function filterFilter() {
    return function(array, filterExpr, comparator) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn =  lterExpr;
    } else if (_.isString(filterExpr) ||
               _.isNumber(filterExpr) ||
               _.isBoolean(filterExpr) ||
               _.isNull(filterExpr) ||
               _.isObject(filterExpr)) {
        predicateFn = createPredicateFn(filterExpr, comparator);
    } else {
      return array;
    }
    return _.filter(array, predicateFn);
  };
}
```
在`createPredicateFn`我们现在只能形成自定义比较器，如果没有给出:
```js
function createPredicateFn(expression, comparator) {
    var shouldMatchPrimitives =
      _.isObject(expression) && ('$' in expression);
    if (!_.isFunction(comparator)) {
      comparator = function(actual, expected) {
        if (_.isUnde ned(actual)) {
          return false;
        }
        if (_.isNull(actual) || _.isNull(expected)) {
          return actual === expected;
        }
        actual = ('' + actual).toLowerCase();
        expected = ('' + expected).toLowerCase();
        return actual.indexOf(expected) !== -1;
    };
  }
  return function predicateFn(item) {
    if (shouldMatchPrimitives && !_.isObject(item)) {
      return deepCompare(item, expression.$, comparator);
    }
    return deepCompare(item, expression, comparator, true);
  };
}
```
你可以让filter知道它应该使用严格等值比较（而不是更宽松的字符串匹配），通过传递特殊值`true`在比较的地方：
```js
it('allows using an equality comparator', function() {
  var fn = parse('arr | filter:{name: "Jo"}:true');
  expect(fn({arr: [
    {name: 'Jo'},
    {name: 'Joe'}
  ]})).toEqual([
    {name: 'Jo'}
  ]);
});
```
如果你确实需要将filter与值精确匹配，不希望只匹配部分字符串。

当comparator的值为true，`createPredicateFn`将使用LoDash的`_.isEqual`函数作为比较器。如果两个值确实相等，那么返回true:
```js
function createPredicateFn(expression, comparator) {
    var shouldMatchPrimitives = _.isObject(expression) && ('$' in expression);
    if (comparator === true) {
      comparator = _.isEqual;
    } else if (!_.isFunction(comparator)) {
        comparator = function(actual, expected) {
          if (_.isUnde ned(actual)) {
            return false;
          }
          if (_.isNull(actual) || _.isNull(expected)) {
            return actual === expected;
          }
          actual = ('' + actual).toLowerCase();
          expected = ('' + expected).toLowerCase();
                return actual.indexOf(expected) !== -1;
          };
    }
    return function predicateFn(item) {
      if (shouldMatchPrimitives && !_.isObject(item)) {
        return deepCompare(item, expression.$, comparator);
      }
      return deepCompare(item, expression, comparator, true);
    };
  }
```
