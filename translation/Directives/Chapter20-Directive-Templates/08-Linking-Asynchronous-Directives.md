## Linking Asynchronous Directives
我们现在一个全部恢复了在异步模板加载之后的编译，但是我们缺失了将所有异步编译的指令link的能力。我们现在做的就是简单的抛弃他们的link函数，
因为当第二次调用`applyDirectivesToNode`的时候，节点link函数返回抛出异常。这意味着这些指令永远不会被link。

这不是它应该如何，当公共的link函数被调用，异步编译的指令应该像其他指令一样被link:
```js
it('links the directive when public link function is invoked', function () {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function () {
            return {
                templateUrl: '/my_directive.html',
                link: linkSpy
            };
        }
    });
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        var linkFunction = $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>');
        linkFunction($rootScope);
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).toBe($rootScope);
        expect(linkSpy.calls.first().args[1][0]).toBe(el[0]);
        expect(linkSpy.calls.first().args[2].myDirective).toBeDefined();
    });
});
```
这同样应用于所有来自模板的子元素。我们期望他们也应该被linked，但是他们现在没有。那是因为，我们抛出了从`compileTemplateUrl`调用`compileNodes()`的返回值。
```js
it('links child elements when public link function is invoked', function () {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function () {
            return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function () {
            return {link: linkSpy};
        }
    });
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        var linkFunction = $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div my-other-directive></div>');
        linkFunction($rootScope);
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).toBe($rootScope);
        expect(linkSpy.calls.first().args[1][0]).toBe(el[0].rstChild);
        expect(linkSpy.calls.first().args[2].myOtherDirective).toBeDefined();
    });
});
```
我们应用异步指令link的技巧由几个步骤组成。我们一个个看。

`applyDirectivesToNode`的本质是为当前节点返回节点link函数。节点link函数在`applyDirectivesToNode`的`function nodeLinkFn(...)`语句中定义的。

当节点上其中一个指令有异步模板，我们不会返回正常的节点link函数，代替返回的是一个特定的"延迟节点link函数"。我们将设置延迟的节点link函数是从`compileTemplateUrl`返回。
假设会出现这种情况，我们可以回去返回值，并且重写本地`nodeLinkFn`变量。延迟的节点link函数成为了`applyDirectivesToNode`的返回值：
```js
if (directive.templateUrl) {
  if (templateDirective) {
    throw 'Multiple directives asking for template';
  }
    templateDirective = directive;
    nodeLinkFn = compileTemplateUrl(
    _.drop(directives, i),
      $compileNode,
      attrs,
      {templateDirective: templateDirective}
    );
    return false;
}    
```
在`compileTemplateUrl`现在我们需要引入延迟的节点link函数。这个函数的职责是，处理这个节点的整个linking程序 - 就是因为我们仅仅代替了常规的节点link函数。当这个节点的节点link函数被调用的时候，最后的结果实际上是调用`delayedNodeLinkFn`:
```js
function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
    const origAsyncDirective = directives.shift();
    const derivedSyncDirective = _.extend(
        {},
        origAsyncDirective,
        {templateUrl: null}
    );
    const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    $compileNode.empty();
    $http.get(templateUrl).success(template => {
        directives.unshift(derivedSyncDirective);
        $compileNode.html(template);
        applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
        compileNodes($compileNode[0].childNodes);
    });
    return function delayedNodeLinkFn() {
        
    };
}
```
在延迟节点link的函数中我们应该做什么？一个明确需要做的事情是，我们要link所有的异步编译的指令 - 无论是当前节点还是子节点。我们通过捕捉`applyDirectivesToNode`和
`compileNodes`抛出的返回值而获取节点link函数。我们在`afterTemplateNodeLinkFn`和`afterTemplateChildLinkFn`后面调用他们，因为他们为每个东西link函数在加载模板后：
```js
function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
    // 移除带templateUrl的指令
    const origAsyncDirective = directives.shift();
    // 创建一个新对象
    const derivedSyncDirective = _.extend(
        {},
        origAsyncDirective,
        {templateUrl: null}
    );
    // 添加templateUrl
    const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    let afterTemplateNodeLinkFn;
    let afterTemplateChildLinkFn;
    $compileNode.empty();
    $http.get(templateUrl).success(template => {
        // 把新创建的对象重新放入指令数组
        directives.unshift(derivedSyncDirective);
        $compileNode.html(template);
        afterTemplateNodeLinkFn = applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
        afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
    });
    return function delayedNodeLinkFn() {
    
    };
}
```
我们现在应该从延迟的节点link函数中调用这些函数。但是首先，我们考虑节点link函数它接收的参数。它会被当做常规的节点link函数调用，这意味着它有3个参数：  

1. The child link function
2. The scope to link
3. The node being linked

