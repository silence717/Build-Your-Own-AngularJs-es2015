## Linking And Scope Inheritance
在了解了link的基本程序之后，我们得出了本章的另一个主题：在指令linking的过程中创建新的scope。

到目前为止，我们的代码将scope作为一个参数传递到公共link函数，并给所有的指令link提供相同的scope。DOM树中所有的指令共享单个scope。这可能也会发生在实际的Angular
应用程序中，指令需要有自己的scope更为常见，使用第2章引入的继承机制。让我们看看怎么发生的。

指令可以通过访问继承的scope,通过在指令定义对象引入一个`scope`属性，并且设置值为`true`:
```js
it('makes new scope for element when directive asks for it', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: true,
      link: function(scope) {
        givenScope = scope;
      } 
    };
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(givenScope.$parent).toBe($rootScope);
  }); 
});  
```
当元素上至少一个指令需要继承scope，该元素上所有的指令都会接收到这个继承Scope:
```js
it('gives inherited scope to all directives on element', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        scope: true
      };
    },
    myOtherDirective: function() {
      return {
        link: function(scope) {
          givenScope = scope;
        }
      }; 
    }
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-other-directive></div>');
    $compile(el)($rootScope);
    expect(givenScope.$parent).toBe($rootScope);
  }); 
});
```
这里我们在同一元素上应用两个指令，其中一个需要继承scope。