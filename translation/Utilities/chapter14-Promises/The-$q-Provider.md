## The $q Provider
在本章中我们将创建`$q`的实体，对 Angular 中的 Promise 形成一个完成的画像。首先，我们需要打基础。我们应该确保`$q`作为`ng`模块的一部分：
```js
it('sets up $q', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$q')).toBe(true);
});
```
为了让`$q`有效，我们去使用一个provider，就像`$parse`和`$rootScope`一样。这个provider在`q.js`这个文件中：
```js
'use strict';
function $QProvider() {
  this.$get = function() {
  };
}
module.exports = $QProvider;
```
为了使`$q`存活并且让测试通过，我们仍然需要给`ng`模块注册这个provider:
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
ngModule.provider('$q', require('./q'));
}
```