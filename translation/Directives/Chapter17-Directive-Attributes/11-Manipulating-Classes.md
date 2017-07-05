## Manipulating Classes
除了使属性可用金额观察外，`Attributes`对象也提供了一些帮助方法去操作元素的css样式：添加、删除、并更新他们。这些功能与class指令无关 - 它们的目的只是帮助更新DOM元素的
`class`属性。

你可以添加一个css class到元素使用`Attributes`上的`$addClass`方法，移除一个使用`$removeClass`方法：
```js
it('allows adding classes', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive></my-directive>',
    function(element, attrs) {
      attrs.$addClass('some-class');
      expect(element.hasClass('some-class')).toBe(true);
    }
  ); 
});
it('allows removing classes', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive class="some-class"></my-directive>',
    function(element, attrs) {
      attrs.$removeClass('some-class');
      expect(element.hasClass('some-class')).toBe(false);
    }
  ); 
});
```
你可以，当然，同样使用jQuery/jqLite元素添加classes。这实际上我们新方法需要做的：
```js
Attributes.prototype.$addClass = function(classVal) {
  this.$$element.addClass(classVal);
};
Attributes.prototype.$removeClass = function(classVal) {
  this.$$element.removeClass(classVal);
};
```
第三个，也是最后的Class才操作方法由`Attributes`提供的非常有趣。它需要两个参数：一个元素的新Class集合，一个旧class集合。然后比较这两个集合，添加第一个集合所有的class，
而不是第二个，并且移除第二个集合的所有class而不是第一个：
```js
it('allows updating classes', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive class="one three four"></my-directive>',
    function(element, attrs) {
      attrs.$updateClass('one two three', 'one three four');
      expect(element.hasClass('one')).toBe(true);
      expect(element.hasClass('two')).toBe(true);
      expect(element.hasClass('three')).toBe(true);
      expect(element.hasClass('four')).toBe(false);
    } 
  );
});
```
因此这个新函数需要新class和旧class作为参数，他们都作为字符串。首先我们要做的事情就是使用空格分割它们到独立的class名称数组：
```js
Attributes.prototype.$updateClass = function(newClassVal, oldClassVal) {
  var newClasses = newClassVal.split(/\s+/);
  var oldClasses = oldClassVal.split(/\s+/);
};
```
然后，我们计算这些数组在两个方向的集合差，并且最后将差异应用到元素中：
```js
Attributes.prototype.$updateClass = function(newClassVal, oldClassVal) {
  var newClasses = newClassVal.split(/\s+/);
  var oldClasses = oldClassVal.split(/\s+/);
  var addedClasses = _.difference(newClasses, oldClasses);
  var removedClasses = _.difference(oldClasses, newClasses);
  if (addedClasses.length) {
    this.$addClass(addedClasses.join(' '));
  }
  if (removedClasses.length) {
    this.$removeClass(removedClasses.join(' '));
  }
};
```