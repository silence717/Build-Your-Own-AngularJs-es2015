## Chaining Handlers on finally
之前我们实现`finanlly`,我们讨论过当需要支持 Promise 链的时候会再回来。现在我们这么做，一起看看Promise链和`finally`如何一起工作。

`finally`重要的另外一年就是它的返回值需要被忽略。最后只用于清理资源，它不影响一个Promise链的最终值。这意味着一个Promise链的任何值被resolved，都要经过
中间的`finally`处理：
```js
it('allows chaining handlers on finally, with original value', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  d.promise.then(function(result) {
    return result + 1;
  }). nally(function(result) {
    return result * 2;
  }).then(fulfilledSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith(21);
});
```
同样确切的行为适用于rejections。当一个Promise被rejected，rejection在链中通过最终处理程序到下一个rejection处理程序：
```js
it('allows chaining handlers on finally, with original rejection', function() {
  var d = $q.defer();
  
  var rejectedSpy = jasmine.createSpy();
  d.promise.then(function(result) {
    throw 'fail';
  }). nally(function() {
  }).catch(rejectedSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
因此，在`then`处理中设置`finally`，我们仅仅返回我们给定的值，以便于在链中下一个处理程序接收。我们自己的回调返回的什么会被忽略：
```js
Promise.prototype.finally = function(callback) {
  return this.then(function(value) {
  	callback();
    return value;
  }, function() {
    callback();
  }); 
};
```
对rejection做同样的事情，我们不能简单地返回它，因为它会传递到一个成功的处理中。我们需要为 rejection 创建一个新的rejected Promise：
```js
Promise.prototype. nally = function(callback) {
  return this.then(function(value) {
    callback();
    return value;
  }, function(rejection) {
    callback();
    var d = new Deferred();
    d.reject(rejection);
    return d.promise;
  }); 
};
```
由于在`finally`处理中执行的资源清理可能是异步本身，我们还应该支持`finally`返回的Promise。当一个Promise是从`finally`处理返回，我们应该等待它resolve在链继续
执行之前。然而，我们应该仍然忽略它resolved值，并且仅仅只使用最初的那个：
```js
it('resolves to orig value when nested promise resolves', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  var resolveNested;
  
  d.promise.then(function(result) {__
    return result + 1;
  }).finally(function(result) {
    var d2 = $q.defer();
    resolveNested = function() {
      d2.resolve('abc');
    };
    return d2.promise;
  }).then(fulfilledSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  expect(fulfilledSpy).not.toHaveBeenCalled();
  
  resolveNested();
  $rootScope.$apply();
  expect(fulfilledSpy).toHaveBeenCalledWith(21);
});
```
这里我们测试在finally处理中有一些异步工作，链没有立即resolve，但只有当异步被resolved。异步的值会被忽略。

再次，我们需要对rejection做同样的事情：如果一个Promise被rejected,任意异步`finally`处理和下一个rejection之间的处理会首先被resolved:
```js
it('rejects to original value when nested promise resolves', function() {
  var d = $q.defer();
  
  var rejectedSpy = jasmine.createSpy();
  var resolveNested;
  
  d.promise.then(function(result) {
    throw 'fail';
  }). nally(function(result) {
    var d2 = $q.defer();
    resolveNested = function() {
      d2.resolve('abc');
    };
    return d2.promise;
  }).catch(rejectedSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  expect(rejectedSpy).not.toHaveBeenCalled();
  
  resolveNested();
  $rootScope.$apply();
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
这里有一种情况，`finally`处理的结果没有被忽略，就是它自己被rejected。当这种情况发生，rejection从链中的任意前面一个值接管。我们不希望失败的资源清理被忽略：
```js
it('rejects when nested promise rejects in finally', function() {
  var d = $q.defer();
  
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy = jasmine.createSpy();
  var rejectNested;
  
  d.promise.then(function(result) {
    return result + 1;
  }). nally(function(result) {
    var d2 = $q.defer();
    rejectNested = function() {
      d2.reject('fail');
    };
    return d2.promise;
  }).then(fulfilledSpy, rejectedSpy);
  d.resolve(20);
  
  $rootScope.$apply();
  expect(fulfilledSpy).not.toHaveBeenCalled();
  
  rejectNested();
  $rootScope.$apply();
  expect(fulfilledSpy).not.toHaveBeenCalled();
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
因此，一旦我们进入`finally`处理，我们应该检测获取的这个值是否为一个Promise。如果是，我们处理链。链处理总是reslove最初的值，但是它没有rejection回调，这意味着不会从
`finally`handler传递任何rejections：
```js
Promise.prototype.finally = function(callback) {
    return this.then(function(value) {
    var callbackValue = callback();
    if (callbackValue && callbackValue.then) {
      return callbackValue.then(function() {
        return value;
    });
    } else {
      return value;
    }
    }, function(rejection) {
        callback();
        var d = new Deferred();
        d.reject(rejection);
        return d.promise;
    }); 
};
```
如果最初传递一个rejection，我们可以使用相似的诀窍：如果`finally`回调返回一个Promise, 等待它，并且转发rejection。在这个分支，最后的结果通常是一个rejected Promise-
一个最初的rejection或者一个来自`finally`的rejection:
```js
Promise.prototype. nally = function(callback) {
  return this.then(function(value) {
    var callbackValue = callback();
    if (callbackValue && callbackValue.then) {
      return callbackValue.then(function() {
        return value;
      });
    } else {
          return value;
        }
      }, function(rejection) {
    var callbackValue = callback();
    if (callbackValue && callbackValue.then) {
      return callbackValue.then(function() {
        var d = new Deferred();
        d.reject(rejection);
        return d.promise;
      });
    } else {
    var d = new Deferred();
      d.reject(rejection);
      return d.promise;
    }
  }); 
};
```
现在我们对`finally`有了一个完整的实现，但是还有一些细节。让我们添加几个帮助函数把它分解一下。

首先，我们使用一个常用的函数，它需要一个值和一个布尔标识，并且返回一个resolve或者reject值的Promise，依赖于布尔标识：
```js
function makePromise(value, resolved) {
  var d = new Deferred();
  if (resolved) {
    d.resolve(value);
  } else {
    d.reject(value);
  }
  return d.promise;
}
```
现在我们在`finally`里面使用这个新帮助函数：
```js
Promise.prototype.finally = function(callback) {
  return this.then(function(value) {
    var callbackValue = callback();
    if (callbackValue && callbackValue.then) {
      return callbackValue.then(function() {
        return makePromise(value, true);
      });
    } else {
        return value;
      }
    }, function(rejection) {
      var callbackValue = callback();
      if (callbackValue && callbackValue.then) {
        return callbackValue.then(function() {
          return makePromise(rejection, false);
        });
      } else {
      return makePromise(rejection, false);
    } 
  });
};
```
我们可以做的另外一件事情就是为finally回调做一个通用处理，我们可以在 resolution 和 rejection 中使用因为他们是相似的：
```js
Promise.prototype. nally = function(callback) {
  return this.then(function(value) {
    return handleFinallyCallback(callback, value, true);
  }, function(rejection) {
    return handleFinallyCallback(callback, rejection, false);
  });
};
```
这个帮助函数调用`finally`回调，然后为Promise返回最初的 resolution 或者 rejection。那就是，除非`finally`回调本身reject，在这种情况下，返回的Promise通常是被reject：
```js
function handleFinallyCallback(callback, value, resolved) {
  var callbackValue = callback();
  if (callbackValue && callbackValue.then) {
    return callbackValue.then(function() {
      return makePromise(value, resolved);
    });
  } else {
    return makePromise(value, resolved);
  }
}
```
总之，每当`finally`返回一个Promise,在继续之前我们等待它resolved。我们忽略了Promise的resolution，赞成最初的那个，除非当它reject，在链中我们rejection传递。