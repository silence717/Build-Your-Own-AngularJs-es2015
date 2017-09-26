## The ngController Directive
我们将结束在本章讨论和实现的`ngController` - 一个几乎每个Angular应用开发者都非常熟悉的指令。例如，在angularjs.org网站的第二代码示例使用它：
```angular2html
<div ng-controller="TodoController">
  <!-- ... -->
</div>
```
开始讨论 ngController 之前，我们先测试当我们使用它的构造函数名字注册controller,controller是实例化的。这需要一个系的测试文件，叫作`test/directives/ng_controller_spec.js`:
```js
'use strict';
var $ = require('jquery');
var publishExternalAPI = require('../../src/angular_public');
var createInjector = require('../../src/injector');
describe('ngController', function() {
  beforeEach(function() {
    delete window.angular;
    publishExternalAPI();
  });
  it('is instantiated during compilation & linking', function() {
    var instantiated;
    function MyController() {
      instantiated = true;
    }
    var injector = createInjector(['ng', function($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div ng-controller="MyController"></div>');
         $compile(el)($rootScope);
        expect(instantiated).toBe(true);
    });
  });
});
```
我们也要测试controllers接收`$scope, $element`，并且如果需要`$attrs`作为依赖注入到arguments：
```js
it('may inject scope, element, and attrs', function() {
    var gotScope, gotElement, gotAttrs;
    function MyController($scope, $element, $attrs) {
        gotScope = $scope;
        gotElement = $element;
        gotAttrs = $attrs;
    }
    var injector = createInjector(['ng', function($controllerProvider) {
        $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div ng-controller="MyController"></div>');
        $compile(el)($rootScope);
        expect(gotScope).toBeDefined();
        expect(gotElement).toBeDefined();
        expect(gotAttrs).toBeDefined();
    });
});
```
在这里，我们测试scope接收的是从上下文的scope继承的scope - 意味着`ngController`需要创建一个新的scope(隔离scope)：
```js
it('has an inherited scope', function() {
    var gotScope;
    
    function MyController($scope, $element, $attrs) {
        gotScope = $scope;
    }
    
    var injector = createInjector(['ng', function ($controllerProvider) {
        $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function ($compile, $rootScope) {
        var el = $('<div ng-controller="MyController"></div>');
        $compile(el)($rootScope);
        expect(gotScope).not.toBe($rootScope);
        expect(gotScope.$parent).toBe($rootScope);
        expect(Object.getPrototypeOf(gotScope)).toBe($rootScope);
    });
});
```
现在我们做一些事情通过这些测试。我们放进一个叫作`src/direc- tives/ng_controller.js`的新文件。实现非常简单。下面是它的全部：
```js
'use strict';
var ngControllerDirective = function() {
  return {
    restrict: 'A',
    scope: true,
    controller: '@'
  }; 
};
module.exports = ngControllerDirective;
```
为了让我们的测试通过，我们需要在`angular_public.js`中引入新的指令作为`ng`的module：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = window.angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',
    require('./http').$HttpParamSerializerProvider);
  ngModule.provider('$httpParamSerializerJQLike',
    require('./http').$HttpParamSerializerJQLikeProvider);
  ngModule.provider('$compile', require('./compile'));
  ngModule.provider('$controller', require('./controller'));
ngModule.directive('ngController',
  require('./directives/ng_controller'));
}
```
`ngController`出其的简单。这是因为它在程序代码中使用很多，这样看来它是Angular框架结构的一个主要组成部分。事实上，`ngController`的整个实现跳出了`$controller`服务，
并且支持`$compile`中的controllers。
