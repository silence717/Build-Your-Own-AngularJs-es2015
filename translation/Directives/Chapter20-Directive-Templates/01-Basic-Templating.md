## Basic Templating
指令模板背后的想法很简单：一个指令可能会定义一个`template`属性在它自己的指令定义对象。这个属性是HTML代码的字符串。当指令编译到一个DOM树上的元素，这个元素的内容将用HTML代码填充。

这里的行为是这样的：
```js
describe('template', function() {
  it('populates an element during compilation', function() {
    var injector = makeInjectorWithDirectives('myDirective', function() {
      return {
        template: '<div class="from-template"></div>'
      };
    });
    injector.invoke(function($compile) {
      var el = $('<div my-directive></div>');
      $compile(el);
      expect(el. nd('> .from-template').length).toBe(1);
    }); 
  });
});
```
如果你在一个元素上使用模板指令的时候已经有了一些内容，这些内容被模板所替代。