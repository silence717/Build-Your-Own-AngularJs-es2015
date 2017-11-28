## Filter With String
从开发者的角度来说，每次使用过滤器都需要设置断言函数不是很方便。这就是为什么filter为周围的需求提供了许多的方便。例如，你可以仅仅给filter一个字符串，
它将会对输入的数组匹配字符串对应的项:
```js
it('can filter an array of strings with a string', function() {
  var fn = parse('arr | filter:"a"');
  expect(fn({arr: ['a', 'b', 'a']})).toEqual(['a', 'a']);
});
```
我们需要开始检测给定的filter表达式的类型。如果我是一个函数，我们作为像之前一样的断言来使用它，但是如果是一个字符串，我们需要创建一个断言函数。如果filter表达式
是我们没识别的东西，我们将只是返回输入的数组，因为我们不知道应该如何过滤它：
```js
function  filterExpr() {
  return function(array, filterExpr) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn = filterExpr;
    } else if (_.isString(filterExpr)) {
      predicateFn = createPredicateFn(filterExpr);
    } else {
      return array;
    }
    return _.filter(array, predicateFn);
  };
}
```
现在，我们可以创建一个断言函数，用严格的等式比较将每个项与输入的字符串进行比较：
```js
function createPredicateFn(expression) {
  return function predicateFn(item) {
    return item === expression;
  };
}
```
事实上filter不是严格的。它实际上匹配包含给定输入字符串的任何字符串:
```js
it('filters an array of strings with substring matching', function() {
  var fn = parse('arr | filter:"o"');
  expect(fn({arr: ['quick', 'brown', 'fox']})).toEqual(['brown', 'fox']);
});
```
我们可以修改我们的断言去检测如果每项都包含输入表达式：
```js
function createPredicateFn(expression) {
  return function predicateFn(item) {
    return item.indexOf(expression) !== -1;
  };
}
```
filter也以不区分大小写的方式进行比较：
```js
it('filters an array of strings ignoring case', function() {
  var fn = parse('arr | filter:"o"');
  expect(fn({arr: ['quick', 'BROWN', 'fox']})).toEqual(['BROWN', 'fox']);
});
```
我们在检测它们是否相等前，应该先将表达式和每项的值都转换为小写：
```js
function createPredicateFn(expression) {
  return function predicateFn(item) {
    var actual = item.toLowerCase();
    var expected = expression.toLowerCase();
    return actual.indexOf(expected) !== -1;
  };
}
```
更有意思的是，当你输入的数组是由对象组成的，一个字符串的filter,任何对象内的值将会匹配。这意味着我们可以过滤非原始类型：
```js
it('filters an array of objects where any value matches', function() {
  var fn = parse('arr | filter:"o"');
  expect(fn({arr: [
    {firstName: 'John', lastName: 'Brown'},
    {firstName: 'Jane', lastName: 'Fox'},
    {firstName: 'Mary', lastName: 'Quick'}
  ]})).toEqual([
    {firstName: 'John', lastName: 'Brown'},
    {firstName: 'Jane', lastName: 'Fox'}
  ]);
});
```
在开始这项工作之前，我们重构一下当前的实现去独立一些担忧。比较两个值的责任，可以提取他们自己的`comparator`函数：
```js
function createPredicateFn(expression) {
    function comparator(actual, expected) {
      actual = actual.toLowerCase();
      expected = expected.toLowerCase();
      return actual.indexOf(expected) !== -1;
    }
    return function predicateFn(item) {
      return comparator(item, expression);
    };
}
```
现在我们可以引入另外一个函数，它需要一个actual和expected值和一个comparator。它知道如何"深度比较"这些值，如果actual值是一个对象，它将观察对象并且返回`true`
如果任意值在内部匹配。否则它仅仅直接使用comparator:
```js
function deepCompare(actual, expected, comparator) {
  if (_.isObject(actual)) {
    return _.some(actual, function(value) {
      return comparator(value, expected);
    });
  } else {
    return comparator(actual, expected);
  }
}
```
现在我们需要将断言工作分割为三个函数：
* `comparator` 比较两个原始类型的值
* `deepCompare`比较两个原始类型的值或者原始类型的对象到一个原始的
* `predicateFn`将`comparator`和`deepCompare`组织到一起形成最终的过滤器断言。

过滤器也应该可以递归嵌套的对象到任意深度：
```js
it('filters an array of objects where a nested value matches', function() {
  var fn = parse('arr |  lter:"o"');
  expect(fn({arr: [
    {name: {first: 'John', last: 'Brown'}},
    {name: {first: 'Jane', last: 'Fox'}},
    {name: {first: 'Mary', last: 'Quick'}}
  ]})).toEqual([
    {name: {first: 'John', last: 'Brown'}},
    {name: {first: 'Jane', last: 'Fox'}}
  ]);
});
```
这也适用于数组。如果我们有一个数组嵌套数组，filter返回所有匹配的嵌套数组：
```js
it('filters an array of arrays where a nested value matches', function() {
  var fn = parse('arr |  lter:"o"');
  expect(fn({arr: [
    [{name: 'John'}, {name: 'Mary'}],
    [{name: 'Jane'}]
  ]})).toEqual([
    [{name: 'John'}, {name: 'Mary'}]
  ]);
});
```
这可以通过将`deepCompare`改为递归函数实现。所有对象中的值（和数组）再次给`deepCompare`，并且`compare`仅仅在是叶节点看到的是原始类型的时候调用：
```js
function deepCompare(actual, expected, comparator) {
  if (_.isObject(actual)) {
    return _.some(actual, function(value) {
      return deepCompare(value, expected, comparator);
    });
  } else {
    return comparator(actual, expected);
  }
}
```