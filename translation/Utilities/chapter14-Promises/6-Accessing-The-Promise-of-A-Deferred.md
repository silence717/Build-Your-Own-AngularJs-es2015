## Accessing The Promise of A Deferred
Deferred 和 Promises 总是成对出现。不管你什么时候创建一个 Deferred，你也要创建一个 Promises。Promises通过Deferred的promise属性可以被访问。
```js
it('has a promise for each Deferred', function() {
  var d = $q.defer();
  expect(d.promise).toBeDefined();
});
```
在`$q`，这里对Promises也有一个内部的构造函数。`Deferred`构造函数调用Promise的构造函数创建一个新的Promise:
```js
this.$get = function() {
    function Promise() {
    }
    function Deferred() {
    this.promise = new Promise();
    }
    function defer() {
      return new Deferred();
    }
    return {
      defer: defer
    };
}
```