## Integrating Scopes, Expressions, and Filters with The Injector
为了总结我们的依赖注入的覆盖范围，我们将回到本书早期写的代码，并且将他们集成到模块和依赖注入中。这很重要，因为不这么做这些功能将不能暴露给应用开发者。

在第9章的开始，我们看到当你在`loader.js`中调用`setupModuleLoader()`的时候如何生成全局`angular`和模块。现在我们在它上面再添加一个层级。
在这个层我们设置模块加载，并且注册一些核心的组件给它。在这里我们将插入解析表达式，根作用域，过滤器服务和过滤器filter。

核心组件注册我们将在一个叫做`src/angular_public.js`新文件中。我们在`test/angular_public_spec.js`中写第一个测试：
```js
var publishExternalAPI = require('../src/angular_public');
describe('angularPublic', function() {
  it('sets up the angular object and the module loader', function() {
    publishExternalAPI();
    expect(window.angular).toBeDefined();
    expect(window.angular.module).toBeDefined();
  });
});
```
这实际上只是检查`publishExternalAPI`函数应该调用`setupModuleLoader`。这很容易实现：
```js
'use strict';
var setupModuleLoader = require('./loader');
function publishExternalAPI() {
    setupModuleLoader(window);
}
module.exports = publishExternalAPI;
```
这个函数应该做的是设置一个叫做`ng`的模块：
```js
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('angularPublic', function() {
  it('sets up the angular object and the module loader', function() {
    publishExternalAPI();
    expect(window.angular).toBeDefined();
    expect(window.angular.module).toBeDefined();
  });
  it('sets up the ng module', function() {
    publishExternalAPI();
    expect(createInjector(['ng'])).toBeDe ned();
  });
});
```
这个是通过调用`angular.module`实现：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = window.angular.module('ng', []);
}
```
`ng`模块是Angular自己提供的所有服务，指令，过滤器，和其他组件。就像我们看到的启动过程，这个模块会自动地包含到Angular的每个应用，因此作为一个应用开发者你甚至
意识不到它的存在。但是这是Angular暴露它自己的服务给其他的应用。