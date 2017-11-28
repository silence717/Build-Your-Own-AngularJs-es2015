## Denormalizing Attribute Names for The DOM
随着属性对象我们使用规范化的属性名称：名字与实际DOM中的并不一样，相反它们更方便JavaScript的使用。
最值得注意的是，我们使用驼峰命名代替有连字符的名字。此外，正如我们在上一章中看到的一样，属性可能已经有了一些
特殊的前缀。

当我们设置一个属性，这就出现了问题。我们不能在DOM上设置一个标准化的名字，因为它不会像我们期望的那这样工作（除了简单的名字，像`attr`我们之前使用的）。
当我们刷新DOM的时候，我们需要反解属性名字。

我们有几种方式非规范化属性名称。最简单的方式就是当我们调用`$set`的时候提供一个非规范化的名字。它可以作为第4个参数：
```js
it('denormalizes attribute name when explicitly given', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive some-attribute="42"></my-directive>',
    function(element, attrs) {
      attrs.$set('someAttribute', 43, true, 'some-attribute');
      expect(element.attr('some-attribute')).toEqual('43');
    }
  ); 
});
```
在`$set`里面，当我们设置DOM属性的时候使用第4个参数作为名字。如果第4个参数不存在，我们像以前一样使用第1个参数：
```js
Attributes.prototype.$set = function(key, value, writeAttr, attrName) {
    this[key] = value;
    if (isBooleanAttribute(this.$$element[0], key)) {
      this.$$element.prop(key, value);
    }
    if (!attrName) {
      attrName = key;
    }
    if (writeAttr !== false) {
      this.$$element.attr(attrName, value);
    } 
};
```
可以这么做，但是不是一个非常友好的API。`$set`的调用者每次需要提供属性的两个版本，这远远不是最优的。

另一种方式去非规范化属性名是，没有显式提供的情况下使用snake-case:
```js
it('denormalizes attribute by snake-casing', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive some-attribute="42"></my-directive>',
    function(element, attrs) {
      attrs.$set('someAttribute', 43);
      expect(element.attr('some-attribute')).toEqual('43');
    }
  ); 
});
```
为了这个我们仅仅使用LoDash提供的`_.kebabCase`函数：
```js
Attributes.prototype.$set = function(key, value, writeAttr, attrName) {
  this[key] = value;
  if (isBooleanAttribute(this.$$element[0], key)) {
    this.$$element.prop(key, value);
  }
  if (!attrName) {
    attrName = _.kebabCase(key, '-');
  }
  if (writeAttr !== false) {
    this.$$element.attr(attrName, value);
  }
};
```
即使这样也不是很理想：就像我们讨论的，Angular在DOM属性上支持多种前缀，在标准化的过程中会忽略。这就像，当你`$set`一个属性，
你希望有原始前缀的DOM属性会更新。但是`_.kebabCase`不知道属性名称曾经有的的任何前缀。我们需要支持原始的前缀：
```js
it('denormalizes attribute by using original attribute name', function() {
	registerAndCompile(
        'myDirective',
        '<my-directive x-some-attribute="42"></my-directive>',
        function(element, attrs) {
          attrs.$set('someAttribute', '43');
          expect(element.attr('x-some-attribute')).toEqual('43');
        }
    ); 
});
```
一个例外就是`ng-attr-`前缀，当你`$set`一个属性的时候不会保留：
```js
it('does not use ng-attr- pre x in denormalized names', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive ng-attr-some-attribute="42"></my-directive>',
    function(element, attrs) {
      attrs.$set('someAttribute', 43);
      expect(element.attr('some-attribute')).toEqual('43');
    }
  ); 
});
```
在规范化之前，我们需要存储一个标准化的名字和他们对应的一个原始名字的*mapping*。这个映射将存储在`Attributes`实例的`$attr`字段中：
```js
function Attributes(element) {
  this.$$element = element;
  this.$attr = {};
}
```
在`$set`中，如果没有显式的传给函数我们从`$attr`中查找属性名称。作为最后的手段，我们将使用`_.kebabCase`,我们也会给`$attr`存储连字符版本为了将来调用`$set` 的好处：
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
  }
  if (writeAttr !== false) {
    this.$$element.attr(attrName, value);
  }
};  
```
这个mapping对象存在于`collectDirectives`。它可以访问属性对象，并且它将直接使用`$attr`属性去设置标准化到非标准化的mapping为每个元素属性
这在`_.forEach(node.attributes)`循环后面的`ng-attr-`前缀完成：
```js
function collectDirectives(node, attrs) {
  var directives = [];
  if (node.nodeType === Node.ELEMENT_NODE) {
    var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
    addDirective(directives, normalizedNodeName, 'E');
    _.forEach(node.attributes, function(attr) {
      var attrStartName, attrEndName;
      var name = attr.name;
      var normalizedAttrName = directiveNormalize(name.toLowerCase());
      var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
      if (isNgAttr) {
        name = _.kebabCase(
          normalizedAttrName[6].toLowerCase() +
          normalizedAttrName.substring(7)
        );
        normalizedAttrName = directiveNormalize(name.toLowerCase());
    }
    attrs.$attr[normalizedAttrName] = name;
    // ...
    });
    // ... 
   } // ...
}
```
最后，当你提供一个明确的参数名字作为第4个参数给`$set`，会发生非标准化的属性名称呢过将会重写你给的
参数。任何调用`$set`后，将会使用你明确提供的非标准化名称，原始的非标准化名称将不再使用：
```js
it('uses new attribute name after once given', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive x-some-attribute="42"></my-directive>',
    function(element, attrs) {
      attrs.$set('someAttribute', 43, true, 'some-attribute');
      attrs.$set('someAttribute', 44);
      expect(element.attr('some-attribute')).toEqual('44');
      expect(element.attr('x-some-attribute')).toEqual('42');
    }
  ); 
});
```
因此，如果`attrName`提供到`$set`，它也会更新到`$attr`对象：
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
};
```
