## Transclusion from Descendant Nodes
就像我们已经看到的，当你有一个包含`transclude: true`的指令，它将从它的link函数获取 transclusion 函数作为第5个参数，它可以访问被替换的内容。
实际上，第五个参数对于这个元素上的所有指令都是有效的，因为我们将它传递到了所有的pre和post link函数。

实际上，对于大多数指令来说，transclusion 函数都是有效的：第五个参数是当前元素或者后代元素给的。这意味着你可以咋 transclusion 的指令模板中实际执行 transcluded 内容，如下：
```js
it('makes contents available to child elements', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                template: '<div in-template></div>'
            };
        },
        inTemplate: function() {
            return {
                link: function(scope, element, attrs, ctrl, transcludeFn) {
                    element.append(transcludeFn());
                }
            }; 
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        expect(el.find('> [in-template] > [in-transclude]').length).toBe(1);
    });
});
```
这个测试现在是失败的，因为`inTemplate`指令现在实际上没有接收一个 transclude 函数，因此它去调用`undefined`。

在节点link函数，一旦我们调用子节点的link函数，我们需要传递到 bound transclusion 函数让子节点有效：
```js
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
  if (newIsolateScopeDirective && newIsolateScopeDirective. template) {
    scopeToChild = isolateScope;
  }
  childLinkFn(scopeToChild, linkNode.childNodes, boundTranscludeFn);
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
注意到我们不传入scope的绑定 transclusion 函数，仅仅传入内部的 bound transclusion 函数。子节点最终将构建他们自己的scope 绑定 transclusion 函数。

子节点link函数将被子节点的复合link函数调用。那个函数现在还没有接收第三个参数。我们添加它，并且调用它`parentBoundTrancludeFn`，因为它来自父节点的 bound transclusion 函数。
```js
function compositeLinkFn(scope, linkNodes, parentBoundTranscludeFn) {
    // ...
}
```
现在，在这个函数的link函数中循环，我们将使用这个parent-bound transclusion 函数作为 bound transclusion - 但是只要在子节点没有自己的 transclusion 函数的时候：
```js
var boundTranscludeFn;
if (linkFn.nodeLinkFn.transcludeOnThisElement) {
  boundTranscludeFn = function(transcludedScope, containingScope) {
    if (!transcludedScope) {
      transcludedScope = scope.$new(false, containingScope);
    }
    return linkFn.nodeLinkFn.transclude(transcludedScope);
  };
} else if (parentBoundTranscludeFn) {
  boundTranscludeFn = parentBoundTranscludeFn;
}
```
不是DOM上的每个元素都有指令，我们也应该能够绕过他们传递transclusion函数。在这个测试中，transclusion指令模板中有一个常规的`div`，导致`in-template`指令不接收 transclude 函数：
```js
it('makes contents available to indirect child elements', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                template: '<div><div in-template></div></div>'
            };
        },
        inTemplate: function() {
            return {
                link: function(scope, element, attrs, ctrl, transcludeFn) {
                    element.append(transcludeFn());
                }
            };
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        expect(el.find('> div > [in-template] > [in-transclude]').length).toBe(1);
    });
});
```
我们又一次碰到了相同的问题，指令把`undefined`当作transclusion函数调用。

这可以通过在复合link函数中向前传递parent-bound transclusion 函数来修复，这种情况下对于当前节点没有节点link函数：
```js
if (linkFn.nodeLinkFn) {
  // ...
} else {
  linkFn.childLinkFn(
    scope,
    node.childNodes,
    parentBoundTranscludeFn
  ); 
}  
```
当你在你的指令中做了一些复杂事情，需要运行你自己。手动编译或者linking到子节点，另一种"传递"的transclusion函数是有用的。一个"懒编译"指令，比如`ng-if`就是这样使用的一个例子。

当你有一个这样的指令，并且在transclusion的中间使用它，事情会被打破。因为如果你独立的link他们，transclusion函数没有从它的父亲到子找到它的方式。

你可以支持这种类型指令的transclusion，通过传递一个额外的参数到public link函数通过常规的节点编译。这个参数是一个`opitions`对象，并且它其中的一个支持key
`parentBoundTranscludeFn`。这样你可以传递你从其他link程序接收的transclusion函数：
```js
it('supports passing transclusion function to public link function', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function($compile) {
            return {
                transclude: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    var customTemplate = $('<div in-custom-template></div>');
                    element.append(customTemplate);
                    $compile(customTemplate)(scope, {
                        parentBoundTranscludeFn: transclude
                    });
                } 
            };
        },
        inCustomTemplate: function() {
            return {
                link: function(scope, element, attrs, ctrl, transclude) {
                    element.append(transclude());
                }
            };
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        expect(el.find('> [in-custom-template] > [in-transclude]').length).toBe(1);
    });
});
```
公共link函数需要这个可选的`options`参数，并且当它有效的时候抓取它的`parentBoundTranscludeFn`属性。然后它可以传递它到复合link函数，它已经可以接收
parent-bound transclude函数作为第三个参数：
```js
return function publicLinkFn(scope, options) {
  options = options || {};
  var parentBoundTranscludeFn = options.parentBoundTranscludeFn;
  $compileNodes.data('$scope', scope);
  compositeLinkFn(scope, $compileNodes, parentBoundTranscludeFn);
  return $compileNodes;
};
```
这个引入了一个和生命周期相关的问题：我们传递的是scope-bound transclusion 函数，因为这是在link函数中拥有的。transclusion scope的`$parent`将会错误的
绑定到当前的Scope,即使他们没有在这里link这个变量。当我们销毁自定义的内容，并且期望transcluded内容的watches不会再被处罚：
```js
it('destroys scope passed through public link fn at the right time', function() {
    var watchSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myTranscluder: function($compile) {
            return {
                transclude: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    var customTemplate = $('<div in-custom-template></div>');
                    element.append(customTemplate);
                    $compile(customTemplate)(scope, {
                        parentBoundTranscludeFn: transclude
                    });
                }
            };
        },
        inCustomTemplate: function() {
            return {
                scope: true,
                link: function(scope, element, attrs, ctrl, transclude) {
                    element.append(transclude());
                    scope.$on('destroyNow', function() {
                        scope.$destroy();
                    });
                }
            };
        },
        inTransclude: function() {
            return {
                link: function(scope) {
                    scope.$watch(watchSpy);
                }
            };
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
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
在这种情况下，我们需要弄清楚如何"解绑"scope-bound tranclude 函数。诀窍是添加一个属性到这个函数，该函数指向被包装的函数：
```js
function scopeBoundTranscludeFn(transcludedScope) {
  return boundTranscludeFn(transcludedScope, scope);
}
scopeBoundTranscludeFn.$$boundTransclude = boundTranscludeFn;
```
在公共的link函数中，我们使用这个属性展开在合适的时候。这导致所有的东西重排：
```js
return function publicLinkFn(scope, options) {
  options = options || {};
  var parentBoundTranscludeFn = options.parentBoundTranscludeFn;
  if (parentBoundTranscludeFn && parentBoundTranscludeFn.$$boundTransclude) {
    parentBoundTranscludeFn = parentBoundTranscludeFn.$$boundTransclude;
  }
  $compileNodes.data('$scope', scope);
  compositeLinkFn(scope, $compileNodes, parentBoundTranscludeFn);
  return $compileNodes;
};
```