## Plain Directive Link Functions
一个指令在`compile`函数什么也没有做，而是将所有的工作推迟到`link`函数是非常常见的。在指令定义对象中有一个API快捷方式，在这里你只可以直接引入`link`属性
使用link函数，跳过`compile`：
```js
it('supports link function in directive de nition object', function() {
  var givenScope, givenElement, givenAttrs;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: function(scope, element, attrs) {
        givenScope = scope;
        givenElement = element;
        givenAttrs = attrs;
      } 
    };
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(givenScope).toBe($rootScope);
    expect(givenElement[0]).toBe(el[0]);
    expect(givenAttrs).toBeDefined();
    expect(givenAttrs.myDirective).toBeDefined();
  }); 
});
```
我们可以在注册指令工厂的时候处理这个问题。如果指令定义对象没有`compile`属性，但是有`link`属性，我们将用一个只返回link函数的虚假函数去代替compile函数。
指令编译的时候不会知道区别：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory, i) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.priority = directive.priority || 0;
    if (directive.link && !directive.compile) {
      directive.compile = _.constant(directive.link);
    }
    directive.name = directive.name || name;
    directive.index = i;
    return directive;
  }); 
}]);
```