后两个参数是不言自明的，但是第一个 - The child link function - 更加有趣一些：它是之前加载的模板中的子link函数。由于我们在开始加载模板之前清除了子node，它实际上什么也没做。
我们可以忽略它，并且使用`afterTemplateChildLinkFn`代替进行linking:
```js
function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
    // 移除带templateUrl的指令
    const origAsyncDirective = directives.shift();
    // 创建一个新对象
    const derivedSyncDirective = _.extend(
        {},
        origAsyncDirective,
        {templateUrl: null}
    );
    // 添加templateUrl
    const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    let afterTemplateNodeLinkFn;
    let afterTemplateChildLinkFn;
    $compileNode.empty();
    $http.get(templateUrl).success(template => {
        // 把新创建的对象重新放入指令数组
        directives.unshift(derivedSyncDirective);
        $compileNode.html(template);
        afterTemplateNodeLinkFn = applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
        afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
    });
   return function delayedNodeLinkFn(_ignoreChildLinkFn, scope, linkNode) {
    afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode);
   };
}
```
这满足了我们的测试，但是如果你查看测试用例中事情的完成顺序，你可能发现它有点奇怪：这个测试首先等待收到的模板，然后调用公共link函数。我们当前的实现却需要这个。

这不是合理的要求。如果把它留在这个，不管谁调用公共link函数都需要知道所有异步模板加载什么时候完成。实际上，作为一个Angular用户，你不需要考虑这个。在编译完成之后立即调用link函数非常常见。

因此我们需要支持在模板接收之前调用公共link函数，因此在我们真正有`afterTemplateNodeLinkFn`和`afterTemplateChildLinkFn`函数。在这个用例中药发生的是，在我们最终接收到模板的时候link成功了：
```js
it('links when template arrives if node link fn was called', function () {
    var linkSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function () {
            return {
                templateUrl: '/my_directive.html',
                link: linkSpy
            };
        }
    });
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        var linkFunction = $compile(el)($rootScope); // link  rst
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>'); // then receive template
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
        expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
        expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
    });
});
```
这意味着`delayedNodeLinkFn`在我们准备好link之前被调用。如果是这种情况，我们需要存储我们给定的参数以便于当我们准备好的时候可以应用他们。这些参数将被按照"link队列"存储在`compileTemplateUrl`内部。
我们将它初始化为数组，并且当我们接收到模板的时候将它设置为`null`:
```js
function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
    // 移除带templateUrl的指令
    const origAsyncDirective = directives.shift();
    // 创建一个新对象
    const derivedSyncDirective = _.extend(
        {},
        origAsyncDirective,
        {templateUrl: null}
    );
    // 添加templateUrl
    const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    let afterTemplateNodeLinkFn;
    let afterTemplateChildLinkFn;
    let linkQueue = [];
    $compileNode.empty();
    $http.get(templateUrl).success(template => {
        // 把新创建的对象重新放入指令数组
        directives.unshift(derivedSyncDirective);
        $compileNode.html(template);
        afterTemplateNodeLinkFn = applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
        afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
        linkQueue = null;
    });
   return function delayedNodeLinkFn(_ignoreChildLinkFn, scope, linkNode) {
    afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode);
   };
}
```
在`delayedNodeLinkFn`我们有两个选择：如果有一个link队列，由于我们还没有准备好仅仅将参数放在这里。如果没有link队列（由于它是null），仅仅尽可能早的调用节点link函数：
```js
return function delayedNodeLinkFn(_ignoreChildLinkFn, scope, linkNode) {
    if (linkQueue) {
        linkQueue.push({scope: scope, linkNode: linkNode});
    } else {
        afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode);
    }
};
```
现在，当我们接收到模板，如果link函数已经被调用，在link队列里面将有一个或多个入口。我们将马上应用这些：
```js
function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
    // 移除带templateUrl的指令
    const origAsyncDirective = directives.shift();
    // 创建一个新对象
    const derivedSyncDirective = _.extend(
        {},
        origAsyncDirective,
        {templateUrl: null}
    );
    // 添加templateUrl
    const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    let afterTemplateNodeLinkFn;
    let afterTemplateChildLinkFn;
    let linkQueue = [];
    $compileNode.empty();
    $http.get(templateUrl).success(template => {
        // 把新创建的对象重新放入指令数组
        directives.unshift(derivedSyncDirective);
        $compileNode.html(template);
        afterTemplateNodeLinkFn = applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
        afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
        _.forEach(linkQueue, linkCall => {
            afterTemplateNodeLinkFn(afterTemplateChildLinkFn, linkCall.scope, linkCall.linkNode);
        });
        linkQueue = null;
    });
    return function delayedNodeLinkFn(_ignoreChildLinkFn, scope, linkNode) {
        if (linkQueue) {
            linkQueue.push({scope: scope, linkNode: linkNode});
        } else {
            afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode);
        }
    };
}
```
link队列实际上是DOM树linking的过程，因此它仅仅当异步模板获取完成的时候才初始化。

注意到这也意味着当你调用一个公共的link函数在Angular里面，你通常不确定当函数返回的时候所有的一切都已经linked。如果在DOM中有异步模板指令，linking仅仅在加载完的时候完成。