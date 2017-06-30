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

