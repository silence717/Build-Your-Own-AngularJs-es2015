## ES2015-Style Promises
正如我们在本章一开始讨论的，ECMAScript 2015版本的JavaScript语言 - 带有一个内置实现的Promise。`$q`中我们已经实现的Promise与标准的实现友好互通，因为它可以
链并且组成其他的类Promise对象有一个`then`方法，ES2015也有一个。

如果你想更深入一些，使用一种更接近标准实现的Promise风格。`$q`支持非常好。最主要的区别是我们前面看到的ES2015标准Promise没有将Deferreds作为一个明确的概念。
代替的是，你仅仅需要创建一个新Promise，给它一个函数作为参数。这个函数接收两个callbacks，`resolve`和`reject`，你可以在resolve和reject准备好的时候区别去调用他们。

ES6 promise可以替换为这样：
```js
var deferred = Q.defer();
doAsyncStuff(function(err) {
  if (err) {
    deferred.reject(err);
} else {
    deferred.resolve();
  }
});
return deferred.promise;
```
与此同时：
```js
return new Promise(function(resolve, reject) {
  doAsyncStuff(function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(); 
      }
  }); 
});
```
因此Deferred对象本身被这些嵌套的callbacks所取代，留下的`Promise`成为唯一有明确API概念。

让我们来看一下`$q`如何支持类似的API。首先，`$q`实际上本身是一个函数：
```js
describe('ES2015 style', function() {
  
	it('is a function', function() {
    expect($q instanceof Function).toBe(true);
  });
	
});
```
在我们的provider里面创建一个叫做`$Q`的函数，然后仅仅添加我们目前看到的所有参数作为此函数的属性:
```js
var $Q = function Q() {
};
return _.extend($Q, {
    defer: defer,
    reject: reject,
    when: when,
    resolve: when,
    all: all
});
```
像ES2015 Promise的构造函数，这个新函数需要一个函数作为参数。我们将调用 resolve function,这是强制性的:
```js
it('expects a function as an argument', function() {
  expect($q).toThrow();
  $q(_.noop); // Just checking that this doesn't throw
});
```

```js
// q.js
var $Q = function Q(resolver) {
	if (!_.isFunction(resolver)) {
      throw 'Expected function, got ' + resolver;
    }
}
```
你从这个函数返回的是一个Promise:
```js
it('returns a promise', function() {
  expect($q(_.noop)).toBeDefined();
  expect($q(_.noop).then).toBeDefined();
});
```
在内部，这可以使用我们已经存在的`defer`函数去实现：
```js
var $Q = function Q(resolver) {
  if (!_.isFunction(resolver)) {
    throw 'Expected function, got ' + resolver;
  }
  var d = defer();
  return d.promise;
};
```
就像我们之前看到的ES2015的例子一样，resolver函数作为一个resolve的回调参数而被调用。当回调被调用，那Promise也被resolved：
```js
it('calls function with a resolve function', function() {
  var fulfilledSpy = jasmine.createSpy();
  $q(function(resolve) {
    resolve('ok');
  }).then(fulfilledSpy);
  $rootScope.$apply();
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
});
```
我们实际上可以通过在`Deferred`中传递`resolve`方法来实现resolve函数 - 只要我们传递之前正确的绑定`this`的值：
```js
var $Q = function Q(resolver) {
  if (!_.isFunction(resolver)) {1
    throw 'Expected function, got ' + resolver;
  }
  var d = defer();
  resolver(_.bind(d.resolve, d));
  return d.promise;
};
```
对于`reject`有一个相同的情况: 它被当作第二个参数传递到resolver函数。如果它被resolver调用,Promise 被 rejected:
```js
it('calls function with a reject function', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  $q(function(resolve, reject) {
    reject('fail');
  }).then(fulfilledSpy, rejectedSpy);
  $rootScope.$apply();
  expect(fulfilledSpy).not.toHaveBeenCalled();
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
我们实现rejection回调实际上和resolve一样：它是`Deferred`的`reject`方法，预绑定：
```js
var $Q = function Q(resolver) {
  if (!_.isFunction(resolver)) {
    throw 'Expected function, got ' + resolver;
  }
  var d = defer();
  resolver(
    _.bind(d.resolve, d),
    _.bind(d.reject, d)
  );
  return d.promise;
};
```
对于`$q`我们有一个ES2015式的API！ 它只是在本章实现的`Deferred`外层添加了一层薄薄的修饰，但是在这里对于你来说只是使用一个更加接近于ES2015标准的Promise。