## Observing Attributes
正如我们讨论的，`Attributes`提供了一种指令和单个元素之间的通信方式。由一个指令改变的属性可以被另一额属性看到。

对于一个指令来说，通知另一个指令属性发生更改是非常有用的，这样当发生变化的时候我们就会立刻知道。
这可以通过`$watch`一个属性值来完成，但是Angular为了这个目的在这里有一个专门的机制，就是`$observe`属性的值：
```js
it('calls observer immediately when attribute is $set', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive some-attribute="42"></my-directive>',
    function(element, attrs) {
      var gotValue;
      attrs.$observe('someAttribute', function(value) {
        gotValue = value;
      });
      attrs.$set('someAttribute', '43');
      expect(gotValue).toEqual('43');
    } 
  );
});
```
有了`$observe`我们添加了一个函数给`Attributes`，当有人使用`$set`的时候立马调用这个函数，正如我们看到的。

`Attributes`对象维护一个观察者的注册表对象，键值是属性名，值是这个属性的观察者函数数组：
```js
Attributes.prototype.$observe = function(key, fn) {
  this.$$observers = this.$$observers || Object.create(null);
  this.$$observers[key] = this.$$observers[key] || [];
  this.$$observers[key].push(fn);
};
```
在`$set`的最后，我们调用所有为给定的属性注册的观察者：
```js
Attributes.prototype.$set = function(key, value, writeAttr, attrName) {
  this[key] = value;
  if (isBooleanAttribute(this.$$element[0], key)) {
    this.$$element.prop(key, value);
  }
  if (!attrName) {
    if (this.$attr[key]) {
      attrName = this.$attr[key];
    } else {
      attrName = this.$attr[key] = _.kebabCase(key);
     }
  } else {
    this.$attr[key] = attrName;
  }
  if (writeAttr !== false) {
    this.$$element.attr(attrName, value);
  }
  if (this.$$observers) {
    _.forEach(this.$$observers[key], function(observer) {
      try {
        observer(value);
      } catch (e) {
        console.log(e);
      }
    }); 
  }
};
```
注意到我们将observer的调用包含在`try..catch`块里面。我们这么做的原因和`$watch`相同，和本书第一部分的事件监听也一样：
如果一个observer抛出异常，则不应导致其他observer跳过。

属性观察是一个传统的`Observer Pattern`的应用。通过使用`$watch`也可以达到相同的目标，`$observers`的好处是给`$digest`
不会造成任何压力。尽管`$watch`函数需要在每个digest中执行，一个`$observers`只有在观察到属性被设置的时候才会执行。剩下的时间它不会造成任何的CPU消耗。

注意到`$observer`在`Attributes`对象外部发生的属性变化不会有反应。如果你设置一个属性给一个潜在的jQuery或者原始的DOM访问，不会有`$observer`被处罚。
属性观察与`$set`函数绑定。这是不使用`$watch`的性能优化。

因此，每当相应的属性被`$set``$observer`将会运行，但是他们一旦被初始化注册就会保证运行。这种情况发生在注册后的第一次`$digest`:
```js
it('calls observer on next $digest after registration', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive some-attribute="42"></my-directive>',
    function(element, attrs, $rootScope) {
      var gotValue;
      attrs.$observe('someAttribute', function(value) {
      	gotValue = value;
      });
      $rootScope.$digest();
      expect(gotValue).toEqual('42');
    }
  ); 
});   
```
第三个参数，`$rootScope`,测试回调函数是一个新函数。我们需要从`registerAndCompile`传递它：
```js
function registerAndCompile(dirName, domString, callback) {
  var givenAttrs;
  var injector = makeInjectorWithDirectives(dirName, function() {
    return {
      restrict: 'EACM',
      compile: function(element, attrs) {
        givenAttrs = attrs;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $(domString);
    $compile(el);
    callback(el, givenAttrs, $rootScope);
  }); 
}
```
为了从`Attributes`提取`$digest`，我们也需要访问Scope。我们只需要注入`$rootScope`到`CompileProvider`的`$get`方法：
```js
this.$get =  ['$injector', '$rootScope', function($injector, $rootScope) {
  // ...
}];
```
现在我们使用`$evalAsync`给下一次`$digest`添加一个回调。在回调里面我们仅仅调用observer函数使用当前属性的值：
```js
Attributes.prototype.$observe = function(key, fn) {
    var self = this;
    this.$$observers = this.$$observers || Object.create(null);
    this.$$observers[key] = this.$$observers[key] || [];
    this.$$observers[key].push(fn);
    $rootScope.$evalAsync(function() {
      fn(self[key]);
    });
};
```
即使observer通常与digest无关，他们仍然使用它为了初始化调用。`Scope.$evalAsync`仅仅提供了一个初始化异步调用的方便方式。
同样的情况可以使用超时来实现，但是这就是Angular的实现。

最后，一个observer可以使用相同的方式去移除，一个Watcher或者事件监听：
```js
it('lets observers be deregistered', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive some-attribute="42"></my-directive>',
    function(element, attrs) {
      var gotValue;
      var remove = attrs.$observe('someAttribute', function(value) {
        gotValue = value;
      });
      attrs.$set('someAttribute', '43');
      expect(gotValue).toEqual('43');
      remove();
      attrs.$set('someAttribute', '44');
      expect(gotValue).toEqual('43');
    } 
  );
});
```
这个函数的实现遵循我们之前看到的规则：在observers中找到对应函数的index，然后通过splicing在对应的index移除它：
```js
Attributes.prototype.$observe = function(key, fn) {
    var self = this;
    this.$$observers = this.$$observers || Object.create(null);
    this.$$observers[key] = this.$$observers[key] || [];
    this.$$observers[key].push(fn);
    $rootScope.$evalAsync(function() {
      fn(self[key]);
    });
    return function() {
      var index = self.$$observers[key].indexOf(fn);
      if (index >= 0) {
        self.$$observers[key].splice(index, 1);
      }  
    };
};
```