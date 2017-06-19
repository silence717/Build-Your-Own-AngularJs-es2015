## Recursing to Child Elements
我们现在简单实现的指令只会迭代给定的的一级元素。我们期望它遍历任何层级的元素都是合理的：
```js
it('compiles element directives from child elements', function() {
  var idx = 1;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', idx++);
      } 
    };
  });
  injector.invoke(function($compile) {
    var el = $('<div><my-directive></my-directive></div>');
    $compile(el);
    expect(el.data('hasCompiled')).toBeUndefined();
    expect(el. nd('> my-directive').data('hasCompiled')).toBe(1);
  }); 
});
```
这里我们检查子元素`<my-directive>`已经编译。作为一个正常的检查，我们也看一下父节点`<div>`没有被编译。

我们的compiler应该也可以编译任意嵌套的指令元素：
```js
it('compiles nested directives', function() {
  var idx = 1;
  var injector = makeInjectorWithDirectives('myDir', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', idx++);
      }
  }; 
  });
  injector.invoke(function($compile) {
    var el = $('<my-dir><my-dir><my-dir></my-dir></my-dir></my-dir>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(1);
    expect(el. nd('> my-dir').data('hasCompiled')).toBe(2);
    expect(el. nd('> my-dir > my-dir').data('hasCompiled')).toBe(3);
  }); 
});
```
满足这个需求相当简单。我们需要做的是从`compileNodes`递归每一个节点的子节点：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var directives = collectDirectives(node);
    applyDirectivesToNode(directives, node);
    if (node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  }); 
}
```
在这里完成的顺序很重要：我们首先编译父节点，然后才是子节点。