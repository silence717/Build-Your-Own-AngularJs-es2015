## Template Functions
`template`属性的值不是必须为字符串。它也可以是一个返回字符串的函数。这个函数的调用需要两个参数：要应用指令的DOM节点，这个节点的`Attributes`对象。这给你一个动态构建模板的机会：
```js
it('supports functions as template values', function() {
    var templateSpy = jasmine.createSpy().and.returnValue('<div class="from-template"></div>');
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                template: templateSpy
            };
        } });
    injector.invoke(function($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        expect(el. nd('> .from-template').length).toBe(1);
        // Check that template function was called with element and attrs
        expect(templateSpy.calls. rst().args[0][0]).toBe(el[0]);
        expect(templateSpy.calls. rst().args[1].myDirective).toBeDefined();
    });
});
```
如果template是一个函数，我们调用它代替直接使用它：
```js
if (directive.template) {
  if (templateDirective) {
    throw 'Multiple directives asking for template';
  }
  templateDirective = directive;
  $compileNode.html(_.isFunction(directive.template) ?
                    directive.template($compileNode, attrs) :
                    directive.template);
}
```