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

这是我们看到的 transclusion scopes和其他scopes不同的点：他们从data上获取的父scope实际上应该与决定他们销毁的scope不同。他们需要两个父Scope.

在第2章节中我们实现了一个功能，与Scope对象类似的功能。当你调用`scope.$new()`,你可以给定一个可选的第二个参数：一个Scope对象成为新Scope的`$parent`。
这个Scope将会决定新Scope销毁什么时候销毁，而JavaScript 原型仍然设置为你调用`$new`的那个。

现在我们可以利用这个功能：我们应该创建一个指定的*transclusion scope*从上下文的scope中继承，但是谁的`$parent`设置为 transclusion 指令的scope。

较后的Scope是节点link函数提供的，现在创建了包裹transclusion function的第二层绑定 - *scope-bound transclusion function*：
```js
function scopeBoundTranscludeFn() {
  return boundTranscludeFn(scope);
}
_.forEach(preLinkFns, function(linkFn) {
  linkFn(
    linkFn.isolateScope ? isolateScope : scope,
    $element,
    attrs,
    linkFn.require && getControllers(linkFn.require, $element),
    scopeBoundTranscludeFn
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
    scopeBoundTranscludeFn
  ); 
});
```
当你在你的指令里面接收到一个 transclusion 函数，实际上你接收的是什么：被替换的内容原link函数包裹在两个分离的绑定函数。

早期，"内部"bound transclude 函数，我们现在应该接收这个"containing scope"：
```js
var boundTranscludeFn;
if (linkFn.nodeLinkFn.transcludeOnThisElement) {
boundTranscludeFn = function(containingScope) {
    return linkFn.nodeLinkFn.transclude(scope);
  };
}
```
这个给了我们需要形成 transclusion scope的所有，这是我们实际link的：
```js
var boundTranscludeFn;
if (linkFn.nodeLinkFn.transcludeOnThisElement) {
  boundTranscludeFn = function(containingScope) {
    var transcludedScope = scope.$new(false, containingScope);
    return linkFn.nodeLinkFn.transclude(transcludedScope);
  }; 
}
```
因此，transcluded的scope的在原型父`scope`的外部，而`$parent`将在`containingScope`内部。

在进行下一个主题之前，我们还有一个关于 transclusion scope的讨论：作为指令的使用者，你实际上可以绕过我们实现的transclusion scope创建，从指令中传入你的scope。
你可以通过调用 transclusion 函数的时候传入它：
```js
it('allows passing another scope to transclusion function', function() {
    var otherLinkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                scope: {},
                template: '<div></div>',
                link: function(scope, element, attrs, ctrl, transclude) {
                    var mySpecialScope = scope.$new(true);
                    mySpecialScope.specialAttr = 42;
                    transclude(mySpecialScope);
                } };
        },
        myOtherDirective: function() {
            return {link: otherLinkSpy};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        var transcludedScope = otherLinkSpy.calls.first().args[0];
        expect(transcludedScope.specialAttr).toBe(42);
    });
});
```
这意味着`scopeBoundTranscludeFn`有一个可选参数：为 transclusion 使用的scope。它仅仅传递它到内部的 bound transclusion function，作为第一个参数：
```js
function scopeBoundTranscludeFn(transcludedScope) {
  return boundTranscludeFn(transcludedScope, scope);
}
```
在 bound transclusion function 里面接收这个 transclusion scope, 如果没有给定的话创建它：
```js
var boundTranscludeFn;
if (linkFn.nodeLinkFn.transcludeOnThisElement) {
    boundTranscludeFn = function(transcludedScope, containingScope) {
      if (!transcludedScope) {
        transcludedScope = scope.$new(false, containingScope);
      }
      return linkFn.nodeLinkFn.transclude(transcludedScope);
    };
}    
```