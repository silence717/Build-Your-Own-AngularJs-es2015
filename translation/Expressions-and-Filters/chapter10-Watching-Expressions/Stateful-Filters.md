## Stateful Filters
我们在本章中已经实现了常量优化和输入追踪，我们已经看到filter调用表达式和一般函数调用表达式的不同：filter表达式如果它们的参数都是常量那么它也是常量，
只有它们的inputs都被监控变化。

这个实现由一个相当重要的假设，即一个filter总是希望在相同的输入下返回相同的结果。换句话说，它期望filter是一个纯函数。

对于大多数过滤器 - 包含我们之前实现的filter filter - 这是事实上的情况。当你调用filter filter,或者调用多少次它都无所谓。给它输入相同的参数它总是返回相同的值。
这是一个函数有的很好的一个性能，因为它使得更容易理解，并且它允许我们做各种优化：当filter filter用在一个表达式，我们不需要重新计算，除非输入数组变化。这最终是一个
飞行显著的性能优化在许多应用中。

然而有时，这个假设不成立。可以想象的是有一个filter，即使inputs值没有变化，它的值可能会改变。这样filter的一个例子就是嵌入在表达式输入当前时间。Angular允许你
设置一个特殊的`$stateful`在这种filter上。如果设置为`true`，那么常量和输入追踪优化将不会用在它上面：
```js
it('allows $stateful filter value to change over time', function(done) {
  register('withTime', function() {
    return _.extend(function(v) {
      return new Date().toISOString() + ': ' + v;
    }, {
      $stateful: true
    });
 });
  var listenerSpy = jasmine.createSpy();
  scope.$watch('42 | withTime', listenerSpy);
  scope.$digest();
  var  rstValue = listenerSpy.calls.mostRecent().args[0];
  setTimeout(function() {
    scope.$digest();
    var secondValue = listenerSpy.calls.mostRecent().args[0];
    expect(secondValue).not.toEqual( rstValue);
    done();
 }, 100);
});
```
我们需要将`register`函数引入`scope_spec.js`，因为我们要在测试中使用它：
```js
'use strict';
var _ = require('lodash');
var Scope = require('../src/scope');
var register = require('../src/ lter').register;
```
这个测试失败因为watch每次计算的都是相同的值。这是因为它有一个常量的input没有发生变化。我们需要做的是在`parse.js`中为stateful filter进制常量和输入追踪。
```js
case AST.CallExpression:
    var stateless = ast.filter && !filter(ast.callee.name).$stateful;
    allConstants = stateless ? true : false;
    argsToWatch = [];
    _.forEach(ast.arguments, function(arg) {
      markConstantAndWatchExpressions(arg);
      allConstants = allConstants && arg.constant;
      if (!arg.constant) {
        argsToWatch.push.apply(argsToWatch, arg.toWatch);
      }
    });
    ast.constant = allConstants;
    ast.toWatch = stateless ? argsToWatch : [ast];
    break;
```