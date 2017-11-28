## Setting Attributes
一个标准化属性的对象在他们本身是普遍有用的，但是当我们不仅添加读，而且添加写属性的功能的时候，事情就变得强大。为了这个目的，这里的对象上面有一个`$set`方法：
```js
it('allows setting attributes', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive attr="true"></my-directive>',
    function(element, attrs) {
      attrs.$set('attr', 'false');
      expect(attrs.attr).toEqual('false');
    }
  ); 
});
```
属性对象选择有一个方法，这使得在原型上定义方法是有意义的。这将建议使用构造函数。这正是Angular做的：这里有一个`Attributes`构造函数定义在编译provider的`$get`方法。它需要一个元素作为参数：
```js
this.$get = ['$injector', function($injector) {
    function Attributes(element) {
      this.$$element = element;
    }
    // ...
}];
```
我们现在可以切换`compileNodes`里面的属性构造，使用新的构造代替使用使用对象字面量：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var attrs = new Attributes($(node));
    var directives = collectDirectives(node, attrs);
    var terminal = applyDirectivesToNode(directives, node, attrs);
    if (!terminal && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  }); 
}
```
现在我们需要的一个方法是`$set`。使我们的第一个测试通过，它仅仅设置属性的新值：
```js
function Attributes(element) {
  this.$$element = element;
}
Attributes.prototype.$set = function(key, value) {
  this[key] = value;
};
```
当你设置一个熟悉，你也希望它对应的DOM属性值可以刷新，而不是仅仅在JavaScript对象中改变它：
```js
it('sets attributes to DOM', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive attr="true"></my-directive>',
    function(element, attrs) {
      attrs.$set('attr', 'false');
      expect(element.attr('attr')).toEqual('false');
    }
  ); 
});
```
`$set`方法通过使用给定了`Attributes`构造器的元素实现这个：
```js
Attributes.prototype.$set = function(key, value) {
  this[key] = value;
  this.$$element.attr(key, value);
};
```
你也可以组织这种行为，通过传递第三个参数给`$set`设置它的值为`false`（任意的falsy在这里不会生效 - 它需要明确的`false`）：
```js
it('does not set attributes to DOM when  ag is false', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive attr="true"></my-directive>',
    function(element, attrs) {
      attrs.$set('attr', 'false', false);
      expect(element.attr('attr')).toEqual('true');
    }
  ); 
});
```
在实现中我们应该判断是否需要将值刷新到DOM，通过将第三个参数和`false`比较：
```js
Attributes.prototype.$set = function(key, value, writeAttr) {
    this[key] = value;
    if (writeAttr !== false) {
      this.$$element.attr(key, value);  
    }
};
```
为什么这样的功能是有用呢？为什么你想在元素上设置一个属性，但不真正在DOM中改变它？这里我们将介绍`Attributes`对象存在的另一个主要原因，除了DOM操作：指令之间的通信。

由于我们构建属性对象的方式，一个元素上所有的指令共享同一个对象：
```js
it('shares attributes between directives', function() {
  var attrs1, attrs2;
  var injector = makeInjectorWithDirectives({
    myDir: function() {
      return {
        compile: function(element, attrs) {
          attrs1 = attrs;
        }
      }; 
    },
    myOtherDir: function() {
      return {
        compile: function(element, attrs) {
          attrs2 = attrs;
        }
    }; 
  }
  });
  injector.invoke(function($compile) {
    var el = $('<div my-dir my-other-dir></div>');
    $compile(el);
    expect(attrs1).toBe(attrs2);
  }); 
});
```
由于他们共享相同的指令对象，指令可以使用这个对象互相发送信息。

由于DOM访问通常比纯JavsScript代码访问慢，Angular处于优化的目的在`$set`方法上提供可选的第三个参数，对于那些不关心DOM。只需要让其他指令知道属性改变的情况非常有用。