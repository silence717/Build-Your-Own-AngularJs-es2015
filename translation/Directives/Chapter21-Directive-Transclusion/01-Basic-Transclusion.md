## Basic Transclusion
大多数的嵌入包含用例是这样的：当一个 transclusion 指令用于一个元素，获取该元素的子节点，并将其移动到指令模板中的某个位置。
```angular2html
// Directive Application
<my-component>
<p>Transcluded content...</p>
<p>More transcluded content...</p>
</my-component>
// Directive Template
<article>
  <h2>My Article Title</h2>
  <div insert-transclusion-here>
  </div>
</article>
// Result
<my-component>
<article>
  <h2>My Article Title</h2>
  <div insert-transclusion-here>
<p>Transcluded content...</p>
<p>More transcluded content...</p>
  </div>
</article>
</my-component>
```
当一个指令定义对象包含`transclude: true`入口的时候这个功能被激活。这个功能第一个可见的效果就是当前元素的子节点从DOM中消失：
```js
describe('transclude', function() {

		it('removes the children of the element from the DOM', function() {
			var injector = makeInjectorWithDirectives({
				myTranscluder: function() {
					return {transclude: true};
				}
			});
			injector.invoke(function($compile) {
				var el = $('<div my-transcluder><div>Must go</div></div>');
				$compile(el);
				expect(el.is(':empty')).toBe(true);
			});
		});

	});
```
我们做到这一点很容易。在`applyDirectivesToNode`中编译指令的时候，我们可以检测是否有一个为真值的`transclude`属性，有的话清楚节点内容。
我们在指令循环里面做这一点，在`controller`和`template`属性之间处理：
```js
function applyDirectivesToNode(directives, compileNode, attrs, previousCompileContext) {
  // ...
  _.forEach(directives, function(directive, i) {
    // ...
    if (directive.controller) {
      controllerDirectives = controllerDirectives || {};
      controllerDirectives[directive.name] = directive;
    }
    if (directive.transclude) {
       $compileNode.empty();
     }
     if (directive.template) {
     // ...
     }
     // ..
 });
 // ...
   
}
```
在这里当配置了 transclusion 我们简单地将节点里面的内容去除掉。你已经才到故事没有结束。我们应该对这些子节点做什么呢？这些子节点要做的一个事情是应该继续编译。
现在他们被移除了并没有继续编译，这个发生在`compileNodes`遍历它们之前。如果我们断言他们被表一，测试用例将会不通过：
```js
it('compiles child elements', function() {
    var insideCompileSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {transclude: true};
        },
        insideTranscluder: function() {
            return {compile: insideCompileSpy};
        }
    });
    injector.invoke(function($compile) {
        var el = $('<div my-transcluder><div inside-transcluder></div></div>');
        $compile(el);
        expect(insideCompileSpy).toHaveBeenCalled();
    });
});
```
因此我们应该编译这些子节点，但是仍然需要从DOM树移除他们在最初的编译。我们可以通过对这些独立子节点单独调用`compile`服务去实现。实际上，被 transcluded 
的内容被独立编译，单独的编译过程：
```js
if (directive.transclude) {
    var $transcludedNodes = $compileNode.clone().contents();
    compile($transcludedNodes);
    $compileNode.empty();
}
```
注意到我们在获取它的内容之前已经克隆并编译节点。这可以做到在我们清除节点后，我们仍然有一个克隆的包含被替换的内容的节点。

现在我们可以编译被替换的节点，但是在那之后我们仍然会丢掉他们。他们不会被用于任何地方，并且永远不会显示到页面。我们想做的是使这些被替换的元素有效。但是在哪里，如何做？

这些元素在哪里被transcluded的问题是框架中无法解决的。应用开发者可以决定这个。我们可以做的是将这些元素提供给应用开发者，这样他们可以将他们添加到他们需要的地方。

这可以通过提供一个新的，第5个参数到 transclusion 指令link函数。这个参数是*transclusion function*。这是一个提供给指令作者访问 transcluded 内容的函数。这里我们第一个测试指令的用例，
实际上是transclusion：它使用transclusion函数获取被替换的内容，并且将它添加到模板中。
```js
it('makes contents available to directive link function', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {
                transclude: true,
                template: '<div in-template></div>',
                link: function(scope, element, attrs, ctrl, transclude) {
                    element.find('[in-template]').append(transclude());
                }
            }; 
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transcluder></div></div>');
        $compile(el)($rootScope);
        expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1);
    });
});
```
因此这里应该有第五个参数到指令link函数，供 transclusion 指令使用：transclusion函数。我们看一下如何创建这个函数并且传入它。

在`applyDirectivesToNode`我们引入一个新的跟踪变量叫作`childTranscludeFn`:
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
  var controllerDirectives = previousCompileContext.controllerDirectives;
  var childTranscludeFn;
  // ...
}
```
在这个变量我们存储为 transcluded 内容调用`compile`返回的值。这意味着对于这些内容它是公共的link函数：
```js
if (directive.transclude) {
	var $transcludedNodes = $compileNode.clone().contents();
    childTranscludeFn = compile($transcludedNodes);
    $compileNode.empty();
}
```
现在使我们的测试通过最简单的事情就是修改公共的link函数，使他返回节点lined的值：
```js
return function publicLinkFn(scope) {
  $compileNodes.data('$scope', scope);
  compositeLinkFn(scope, $compileNodes);
    return $compileNodes;
};
```
我们这样是因为我们可以简单的 使用公共link函数返回的transcluded内容作为 transclusion 函数给到指令：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
  // ...
  _.forEach(preLinkFns, function(linkFn) {
    linkFn(
      linkFn.isolateScope ? isolateScope : scope,
      $element,
      attrs,
      linkFn.require && getControllers(linkFn.require, $element),
      childTranscludeFn
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
        childTranscludeFn
        ); 
    });
}
```
我们到了一个重要的点：在这个中心，transclusion 函数实际上是一个link函数。现在，它是被引用内容的公共link函数。不过事情没有那么简单。例如我们已经完全忽略了
scope管理。但是 transclusion 函数实际上link函数的核心思想将继续。

在我们进入scope管理之前，让我们添加一个约束 transclusion 如何被使用：就像template，你只可以在每个元素上做一次替换。在两个指令上做这个事情是没有意义的，
因为第一个已经清除了节点的内容，没有为第二个留下任何内容。因此当有两个或者多个 transclusion 用于指令的时候，我们明确的抛出一个异常：
```js
it('is only allowed once per element', function() {
    var injector = makeInjectorWithDirectives({
        myTranscluder: function() {
            return {transclude: true};
        },
        mySecondTranscluder: function() {
            return {transclude: true};
        }
    });
    injector.invoke(function($compile) {
        var el = $('<div my-transcluder my-second-transcluder></div>');
        expect(function() {
            $compile(el);
        }).toThrow();
    });
});
```
为了跟踪这个我们在`applyDirectivesToNode`使用另外一个新变量，它只是一个简单的跟踪标识，表示是否在这个元素上已经看到了 transclusion 指令：
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
  var controllerDirectives = previousCompileContext.controllerDirectives;
  var childTranscludeFn, hasTranscludeDirective;
  // ...
}
```
然后我们检查这个标识当 transclusion 指令到来时：
```js
if (directive.transclude) {
  if (hasTranscludeDirective) {
      throw 'Multiple directives asking for transclude';
  }
  hasTranscludeDirective = true;
  var $transcludedNodes = $compileNode.clone().contents();
  childTranscludeFn = compile($transcludedNodes);
  $compileNode.empty();
}
```