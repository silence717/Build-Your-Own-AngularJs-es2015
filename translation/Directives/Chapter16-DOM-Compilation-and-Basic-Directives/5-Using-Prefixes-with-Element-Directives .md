## Using Prefixes with Element Directives
我们已经看到了在DOM里面如何简单地将他们的名字和元素的名字来匹配然后应用指令。在本章的下面几部分，我们将看到一些其他的匹配方法。

首先，当匹配指令到元素名字，Angular让你使用前缀`x`和`data`在DOM：
```angular2html
<x-my-directive></x-my-directive>
<data-my-directive></data-my-directive>
```
另外除了连字符，你可以在前缀和指令名称之间使用冒号和下划线作为分隔符：
```angular2html
<x:my-directive></x:my-directive>
<x_my-directive></x_my-directive>
```
结合这两个选项，这里有6种可选的方式给元素添加前缀。为了测试它们，我们遍历它们并且为每个组合生成一个测试块：
```js
_.forEach(['x', 'data'], function(prefix) {
  _.forEach([':', '-', '_'], function(delim) {
    it('compiles element directives with '+prefix+delim+' prefix', function() {
      var injector = makeInjectorWithDirectives('myDir', function() {
        return {
          compile: function(element) {
            element.data('hasCompiled', true);
          }
        }; 
      });
      injector.invoke(function($compile) {
        var el = $('<'+prefix+delim+'my-dir></'+prefix+delim+'my-dir>');
        $compile(el);
        expect(el.data('hasCompiled')).toBe(true);
      }); 
    });
  }); 
});
```
我们将在`compile.js`顶部引入一个新的帮助函数去处理前缀匹配。它需要一个DOM元素名字作为参数，并且返回一个"统一化"的指令名字。这个程序移除任何前缀并且将名字驼峰化：
```js
function directiveNormalize(name) {
  return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}
```
前缀正则表达式匹配`x`或者`data`前缀忽略大小写，接着是三个分隔符的任意一个：
```js
var PREFIX_REGEXP = /(x[\:\-_]|data[\:\-_])/i;
```
在`collectDirectives`我们现在调用新的`directiveNormalize`替换对`_.camelCase`调用:
```js
function collectDirectives(node) {
  var directives = [];
  var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
  addDirective(directives, normalizedNodeName);
  return directives;
}
```