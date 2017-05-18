## Exception Handling
实际上Promise 被 reject只是一种情况，当Promise执行callback的时候也可能会出错。当从Promise抛出一个异常，这会引起链中的下一个 rejection 处理被调用。它需要接收异常：
```js
it('rejects chained promise when handler throws', function() {
  var d = $q.defer();
  var rejectedSpy = jasmine.createSpy();
  
  d.promise.then(function() {
    throw 'fail';
  }).catch(rejectedSpy);
  d.resolve(42);
  
  $rootScope.$apply();
  
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
异常的传递发生在`processQueue`,我们调用handlers的地方。如果异常被抛出，它会捕获，并且链中的下一个 Deferred 被异常rejected:
```js
function processQueue(state) {
  var pending = state.pending;
  state.pending = undefined;
  _.forEach(pending, function(handlers) {
    var deferred = handlers[0];
    var fn = handlers[state.status];
    try {
      if (_.isFunction(fn)) {
        deferred.resolve(fn(state.value));
        } else if (state.status === 1) {
          deferred.resolve(state.value);
        } else {
          deferred.reject(state.value);
        }
    } catch (e) {
      deferred.reject(e);
    }  
  }); 
}
```
需要特别注意的是，一个异常不是 Deferred 的reject从 Promise 的handler抛出，但是链中的下一个。如果我们正执行一个 Promise handler，相应的 Deferred 必须已经
resolved（或者rejected），我们不会回去改变它。这意味着下面的测试用例通过，本就该如此：
```js
it('does not reject current promise when handler throws', function() {
  var d = $q.defer();
  
  var rejectedSpy = jasmine.createSpy();
  d.promise.then(function() {
    throw 'fail';
  });
  
  d.promise.catch(rejectedSpy);
  d.resolve(42);
  
  $rootScope.$apply();
  
  expect(rejectedSpy).not.toHaveBeenCalled();
});
```
这个测试用例和上一个的区别在于，我们在最初的 Promise 上设置了错误处理而不是链在成功处理上。这是一个重要区别。