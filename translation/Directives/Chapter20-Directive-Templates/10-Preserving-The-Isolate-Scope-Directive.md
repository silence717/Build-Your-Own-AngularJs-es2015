## Preserving The Isolate Scope Directive
另外一个我们忘记的事情就是，在我们进入异步之前在这个元素上是否存在一个隔离scope。如果存在一个，它的linking将会失败：
```js
it('retains isolate scope directives from earlier', function() {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                scope: {val: '=myDirective'},
                link: linkSpy
            };
        },
        myOtherDirective: function() {
            return {templateUrl: '/my_other_directive.html'};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive="42" my-other-directive></div>');
        var linkFunction = $compile(el);
        $rootScope.$apply();
        linkFunction($rootScope);
        requests[0].respond(200, {}, '<div></div>');
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls. rst().args[0]).toBeDefined();
        expect(linkSpy.calls. rst().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls. rst().args[0].val).toBe(42);
    });
});
```
这里也是在前面的compile上下文中应该做的事情：
```js
nodeLinkFn = compileTemplateUrl(
  _.drop(directives, i),
  $compileNode,
  attrs,
  {
  	templateDirective: templateDirective,
    newIsolateScopeDirective: newIsolateScopeDirective,
    preLinkFns: preLinkFns,
    postLinkFns: postLinkFns
  }
);
```
相应地，当我们回来的时候应该取出它：
```js
function applyDirectivesToNode(directives, compileNode, attrs, previousCompileContext) {
  previousCompileContext = previousCompileContext || {};
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = previousCompileContext.preLinkFns || [];
  var postLinkFns = previousCompileContext.postLinkFns || [];
  var controllers = {};
  var newScopeDirective;
  var newIsolateScopeDirective = previousCompileContext.newIsolateScopeDirective;
  var templateDirective = previousCompileContext.templateDirective;
  var controllerDirectives;
```
但是仍然有一个问题，当在同一个指令上同时使用隔离scope和template URL的时候就暴露出来了：
```js
it('supports isolate scope directives with templateUrls', function() {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                scope: {val: '=myDirective'},
                link: linkSpy,
                templateUrl: '/my_other_directive.html'
            }; 
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive="42"></div>');
        var linkFunction = $compile(el)($rootScope);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>');
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls. rst().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls. rst().args[0].val).toBe(42);
    });
});
```
linking函数还没有被调用！这实际上是因为异步模板处理之前发生了一个异常。

根本原因是我们在错误的指令中设置隔离scope绑定，在开始异步加载之前，我们在异步指令上初始化绑定，而我们只应该对派生的同步指令进行绑定。

通过使用跳过具有模板URL的指令的子语句来保护新的或者隔离scope，可以很容易的修复这个问题。当模板到达时，这些指令被处理：
```js
if (directive.scope && !directive.templateUrl) {
  if (_.isObject(directive.scope)) {
    if (newIsolateScopeDirective || newScopeDirective) {
      throw 'Multiple directives asking for new/inherited scope';
    }
    newIsolateScopeDirective = directive;
  } else {
    if (newIsolateScopeDirective) {
      throw 'Multiple directives asking for new/inherited scope';
    }
    newScopeDirective = newScopeDirective || directive;
  }
}
```
当我们检查一个隔离scope指令的模板中的指令link的时候，一个相关的问题就出来了。在本章前面，我们讨论他们应该与隔离scope linked,
因为他们属于隔离scope指令。但是当加载异步模板的时候不会发生这种情况。
```js
it('links children of isolate scope directives with templateUrls', function() {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                scope: {val: '=myDirective'},
                templateUrl: '/my_other_directive.html'
            };
        },
        myChildDirective: function() {
            return {
                link: linkSpy
            };
        } });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive="42"></div>');
        var linkFunction = $compile(el)($rootScope);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div my-child-directive></div>');
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls.first().args[0].val).toBe(42);
    }); 
});
```
这个子指令实际上被link到rootScope，而不是隔离scope。

对于这个问题，我们可以在节点link函数找到问题根本，在我们决定哪个scope link到哪个节点的children的是。我们检查隔离scope指令
是否有一个模板，只有在这种强开下才使用隔离scope。我们派生的同伴指令没有模板，也没有template URL。但它仍然将子节点与隔离scope link到一起！

为了修复她，我们可以利用这样一个事实，我们明确的设置导出到同步指令的`templateUrl`为`null`。在节点link函数，我们将检查隔离scope指令使用有一个
`template`，或者有一个值为`null`的`templateUrl`。这将覆盖这两种情况。
```js
if (childLinkFn) {
  var scopeToChild = scope;
  if (newIsolateScopeDirective &&
    (newIsolateScopeDirective.template ||
    newIsolateScopeDirective.templateUrl === null)) {
    scopeToChild = isolateScope;
  }
  childLinkFn(scopeToChild, linkNode.childNodes);
}
```
