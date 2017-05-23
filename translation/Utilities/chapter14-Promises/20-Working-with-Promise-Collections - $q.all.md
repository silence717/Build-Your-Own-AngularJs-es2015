## Working with Promise Collections - $q.all
当你有多个异步任务需要去做，把他们当作一个Promises的集合真的非常有用。由于Promises只是简单的JavaScript对象，你可以很容易的使用任意函数和库来创建，
使用，并且转换集合。

然而，有时候Promise有集合处理方法是有用的，并且可以集合和处理异步操作。这里有[libraries that specialize in this](https://www.npmjs.com/package/async-q),
但是AnuglarJS有一个内置的方法，去处理Promise集合：`$q.all`。

`$q.all`方法需要一个Promises集合作为它的输入。它返回单一的Promise， resolve所有数组的结果。结果数组和每个Promise参数是一一对应的。这使得`$q.all`对于等待同时发生的
异步完成是一个非常有用的工具。
```js
describe('all', function() {
  
  it('can resolve an array of promises to array of results', function() {
    var promise = $q.all([$q.when(1), $q.when(2), $q.when(3)]);
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    
    $rootScope.$apply();
    
    expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
  });
  
});
```
这是一个新函数，我们将它为`$q`的一个公共方法暴露出去：
```js
function all(promises) {

}

return {
  defer: defer,
  reject: reject,
  when: when,
  resolve: when,
  all: all
};
```
这个函数创建一个结果数组，并且对每个给定的Promises添加一个callback。每一个回调对应结果的数组相应的index值：
```js
function all(promises) {
  var results = [];
  _.forEach(promises, function(promise, index) {
    promise.then(function(value) {
      results[index] = value;
    }); 
  });
}
```
函数也保存一个整数计数器，每当添加一个Promise回调，那么计数器也递增，回调被调用的时候递减：
```js
function all(promises) {
  var results = [];
  var counter = 0;
  _.forEach(promises, function(promise, index) {
  	counter++;
    promise.then(function(value) {
      results[index] = value;
      counter--;
    }); 
  });
}
```
当某个回调处理完计数器到0的时候，这意味着所有的Promises全部被resolved。如果我们只创建了一个Deferred，这个时候我们就可以resolved数组，我们需要对`$q.all`做一个实现：
```js
function all(promises) {
  var results = [];
  var counter = 0;
  var d = defer();
  _.forEach(promises, function(promise, index) {
  	counter++;
    promise.then(function(value) {
      results[index] = value;
      counter--;
      if (!counter) {
        d.resolve(results);
      }
    }); 
  });
  return d.promise;
}
```
`$q.all`不仅可以在数组上工作，并且可以作用于对象。如果你给它一个对象并且值为Promises，它返回一个具有相同key的resolve Promise对象。在结果对象中
它的值是最初的Promise的resolutions:
```js
it('can resolve an object of promises to an object of results', function() {
  var promise = $q.all({a: $q.when(1), b: $q.when(2)});
  var fulfilledSpy = jasmine.createSpy();
  promise.then(fulfilledSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith({a: 1, b: 2});
});
```
当初始化结果集合，我们应该检测输入的集合是否是一个数组或者一个对象，并且让结果集合匹配这个类型。剩下的代码将会工作，因为`_.forEach`对数组和对象处理是一样的:
```js
function all(promises) {
  var results = _.isArray(promises) ? [] : {};
  var counter = 0;
  var d = defer();
  _.forEach(promises, function(promise, index) {
  	counter++;
    promise.then(function(value) {
      results[index] = value;
      counter--;
      if (!counter) {
        d.resolve(results);
      }
    }); 
  });
  return d.promise;
}
```
我们现在的`$q.all`实现由一个问题，那就是输入的数组是一个空的，Promise结果永远不会被resolve。用户希望将它resolve为一个空数组:
```js
it('resolves an empty array of promises immediately', function() {
  var promise = $q.all([]);
  var fulfilledSpy = jasmine.createSpy();
  promise.then(fulfilledSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith([]);
});
```
同样对于空对象也是一样的。如果我们给一个空对象给`$q.all`，我们不会得到任何的返回：
```js
it('resolves an empty object of promises immediately', function() {
  var promise = $q.all({});
  var fulfilledSpy = jasmine.createSpy();
  promise.then(fulfilledSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith({});
});
```
因此空几个需要特殊处理。我们能做的就是在Promise集合循环技术以后添加一个额外的检测：如果计数器已经为0，我们没有事情可以做，并且立刻resolve：
```js
function all(promises) {
  var results = _.isArray(promises) ? [] : {};
  var counter = 0;
  var d = defer();
  _.forEach(promises, function(promise, index) {
  	counter++;
    promise.then(function(value) {
      results[index] = value;
      counter--;
      if (!counter) {
        d.resolve(results);
      }
    }); 
  });
  if (!counter) {
    d.resolve(results);
  }
  return d.promise;
}
```
正如我们看到的一样，不是所有的事情都按照计划来，Promise可能会被rejected而不是resolved。当一个或者多个Promises被rejected`$q.all`应该做点什么？

返回的Promise被reject要做什么。如果其中一个promise呗reject那么所有的Promise都会失效：
```js
it('rejects when any of the promises rejects', function() {
  var promise = $q.all([$q.when(1), $q.when(2), $q.reject('fail')]);
  var fulfilledSpy = jasmine.createSpy();
  var rejectedSpy  = jasmine.createSpy();
  promise.then(fulfilledSpy, rejectedSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).not.toHaveBeenCalled();
  expect(rejectedSpy).toHaveBeenCalledWith('fail');
});
```
我们可以通过对每个Promise提供失败回调来实现它。当其中一个失败回调被调用，我们立刻reject我们的Deferred。其他的输入的结果将被忽略：
```js
function all(promises) {
  var results = _.isArray(promises) ? [] : {};
  var counter = 0;
  var d = defer();
  _.forEach(promises, function(promise, index) {
  	counter++;
    promise.then(function(value) {
      results[index] = value;
      counter--;
      if (!counter) {
        d.resolve(results);
      }
    }, function(rejection) {
       d.reject(rejection);
    });
  });
  if (!counter) {
    d.resolve(results);
  }
  return d.promise;
}
```
我们几乎已经完成了`$q.all`，但是还有一个小功能：实际上不是给`$q.all`集合的每项都会是一个Promise。集合中的某些甚至所有的值都只是普通值，
它们在最终的结果中不受影响：
```js
it('wraps non-promises in the input collection', function() {
  var promise = $q.all([$q.when(1), 2, 3]);
  var fulfilledSpy = jasmine.createSpy();
  promise.then(fulfilledSpy);
  
  $rootScope.$apply();
  
  expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
});
```
我们可以通过简单的传递每个值给`when`在添加到回调之前。再次调用`when`需要一个普通值或者一个then对象，并且返回一个Promise:
```js
function all(promises) {
  var results = _.isArray(promises) ? [] : {};
  var counter = 0;
  var d = defer();
  _.forEach(promises, function(promise, index) {
  	counter++;
    when(promise).then(function(value) {
      results[index] = value;
      counter--;
      if (!counter) {
        d.resolve(results);
      }
    }, function(rejection) {
       d.reject(rejection);
    });
  });
  if (!counter) {
    d.resolve(results);
  }
  return d.promise;
}
```
这就是`$q.all`！它本身非常有用，并且提供了为组成Promises提供了一个简单的例子。其他类似的Promise集合有效方法，像`filter`和`reduce`，
使用相似的方式可以简单的创建。