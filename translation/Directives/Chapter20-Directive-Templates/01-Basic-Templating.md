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
如果你在一个元素上使用模板指令的时候已经有了一些内容，这些内容被模板所替代。在模板被应用后之前的子元素将不再存在：
```js
it('replaces any existing children', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
  return {
      template: '<div class="from-template"></div>'
    };
  });
  injector.invoke(function($compile) {
    var el = $('<div my-directive><div class="existing"></div></div>');
    $compile(el);
    expect(el. nd('> .existing').length).toBe(0);
  }); 
});
```
模板的内容不仅仅只是静态的HTML。我们可以通过应用指令在模板内的一个元素上并且监听它的compile函数来检测它：
```js
it('compiles template contents also', function() {
    var compileSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                template: '<div my-other-directive></div>'
            };
        },
        myOtherDirective: function() {
            return {
                compile: compileSpy
            };
        } });
    injector.invoke(function($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        expect(compileSpy).toHaveBeenCalled();
    });
});
```
这是模板的基本行为。我们看一下如何让它们工作。

在编译的过程中模板被应用，在`applyDirectivesToNode`函数。在这个函数中，我们遍历每个指令，我们仅仅检测他们中的一个是否有模板。如果有，我们将使用模板代替元素内的HTML:
```js
// ...
if (directive.controller) {
  controllerDirectives = controllerDirectives || {};
  controllerDirectives[directive.name] = directive;
}
if (directive.template) {
  $compileNode.html(directive.template);
}
if (directive.terminal) {
  terminal = true;
  terminalPriority = directive.priority;
}
// ...
```
这个很快通过了我们所有的测试！元素中存在的内容全部被模板代替，当我们最终编译元素的子元素时，模板中的元素已经存在了。

在本章的剩余部分，我们将处理指令模板的各种微妙部分，但是记住下面的内容，指令模板的思想和实现都很简单。
