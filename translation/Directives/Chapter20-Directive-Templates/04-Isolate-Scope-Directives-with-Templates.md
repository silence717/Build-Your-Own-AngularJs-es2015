## Isolate Scope Directives with Templates
几章前我们实现了隔离scope，我们讨论了隔离scope只用于请求它的指令 - 不是元素上的其他指令或者子元素。

这里有一个异常，关系到模板：当一个指令同时定义了隔离scope和一个template，用于模板内部的指令将会接收隔离scope。模板内容会被认为是隔离的一部分。当你认为这种指令是有自己模板的组件时这是有意义的。
```js
it('uses isolate scope for template contents', function() {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                scope: {
                    isoValue: '=myDirective'
                },
                template: '<div my-other-directive></div>'
            };
        },
        myOtherDirective: function() {
            return {link: linkSpy};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive="42"></div>');
        $compile(el)($rootScope);
        expect(linkSpy.calls. rst().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls. rst().args[0].isoValue).toBe(42);
    });
});
```
在节点link函数，我们叫作子link函数，因此我们使用上下文的scope，永远不是隔离scope。我们现在改变它，如果我们有一个隔离scope指令，并且这个指令有一个模板，我们将把这个子节点和隔离scope链接起来。
我们可以这么做，因为如果元素有任何子元素，他们必须来自于隔离scope指令的模板。
```js
_.forEach(preLinkFns, function(linkFn) {
  linkFn(
    linkFn.isolateScope ? isolateScope : scope,
    $element,
    attrs,
    linkFn.require && getControllers(linkFn.require, $element)
  ); 
});
if (childLinkFn) {
    var scopeToChild = scope;
    if (newIsolateScopeDirective && newIsolateScopeDirective.template) {
      scopeToChild = isolateScope;
    }
  childLinkFn(scopeToChild, linkNode.childNodes);
}
_.forEachRight(postLinkFns, function(linkFn) {
  linkFn(
    linkFn.isolateScope ? isolateScope : scope,
    $element,
    attrs,
    linkFn.require && getControllers(linkFn.require, $element)
  ); 
});
```