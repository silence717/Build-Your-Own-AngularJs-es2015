## Template URL Functions
就像行内模板可以使用函数代替字符串，因此template URL也可以。函数的签名也是一样的。有两个参数：当前节点和节点的属性。
```js
it('supports functions as values', function() {
    var templateUrlSpy = jasmine.createSpy().and.returnValue('/my_directive.html');
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                templateUrl: templateUrlSpy
            };
        } });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el);
        $rootScope.$apply();
        expect(requests[0].url).toBe('/my_directive.html');
        expect(templateUrlSpy.calls. rst().args[0][0]).toBe(el[0]);
        expect(templateUrlSpy.calls. rst().args[1].myDirective).toBeDe ned();
    });
});
```
这个的实现也非常相似。我们简单的判断如果`templateUrl`是一个函数，我们就调用它：
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives.shift();
  var derivedSyncDirective = _.extend({}, origAsyncDirective, {templateUrl: null});
  var templateUrl = _.isFunction(origAsyncDirective.templateUrl) ?
                    origAsyncDirective.templateUrl($compileNode, attrs) :
                    origAsyncDirective.templateUrl;
  $compileNode.empty();
  $http.get(templateUrl).success(function(template) {
    directives.unshift(derivedSyncDirective);
    $compileNode.html(template);
    applyDirectivesToNode(directives, $compileNode, attrs);
    compileNodes($compileNode[0].childNodes);
  }); 
}
```