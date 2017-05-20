## Notifying Progress
有时候，当你执行异步工作的时候，你会有一些当前进度的可用信息，还剩下多少工作。虽然你还没有准备好resolve Promise,你可能想向下传递一些接下来要做的信息。

Angular的`$q`有一个内置的功能用于发生这种信息:`Deferred`的`notify`方法。你可以调用它的一些值，传递给任何人听。你也可以通过`then`的第三个callback来注册接收进度信息：
```js
it('can report progress', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  d.promise.then(null, null, progressSpy);
 
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('working...');
});
```
`notify`与`resolve`和`reject`最大的区别是：你可以多次调用`notify`，并且你的callback会被多次执行。这种情况`resolve`和`reject`都不会出现，因为一个 Promise 
不会被resolve或者reject大于一次。

```js
it('can report progress many times', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  d.promise.then(null, null, progressSpy);
  
  d.notify('40%');
  $rootScope.$apply();
  
  d.notify('80%');
  d.notify('100%');
  $rootScope.$apply();
  
  expect(progressSpy.calls.count()).toBe(3);
});
```
我们做这个工作的第一步是在then中抓住进度callback。我们只将它添加到pending数组的第四项：
```js
Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
    var result = new Deferred();
    this.$$state.pending = this.$$state.pending || [];
    this.$$state.pending.push([result, onFulfilled, onRejected, onProgress]);
    if (this.$$state.status > 0) {
      scheduleProcessQueue(this.$$state);
    }
    return result.promise;
};
```
现在我们可以实现`notify`方法。它遍历所有的pending处理程序，并且调用他们的progress callback。为了遵从一般的promise规则，当`notify`被调用的时候，callback不会被立即调用，
但是异步会晚一点。为了实现这个，我们再次使用` $rootScope`的`$evalAsync`函数：
```js
Deferred.prototype.notify = function(progress) {
  var pending = this.promise.$$state.pending;
  if (pending && pending.length) {
    $rootScope.$evalAsync(function() {
      _.forEach(pending, function(handlers) {
        var progressBack = handlers[3];
        if (_.isFunction(progressBack)) {
          progressBack(progress);
        }
    }); 
   });
  } 
};
```
一旦我们考虑了Promise被resolution后会发生什么，Promise的一次性就会生效。在这点上，`notify`不应该再调用progress callback：
```js
it('does not notify progress after being resolved', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  d.promise.then(null, null, progressSpy);
  
  d.resolve('ok');
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).not.toHaveBeenCalled();
});
```
在rejection之后也是一样的 - `notify`不能做任何事情：
```js
it('does not notify progress after being rejected', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  d.promise.then(null, null, progressSpy);
  
  d.reject('fail');
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).not.toHaveBeenCalled();
});
```
我们可以通过给`notify`添加额外的检测与它相关联的promise来满足这些测试用例。如果存在任意一种有价值的值，那么通知就会被跳过：
```js
Deferred.prototype.notify = function(progress) {
    var pending = this.promise.$$state.pending;
    if (pending && pending.length && !this.promise.$$state.status) {
        $rootScope.$evalAsync(function() {
          _.forEach(pending, function(handlers) {
            var progressBack = handlers[3];
            if (_.isFunction(progressBack)) {
              progressBack(progress);
            }
        }); 
      });
    } 
};
```
当进入Promise 链时，通知系统就有一些有趣的属性。首先，通知通过链传递。当你在一个 Deferred 上`notify`，链上的其他Promise也会得到通知，所以你可以这样做：
```js
it('can notify progress through chain', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  
  d.promise
    .then(_.noop)
    .catch(_.noop)
    .then(null, null, progressSpy);
  
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('working...');
});
```
为了实现这个，我们可以利用一个事实，在pending的handlers的数组每项，`Deferred`链都会被存储为第一项。我们仅仅在`Deferred`链调用`notify`:
```js
Deferred.prototype.notify = function(progress) {
    var pending = this.promise.$$state.pending;
    if (pending && pending.length && !this.promise.$$state.status) {
        $rootScope.$evalAsync(function() {
          _.forEach(pending, function(handlers) {
          	var deferred = handlers[0];
            var progressBack = handlers[3];
            if (_.isFunction(progressBack)) {
              progressBack(progress);
            }
            deferred.notify(progress);
        }); 
      });
    } 
};
```
当你在链上有好几个progress callback的时候，它变得更加有趣。每个progress处理程序的返回值变为下一个进度的通知。通过链你可以有效的传递进度信息：
```js
it('transforms progress through handlers', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  
  d.promise
    .then(_.noop)
    .then(null, null, function(progress) {
      return '***' + progress + '***';
    })
    .catch(_.noop)
    .then(null, null, progressSpy);
  
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('***working...***');
});
```
我们通过将当前progress callback的返回值，如果有的话，通知到下一个Deferred去实现：
```js
Deferred.prototype.notify = function(progress) {
  var pending = this.promise.$$state.pending;
  if (pending && pending.length &&
      !this.promise.$$state.status) {
    $rootScope.$evalAsync(function() {
      _.forEach(pending, function(handlers) {
        var deferred = handlers[0];
        var progressBack = handlers[3];
        deferred.notify(_.isFunction(progressBack) ?
                          progressBack(progress) :
                          progress
        );        
       }); 
    });
  } 
};
```
当其中一个progress callback抛出异常的时候，我们不应该让它干扰其他的callbacks:
```js
it('recovers from progressback exceptions', function() {
  var d = $q.defer();
  var progressSpy  = jasmine.createSpy();
  var fulfilledSpy = jasmine.createSpy();
  
  d.promise.then(null, null, function(progress) {
    throw 'fail';
  });
  d.promise.then(fulfilledSpy, null, progressSpy);
  
  d.notify('working...');
  d.resolve('ok');
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('working...');
  expect(fulfilledSpy).toHaveBeenCalledWith('ok');
});
```
所以我们把每个progress callback都是要`try..catch`包裹起来。如果异常发生，除了记录错误之外我们不会做其他任何事情：
```js
Deferred.prototype.notify = function(progress) {
  var pending = this.promise.$$state.pending;
  if (pending && pending.length &&
      !this.promise.$$state.status) {
    $rootScope.$evalAsync(function() {
      _.forEach(pending, function(handlers) {
        var deferred = handlers[0];
        var progressBack = handlers[3];
        try {
            deferred.notify(_.isFunction(progressBack) ?
                              progressBack(progress) :
                              progress
            );
        } catch (e) {
          console.log(e);
        }
       }); 
    });
  } 
};
```
通知也在Primuse的异步处理程序上工作。当一个Promise等待另一个resolve，并且我们等待Promise发出一个通知，通知会传递到链的callbacks：
```js
it('can notify progress through promise returned from handler', function() {
  var d = $q.defer();
  
  var progressSpy = jasmine.createSpy();
  d.promise.then(null, null, progressSpy);
  
  var d2 = $q.defer();
  // Resolve original with nested promise
  d.resolve(d2.promise);
  // Notify on the nested promise
  d2.notify('working...');
  
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('working...');
});
```
我们小做的就是将`notify`方法作为progress callback绑定到Promise的、上，像我们对`resolve`和`reject`做的一样：
```js
Deferred.prototype.resolve = function(value) {
  if (this.promise.$$state.status) {
    return; 
  }
  if (value && _.isFunction(value.then)) {
    value.then(
      _.bind(this.resolve, this),
      _.bind(this.reject, this),
      _.bind(this.notify, this)
    );    
  } else {
    this.promise.$$state.value = value;
    this.promise.$$state.status = 1;
    scheduleProcessQueue(this.promise.$$state);
  } 
};
```
最后，你也可以在使用`finally`的时候添加一个progress callback。你把它作为第二个参数，在最终处理程序本身：
```js
it('allows attaching progressback in finally', function() {
  var d = $q.defer();
  var progressSpy = jasmine.createSpy();
  d.promise.finally(null, progressSpy);
  
  d.notify('working...');
  $rootScope.$apply();
  
  expect(progressSpy).toHaveBeenCalledWith('working...');
});
```
`finally`的实现我们仅仅通过传递参数给`then`：
```js
Promise.prototype.finally = function(callback, progressBack) {
    return this.then(function(value) {
      return handleFinallyCallback(callback, value, true);
    }, function(rejection) {
      return handleFinallyCallback(callback, rejection, false);
    }, progressBack);
};
```
