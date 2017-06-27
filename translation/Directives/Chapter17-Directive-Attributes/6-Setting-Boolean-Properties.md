## Setting Boolean Properties
当你设置一个熟悉，Angular做的另外一件事情就是使用`jQuery's prop function`设置它作为一个property，如果它看起来是一个布尔型属性：
```js
it('sets prop for boolean attributes', function() {
  registerAndCompile(
    'myDirective',
    '<input my-directive>',
    function(element, attrs) {
      attrs.$set('disabled', true);
      expect(element.prop('disabled')).toBe(true);
    }
  ); 
});
```
关键是，当我们选择不刷新DOM的时候这也会发生。当我们想改变DOM 属性的时候这个是非常有用的（例如`disabled`），但是不一定是DOM/HTML属性：
```js
it('sets prop for boolean attributes even when not flushing', function() {
  registerAndCompile(
    'myDirective',
    '<input my-directive>',
    function(element, attrs) {
      attrs.$set('disabled', true, false);
      expect(element.prop('disabled')).toBe(true);
    }
  ); 
});
```
在`$set`方法，如果属性看起来是布尔值我们设置prop。我们做这个不管`writeAttr`标识的值：
```js
Attributes.prototype.$set = function(key, value, writeAttr) {
  this[key] = value;
  if (isBooleanAttribute(this.$$element[0], key)) {
    this.$$element.prop(key, value);
  }
  if (writeAttr !== false) {
    this.$$element.attr(key, value);
  }
};
```