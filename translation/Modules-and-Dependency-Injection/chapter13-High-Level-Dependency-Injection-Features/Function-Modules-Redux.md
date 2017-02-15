## Function Modules Redux
有了这个新值出现，并且有`HashMap`的实现，我们现在可以修复`injector_spec.js`失败的测试，并且确保所有的函数模块也最多加载一次。

首先在文件上部我们引入`HashMap`:
```js
'use strict';
var _ = require('lodash');
var HashMap = require('./hash_map').HashMap;
```
接下来，我们将`loadedModules`变量从一个对象转换为一个`HashMap`的实例：
```js
var loadedModules = new HashMap();
```
最后，在模块加载循环我们可以扩展`loadedModules`检测，不仅考虑字符串模块，并且包括各种类型模块：
```js
_.forEach(modulesToLoad, function loadModule(module) {
    if (!loadedModules.get(module)) {
        loadedModules.put(module, true);
        if (_.isString(module)) {
          module = window.angular.module(module);
          _.forEach(module.requires, loadModule);
          runInvokeQueue(module._invokeQueue);
          runInvokeQueue(module._con gBlocks);
          runBlocks = runBlocks.concat(module._runBlocks);
        } else if (_.isFunction(module) || _.isArray(module)) {
          runBlocks.push(providerInjector.invoke(module));
        }
    }
});
```