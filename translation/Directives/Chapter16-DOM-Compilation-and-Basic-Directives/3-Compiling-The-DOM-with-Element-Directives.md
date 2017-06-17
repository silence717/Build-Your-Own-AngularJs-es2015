## Compiling The DOM with Element Directives
现在我们已经有能力注册一些指令了，我们可以进入对它们的应用了。这个程序叫作*DOM compilation*，它是`$compile`的主要职责。

我们看一下已经有的一个指令`myDirective`。我们可以实现这个指令作为一个函数返回一个对象：
```js
myModule.directive('myDirective', function() {
  return {
  };
});
```
这个对象是*directive definition object*。它的key和value将配置指令的行为。有一个key是`compile`。有了它，我们可以定义指令的*compilation function*。这个函数
`compile`将在traversing DOM的时候调用。它将接收一个参数，是指令将要用于的元素：
```js
myModule.directive('myDirective', function() {
  return {
    compile: function(element) {
      
    } 
  };
});
```
当我们有一个像这样的指令，我们通过添加一个元素匹配指令的名字把它用于DOM：
```angular2html
<my-directive></my-directive>
```
我们把这些作为一个单元测试。在测试里面我们需要创建一个injector，在它里面应用指令。在本书的这部分我们要做很多，因此我们继续，添加一个帮助函数让它变得简单：
```js
function makeInjectorWithDirectives() {
  var args = arguments;
  return createInjector(['ng', function($compileProvider) {
    $compileProvider.directive.apply($compileProvider, args);
  }]);
}
```
这个函数使用两个module创建一个injector:`ng`模块和一个在指令里面使用`$compileProvider`注册的函数模块。

我们可以在我们的新单元测试里面立即使用这个函数：
```js
it('compiles element directives from a single element', function() {
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function(element) {
        element.data('hasCompiled', true);
      }
    };  
  });
  injector.invoke(function($compile) {
    var el = $('<my-directive></my-directive>');
    $compile(el);
    expect(el.data('hasCompiled')).toBe(true);
  }); 
});
```