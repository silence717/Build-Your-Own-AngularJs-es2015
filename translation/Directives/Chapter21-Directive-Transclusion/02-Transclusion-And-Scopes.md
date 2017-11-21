## Transclusion And Scopes
如果在任意指令里面使用 transcluded 内容，他们应该被lined。我们已经做了，因为我们使用公共link函数作为 transclusion 函数。但是这个linking在没有scope的时候完成，
如果我们试图引用一个scope在 transcluded 的内容中就可以清楚的看到。
```js
it('makes scope available to link functions inside', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    element.append(transclude());
                }
            }; 
        },
        myInnerDirective: function() {
            return {
                link: function(scope, element) {
                    element.html(scope.anAttr);
                }
            }; 
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div></div>');
        $rootScope.anAttr = 'Hello from root';
        $compile(el)($rootScope);
        expect(el.find('> [my-inner-directive]').html()).toBe('Hello from root');
    });
});
```
这是通过将该函数与另一个调用具有范围的原始函数一起实现的。
我们修复它可以通过预绑定 transclusion 函数到一个scope。实际上使用另一个有着scope的原始函数包裹它去实现。它仅仅意味着指令作者不提供scope - 我们从内部指令系统完成。
```js
function boundTranscludeFn() {
  return childTranscludeFn(scope);
}
_.forEach(preLinkFns, function(linkFn) {
  linkFn(
    linkFn.isolateScope ? isolateScope : scope,
    $element,
    attrs,
    linkFn.require && getControllers(linkFn.require, $element),
    boundTranscludeFn
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
    linkFn.require && getControllers(linkFn.require, $element),
    boundTranscludeFn
  ); 
});
```
我们绑定的 transclusion 函数的scope现在不是完全正确的。被替换的内容应该被lined到定义的scope，而现在是linked到我们使用的scope。例如，如果 transclusion
指令产生一个继承 scope，被替换的内容应该什么都不知道。我们看到这是一个问题，如果 transclusion 指令覆盖父指令的一个属性。
```js
it('does not use the inherited scope of the directive', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                scope: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    scope.anAttr = 'Shadowed attribute';
                    element.append(transclude());
                }
            };
        },
        myInnerDirective: function() {
            return {
                link: function(scope, element) {
                    element.html(scope.anAttr);
                }
            };
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div></div>');
        $rootScope.anAttr = 'Hello from root';
        $compile(el)($rootScope);
        expect(el.find('> [my-inner-directive]').html()).toBe('Hello from root');
    });
});
```
这给我们的 transclusion 函数带来一个问题，因为他们在节点link函数中创建，这是我们了解的继承scope是唯一的scope。为了正确地决定哪个scope用于transclusion，
我们需要在*composite link function*中代替实现它。

但是首先我们需要让composite link function知道一个节点有 transclusion 指令。我们可以通过添加两个新的跟踪变量到节点link函数作为参数去实现它：
```js
function applyDirectivesToNode(directives, compileNode, attrs, previousCompileContext) {
  // ...
  nodeLinkFn.terminal = terminal;
  nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope;
  nodeLinkFn.transcludeOnThisElement = hasTranscludeDirective;
  nodeLinkFn.transclude = childTranscludeFn;
  return nodeLinkFn;
}
```
现在我们在 composite link function 本身设置 bound transclusion function。首先，我们改变当前代码为一个节点创建一个继承scope,它不能覆盖父scope变量，而是用一个分离的变量：
```js
_.forEach(linkFns, function(linkFn) {
  var node = stableNodeList[linkFn.idx];
  if (linkFn.nodeLinkFn) {
    var childScope;
    if (linkFn.nodeLinkFn.scope) {
      childScope = scope.$new();
      $(node).data('$scope', childScope);
    } else {
      childScope = scope;
    }
    linkFn.nodeLinkFn(
      linkFn.childLinkFn,
      childScope,
      node,
      boundTranscludeFn
    );
  } else {
    linkFn.childLinkFn(
      scope,
      node.childNodes
     );
  } 
});
```
现在，如果在节点上有一个指令使用 transclusion（导致`transcludeOnThisElement`成为`true`），我们创建 bound transclusion function。
它调用最初的 transclusion 函数（它现在是节点link函数的`transclude`属性）有着上下文scope。然后我们将 bound transclusion function 作为一个参数传入节点 link 函数：
```js
_.forEach(linkFns, function(linkFn) {
  var node = stableNodeList[linkFn.idx];
  if (linkFn.nodeLinkFn) {
    var childScope;
    if (linkFn.nodeLinkFn.scope) {
      childScope = scope.$new();
      $(node).data('$scope', childScope);
    } else {
      childScope = scope;
    }
    var boundTranscludeFn;
    if (linkFn.nodeLinkFn.transcludeOnThisElement) {
      boundTranscludeFn = function() {
        return linkFn.nodeLinkFn.transclude(scope);
      };
    }
    linkFn.nodeLinkFn(
      linkFn.childLinkFn,
      childScope,
      node,
      boundTranscludeFn
    );
  } else {
    linkFn.childLinkFn(
      scope,
      node.childNodes
     );
  } 
});
```
现在我们有了一个新参数需要节点link函数去接收。当添加它，也要从节点link函数中移除`function boundTranscludeFn`语句 - 我们不再需要它因为使用给定的参数代替它。
```js
function nodeLinkFn(childLinkFn, scope, linkNode, boundTranscludeFn) {
// ...
}
```
我们结束了这个版本的 bound transclusion function，它绑定transclusion指令外部到Scope。现在transcluded的内容可以访问它需要的scope内容。

这个scope仍然不能满足我们的需要。虽然它已经有了明确的数据 - 和我们想要的原型继承结构，有一个问题就是scope的生命周期：当 transclusion 指令的scope被
销毁的时候，我们也希望所有的watches和事件监听从transclusion内部被销毁。但是现在没有这么做，因为我们为了transclusion使用上下文scope，并且在 transclusion 
指令后继续存在很长一段时间了。
```js
it('stops watching when transcluding directive is destroyed', function() {
    var watchSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                scope: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    element.append(transclude());
                    scope.$on('destroyNow', function() {
                        scope.$destroy();
                    });
                }
            };
        },
        myInnerDirective: function () {
            return {
                link: function(scope) {
                    scope.$watch(watchSpy);
                }
            };
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div></div>');
        $compile(el)($rootScope);
        $rootScope.$apply();
        expect(watchSpy.calls.count()).toBe(2);
        $rootScope.$apply();
        expect(watchSpy.calls.count()).toBe(3);
        $rootScope.$broadcast('destroyNow');
        $rootScope.$apply();
        expect(watchSpy.calls.count()).toBe(3);
    });
});
```
这里我们在 transclusion 里面注册了一个监听表达式。我们期望它在 transclusion 指令scope销毁的时候停止工作，但是它没有。

