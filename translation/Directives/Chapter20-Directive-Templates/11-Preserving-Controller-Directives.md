## Preserving Controller Directives
最后，我们要再多使用一次这个技巧，对于指令对象的controller。我们现在忘记了在移动到delayed link之前的controller配置。
```js
it('sets up controllers for all controller directives', function() {
    var myDirectiveControllerInstantiated, myOtherDirectiveControllerInstantiated;
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                controller: function MyDirectiveController() {
                    myDirectiveControllerInstantiated = true;
                }
            };
        },
        myOtherDirective: function() {
            return {
                templateUrl: '/my_other_directive.html',
                controller: function MyOtherDirectiveController() {
                    myOtherDirectiveControllerInstantiated = true;
                }
            }; 
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>');
        expect(myDirectiveControllerInstantiated).toBe(true);
        expect(myOtherDirectiveControllerInstantiated).toBe(true);
    });
});
```
我们应该将`controllerDirectives`放到上一个编译上下文：
```js
nodeLinkFn = compileTemplateUrl(
  _.drop(directives, i),
  $compileNode,
  attrs,
  {
    templateDirective: templateDirective,
    newIsolateScopeDirective: newIsolateScopeDirective,
    controllerDirectives: controllerDirectives,
    preLinkFns: preLinkFns,
    postLinkFns: postLinkFns
  }
);
```
并且我们应该从上下文中再获取他们：
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
```