## The angular Global
如果你曾经使用过Angular，你很可能和全局`angular`对象有过交流。这是我们引入这个对象的地方。

我们现在需要这个对象的原因就是，关于注册的Angular模块信息存储。在我们开始模块和注入之前，我们需要存储。

处理模块的框架组件叫做模块加载器，并且在一个叫做`loader.js`的文件中实现。这是我们将介绍的`angular`全局对象。但是首先，一如既往，我们先在一个新测试文件中添加一个测试：
```js
'use strict';
var setupModuleLoader = require('../src/loader');
describe('setupModuleLoader', function() {
  it('exposes angular on the window', function() {
    setupModuleLoader(window);
    expect(window.angular).toBeDe ned();
  });
});
```
这个测试假设一个叫做`loader.js`的文件里有一个叫做`setupModuleLoader`的函数。它还假设你可以使用一个`window`对象调用这个函数。当你这么做了，在这同一个`window`对象
上会有一个`angular`的属性。

我们开始创建一个`loader.js`并且使这个测试通过：
```js
'use strict';
function setupModuleLoader(window) {
  var angular = window.angular = {};
}
module.exports = setupModuleLoader;
```
这将从开始给我们一些东西。