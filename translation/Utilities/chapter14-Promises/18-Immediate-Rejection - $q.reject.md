## Immediate Rejection - $q.reject

有时，编写一个函数，希望它返回一个Promise，事情没有解决你会马上知道。这种情况下。你想返回一个rejected的Promise而异步不做任何事情。使用我们现有的API是可以完成的：
```js
var d = $q.defer();
d.reject('fail');
return d.promise;
```
这是一个相当允长的方式来做它，并且这是一个常见的模式。$q提供了一个帮助方法简洁的实现相同的功能。它叫做`reject`:
```js
it('can make an immediately rejected promise', function() {
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  
  var promise = $q.reject('fail');
  promise.then(fulfilledSpy, rejectedSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).not.toHaveBeenCalled();
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
`reject`的实现就是我们上面的例子代码：
```js
function reject(rejection) {
  var d = defer();
  d.reject(rejection);
  return d.promise;
}
```
现在我们仅仅只需要将`reject`作为`$q`的公开API暴露出去：
```js
return {
  defer: defer,
  reject: reject
};  
```
