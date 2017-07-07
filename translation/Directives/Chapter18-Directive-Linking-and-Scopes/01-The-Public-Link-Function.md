## The Public Link Function
一般地，应用Angular指令到DOM树有两个过程：
1. Compile DOM树
2. 将编译后的DOM树连接到Scopes

第一步我们已经覆盖了，因此我们把注意力放到第二步上。

我们有一个为编译的服务叫作`$compile`，因此有人肯定期望有一个为链接类似的服务叫作`$link`。但事实不是这样的。在Angular中没有顶级的指令linking程序。相反，它是建立在`compile.js`中。

虽然编译和链接在同一个文件中实现，但它们仍然彼此分离。当调用`$compile`，没有linking发生。相反，当你调用`$compile`，它返回一个函数你可以稍后调用它来初始化linking。
这个函数叫做`public link function`:
```js
it('returns a public link function from compile', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {compile: _.noop};
  });
  injector.invoke(function($compile) {
    var el = $('<div my-directive></div>');
    var linkFn = $compile(el);
    expect(linkFn).toBeDefined();
    expect(_.isFunction(linkFn)).toBe(true);
  });
});
```
因此，我们需要返回这样一个函数，从`$compile`的公共的`compile`函数：
```js
function compile($compileNodes) {
    compileNodes($compileNodes);
    return function publicLinkFn() {
    	
    };
}
```
这个函数是做什么的？正如我们看到的，它做了很多事情，但首先要做的是将一些调试信息添加到DOM中。具体来说，该函数需要一个scope对象作为参数，并且作为jQuery/jqLite数据添加到DOM节点。

我们为接下来的linking所有的测试用例创建一个新的`describe`块：
```js
describe('linking', function() {
  it('takes a scope and attaches it to elements', function() {
    var injector = makeInjectorWithDirectives('myDirective', function() {
      return {compile: _.noop};
    });
    injector.invoke(function($compile, $rootScope) {
      var el = $('<div my-directive></div>');
      $compile(el)($rootScope);
      expect(el.data('$scope')).toBe($rootScope);
    }); 
  });
});
```
在这种情况下，我们把`$rootScope`添加到公共link函数，并且验证它成为元素的`$scope`数据属性到`$compile`。

通过这个测试很容易。我们可以简单地将数据添加到最原始的元素去`compile`：
```js
function compile($compileNodes) {
    compileNodes($compileNodes);
    return function publicLinkFn(scope) {
    	$compileNodes.data('$scope', scope);
    };
}
```