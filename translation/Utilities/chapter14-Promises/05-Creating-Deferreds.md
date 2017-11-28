## Creating Deferreds
我们在`$q`中首先创建的不是真正的 Promises，但是一个密切相关的概念叫作`Deferreds`。

如果 Promises 是一个有些值在将来变为有效的 promises,Deferred就是估算让这个值有效。这两个总是成对出现，但通常由代码的不同部分访问。

如果你认为它的数据流，数据的 producer 有一个 Deferred, 数据的 consumer 有一个 Promise。在一些点上，当producer将Deferred标为解决，consumer将会接收到Promise的值。

我们通过调用`$q`的`defer`方法创建一个 Deferred 。我们开始对`$q`测试：
```js
'use strict';
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
describe('$q', function() {
  var $q;
  beforeEach(function() {
    publishExternalAPI();
    $q = createInjector(['ng']).get('$q');
  });
  it('can create a deferred', function() {
    var d = $q.defer();
    expect(d).toBeDefined();
  });
});
```
在`$q`里，Deferred由一个叫做`Deferred`构造函数创建。然而，这仅仅是`$q`实现的细节，因为构造函数本身不对外暴露，对外的是`defer`方法：
```js
this.$get = function() {
    function Deferred() {
    }
    function defer() {
      return new Deferred();
    }
    return {
      defer: defer
    };
};
```