## Initializing The Global Just Once

First of all, we want to start with a clean slate for each and every unit test,
so we’ll need to get rid of any existing angular globals at the beginning of every test:

由于全局`angular`为注册的模块提供存储，它本质上是全局状态的持有者。这意味着我们需要采取一些措施去管理状态。首先，我们开始为每个单元测试有一个干净的基础，所以我们需要在
每个测试测试开始之前清除已经存在的全局`angular`：
```js
beforeEach(function() {
  delete window.angular;
});
```
同样的, 在`setupModuleLoader`中, 我们必须要小心, 不要覆盖了已经存在的`angular`全局对象， 即使`setupModuleLoader`被调用多次。
当你在相同的`window`对象调用`setupModuleLoader`两次, 结束后的`angular`全局对象应该指向完全相同的对象：
```js
it('creates angular just once', function() {
  setupModuleLoader(window);
  var ng = window.angular;
  setupModuleLoader(window);
  expect(window.angular).toBe(ng);
});
```
这个使用对已经存在`window.angular`进行简单检测来修复：
```js
function setupModuleLoader(window) {
    var angular = (window.angular = window.angular || {});
}
```
我们很快还会使用这种"load once"模式, 所以, 我们将它抽象成一个叫做`ensure`的通用函数。该函数需要三个参数: 一个对象, 一个属性名, 一个"工厂方法"。
该函数使用工厂方法仅当该属性不存在时生成一个属性：
```js
function setupModuleLoader(window) {
    var ensure = function(obj, name, factory) {
      return obj[name] || (obj[name] = factory());
    };
    var angular = ensure(window, 'angular', Object);
}
```
在这种情况下, 我们调用`Object()`方法赋给`window.angular`一个空对象, 意图和目的，实际上和调用`new Object()`一样.