## Immediate Resolution - $q.when
`$q.reject`使你简单的创建了一个rejected Promise，有时候你也需要一个直接的resolved Promise。这是非常常见的，例如，缓存函数，可能会或者可能不需要异步，但可以
预见在这种情况下返回的Promise。为此，`$q.when`提供了一个`$q.reject`的镜像：
```js
it('can make an immediately resolved promise', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  
  var promise = $q.when('ok');
  promise.then(fulfiledSpy, rejectedSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
  expect(rejectedSpy).not.toHaveBeenCalled();
});
```
然而，这还不是`$q.when`的全部功能。它可以接收另一种类似promise的对象，并且将它转为Angular的原生Promise。这里我们有一个特定的"Promise"对象实现 - 一个有`then`
方法的对象。给这个对象`$q.when`之后，我们可以把它当做`$q`的promise对待，这是在这一点上做的：
```js
it('can wrap a foreign promise', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  
  var promise = $q.when({
    then: function(handler) {
      $rootScope.$evalAsync(function() {
        handler('ok');
      }); 
    }
  });
  promise.then(fulfilledSpy, rejectedSpy);
 
  $rootScope.$apply();
 
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
  expect(rejectedSpy).not.toHaveBeenCalled();
});
```
这里我们看`when`如何实现：
```js
function when(value) {
  var d = defer();
  d.resolve(value);
  return d.promise;
}
```
并且我们添加到`$q`的公共API：
```js
return {
  defer: defer,
  reject: reject,
  when: when
};
```
注意到，我们并没有做任何事情是的外部的Promise工作。这是因为我们的`then`实现已经知道如何包裹外部的Promise，并且`when`仅仅包裹了`then`。然而，使用`$q.when`
包裹外部的Promises是一个普通的模式，在这里值得强调。

一个额外的技巧，`$q.when`拥有了它的壳子，它可以支持promise的3种回调 - resolved,rejected和notify - 直接作为附加参数。你可以选择把这些直接给`when`，而不是
在Promise上额外调用`then`：
```js
it('takes callbacks directly when wrapping', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  var progressSpy  = jasmine.createSpy();
  
  var wrapped = $q.defer();
  $q.when(
    wrapped.promise,
    fulfilledSpy,
    rejectedSpy,
    progressSpy
  );
  
  wrapped.notify('working...');
  wrapped.resolve('ok');
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
  expect(rejectedSpy).not.toHaveBeenCalled();
  expect(progressSpy).toHaveBeenCalledWith('working...');
});
```
这可以使用链实现。我们可以给promise的`when`添加一个`then`处理，并且给调用者返回链式的promise:
```js
function when(value, callback, errback, progressback) {
    var d = defer();
    d.resolve(value);
    return d.promise.then(callback, errback, progressback);
}
```
`$q.when`提供的相同功能，在`$q.resolve`下也是同样有效的：
```js
it('makes an immediately resolved promise with resolve', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  
  var promise = $q.resolve('ok');
  promise.then(fulfilledSpy, rejectedSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
  expect(rejectedSpy).not.toHaveBeenCalled();
});
```
我们仅仅让`when`的实现通过`resolve`有效：
```js
return {
  defer: defer,
  reject: reject,
  when: when,
  resolve: when
};
```