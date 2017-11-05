## Linking Directives that Were Compiled Earlier
在我们说我们异步编译和link是全功能的时候，这里仍然有一些情况需要被覆盖。一个明显的漏洞就是在同一个元素看到异步模板被compiled之前指令被linking。我们收集我们的link函数到
`preLinks`和`postLinkFns`集合，但是我们在代替node lin函数的时候简单的使用delayed node link函数简单的将他们抛出。
```js
it('links directives that were compiled earlier', function() {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {link: linkSpy};
        },
        myOtherDirective: function() {
            return {templateUrl: '/my_other_directive.html'};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        var linkFunction = $compile(el);
        $rootScope.$apply();
        linkFunction($rootScope);
        requests[0].respond(200, {}, '<div></div>');
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
        expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
        expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
    }); 
});
```
这是一个场景我们之前引入的方便的"previous compile context"对象。pre-link函数和post-link函数需要在两次调用`applyDirectivesToNode`中保护。我们应该添加这些集合到上下文就像我们给到`compileTemplateUrl`:
```js
nodeLinkFn = compileTemplateUrl(
  _.drop(directives, i),
  $compileNode,
  attrs,
  {
    templateDirective: templateDirective,
    preLinkFns: preLinkFns,
    postLinkFns: postLinkFns
  } 
);
```
然后我们需要准备好当`applyDirectivesToNode`第二次被调用的时候接受他们：
```js
function applyDirectivesToNode(directives, compileNode, attrs, previousCompileContext) {
  previousCompileContext = previousCompileContext || {};
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = previousCompileContext.preLinkFns || [];
  var postLinkFns = previousCompileContext.postLinkFns || [];
  var controllers = {};
  var newScopeDirective, newIsolateScopeDirective;
  var templateDirective = previousCompileContext.templateDirective;
  var controllerDirectives;
  // ...
}
```
现在我们保存了相同的link函数集合贯穿异步模板加载。当我们最终调用link函数，我们调用他们所有，不管它们在加载模板前还是加载完成后。