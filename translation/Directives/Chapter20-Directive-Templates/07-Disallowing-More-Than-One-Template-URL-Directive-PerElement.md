## Disallowing More Than One Template URL Directive Per Element
本章前面我们添加了一个检查确保同一个元素只能添加指令指令。我们需要扩展这个检查覆盖异步模板指令。当一个`template`指令已经有了，`templateUrl`就不被允许：
```js
it('does not allow templateUrl directive after template directive', function () {
    var injector = makeInjectorWithDirectives({
        myDirective: function () {
            return {template: '<div></div>'};
        },
        myOtherDirective: function () {
            return {templateUrl: '/my_other_directive.html'};
        }
    });
    injector.invoke(function ($compile) {
        var el = $('<div my-directive my-other-directive></div>');
        expect(function () {
            $compile(el);
        }).toThrow();
    });
});
```
我们可以通过在`applyDirectivesToNode`的分支中检查`templateUrl`分支来覆盖这个用例。我们你已经看到指令的template，我们抛出异常：
```js
if (directive.templateUrl) {
    if (templateDirective) {
      throw 'Multiple directives asking for template';
    }
    templateDirective = directive;
    compileTemplateUrl(_.drop(directives, i), $compileNode, attrs);
    return false;
```
相同的检查应该在逆向应用。当一个指令已经有了`templateUrl`属性，那么指令的`template`也是不被允许的：
```js
it('does not allow template directive after templateUrl directive', function() {
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function() {
            return {template: '<div></div>'};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div class="replacement"></div>');
        expect(el.find('> .replacement').length).toBe(1);
    });
});
```
注意到在这个用例中我们没有获取异常，因为在template URL异步获取resolved的时候检查已经结束了，它在一个独立的执行上下文中发生。代替的是我们现在只检查指令的第二模板有没有得到应用。

这个检查有一些棘手，因为我们看到第二指令的时间，我们已经在第二次调用`applyDirectivesToNode`中，这里所有本地的变量包含`templateDirective`从上一次调用中。

我们真正需要做的是保护任意指令在两次调用中看到的信息。实际上是我们需要传递一些state从`applyDirectivesToNode`的一次调用到另一次，通过在两次之间产生的`compileTemplateUrl`。

为了这个目的，我们引入一个对象调用上次编译的上下文，添加我们需要保护的state。它的目的是"交换"一些本地state在两次不同的调用`applyDirectivesToNode`函数。在这个点上我们唯一要添加进去的是模板指令变量，但是我们在后面添加。

上次编译的上下文作为最后一个参数给到`compileTemplateUrl`：
```js
compileTemplateUrl(
  _.drop(directives, i),
  $compileNode,
  attrs,
  {templateDirective: templateDirective}
);
```
`compileTemplateUrl`函数不会使用上次编译上下文做任何事情，除了第二次调用`applyDirectivesToNode`把它传回去：
```js
function compileTemplateUrl(
    directives, $compileNode, attrs, previousCompileContext) {
    var origAsyncDirective = directives.shift();
    var derivedSyncDirective = _.extend(
      {},
      origAsyncDirective,
      {templateUrl: null}
    );
    var templateUrl = _.isFunction(origAsyncDirective.templateUrl) ?
                        origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
    $compileNode.empty();
    $http.get(templateUrl).success(function(template) {
    directives.unshift(derivedSyncDirective);
    $compileNode.html(template);
    applyDirectivesToNode(
    directives, $compileNode, attrs, previousCompileContext);
    compileNodes($compileNode[0].childNodes);
    });
}
```
回到`applyDirectivesToNode`我们现在接收上一次的编译上下文，并且在它里面初始化本地`templateDirective`变量：
```js
function applyDirectivesToNode(
  directives, compileNode, attrs, previousCompileContext) {
    previousCompileContext = previousCompileContext || {};
    var $compileNode = $(compileNode);
    var terminalPriority = -Number.MAX_VALUE;
    var terminal = false;
    var preLinkFns = [], postLinkFns = [], controllers = {};
    var newScopeDirective, newIsolateScopeDirective;
    var templateDirective = previousCompileContext.templateDirective;
    var controllerDirectives;
```
现在我们的测试通过了。处理中我们引入一个简单的机智保存两次调用`applyDirectivesToNode`的state，当有一个异步模板获取在这之间。我们将在本章剩下的部分添加更多的state。