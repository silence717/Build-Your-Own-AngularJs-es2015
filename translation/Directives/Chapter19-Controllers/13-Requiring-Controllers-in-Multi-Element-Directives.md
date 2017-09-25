## Requiring Controllers in Multi-Element Directives
为分组元素指令引入controllers也应该正常工作：
```js
it('is passed through grouped link wrapper', function() {
    function MyController() { }
    var gotMyController;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                multiElement: true,
                scope: {},
                controller: MyController,
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
                }
            }; 
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive-start></div><div my-directive-end></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDefined();
        expect(gotMyController instanceof MyController).toBe(true);
    }); 
});
```
这个测试没有立刻通过的原因是`groupElementsLinkFnWrapper`函数 - 它用于包装多个元素指令的link函数 - 不知道link函数的第4个参数，并且不会传递它。修复这个非常简单：
```js
function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
  return function(scope, element, attrs, ctrl) {
    var group = groupScan(element[0], attrStart, attrEnd);
    return linkFn(scope, group, attrs, ctrl);
  }; 
}
```