## Disallowing More Than One Template Directive Per Element
由于模板指令替换了元素的内容，所以在同一个元素上使用两个或多个模板来执行元素指令是毫无意义的。只有最后一个模板仍然存在。

当你尝试这么做的时候，Angular会显式的抛出一个异常，因此这个问题对于应用开发者是很明显的：
```js
it('does not allow two directives with templates', function() {
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {template: '<div></div>'};
        },
        myOtherDirective: function() {
            return {template: '<div></div>'};
        }
    });
    injector.invoke(function($compile) {
        var el = $('<div my-directive my-other-directive></div>');
        expect(function() {
            $compile(el);
        }).toThrow();
    });
});
```
这个的实现和我们检查重复继承scopes的非常类似。我们引入一个变量跟踪到目前为止我们看到的模板指令:
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [], controllers = {};
  var newScopeDirective, newIsolateScopeDirective;
  var templateDirective;
  var controllerDirectives;
// ...
}
```
现在我们已经有了变量，当遇到一个模板指令的时候可以对它赋值，并检查我们在这之前有没有遇到：
```js
if (directive.template) {
    if (templateDirective) {
      throw 'Multiple directives asking for template';
    }
    templateDirective = directive;
    $compileNode.html(directive.template);
}
```