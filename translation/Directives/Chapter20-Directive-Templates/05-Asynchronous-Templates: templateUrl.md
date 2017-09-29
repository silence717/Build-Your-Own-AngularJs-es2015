## Asynchronous Templates: templateUrl
当你使用`template`属性，你将指令的模板HTML定义在JavaScript代码中。这不是存储HTML非常方便的一个地方，尤其是比较多的时候。

通常存储HTML比较方面的是在独立的`.html`文件中，然后将它们加载到应用中。为了这个目的，Angular支持`templateUrl`指令属性。当它被定义，模板通过指定的URL通过HTTP加载。

由于使用HTTP加载通常是异步的，这意味着当遇到一个指令有模板URL，当模板正在加载中的时候我们应该暂停编译。当模板加载回来的时候再去恢复编译。这章剩余的部分主要是处理pause-and-resume的需求。

对于这个功能我们要添加的第一个测试就是检查当遇到一个异步模板指令的时候编译器`should't`什么。

首先，在这个阶段我们不应该编译元素剩余的任何指令：
```js
describe('templateUrl', function() {
		
    it('defers remaining directive compilation', function() {
        var otherCompileSpy = jasmine.createSpy();
        var injector = makeInjectorWithDirectives({
            myDirective: function() {
                return {templateUrl: '/my_directive.html'};
            },
            myOtherDirective: function() {
                return {compile: otherCompileSpy};
            }
        });
        injector.invoke(function($compile) {
            var el = $('<div my-directive my-other-directive></div>');
            $compile(el);
            expect(otherCompileSpy).not.toHaveBeenCalled();
        });
    
    });
});
```
现在，我们要做的就是当作指令有一个`templateUrl`属性立马结束指令循环。我们可以通过在循环中返回`false`来做，因为LoDash的`_.forEach`当遇到的时候将会终止循环：
```js
if (directive.template) {
  if (templateDirective) {
    throw 'Multiple directives asking for template';
  }
  templateDirective = directive;
  $compileNode.html(_.isFunction(directive.template) ? directive.template($compileNode, attrs) : directive.template);
}

if (directive.templateUrl) {
 return false;
}
```
不仅其他指令要终止编译，当遇到template URL的时候当前正在编译的指令也该终止：
```js
it('defers current directive compilation', function() {
    var compileSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                templateUrl: '/my_directive.html',
                compile: compileSpy
            };
        }
    });
    injector.invoke(function($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        expect(compileSpy).not.toHaveBeenCalled();
    });
});
```
为了满足这个需求，我们需要移动一些东西。`if (directive.compile) { }`块需要被移动到`templateUrl`块后面放到`else if`分支中。块中的所有代码保持不变。当一个指令有`templateUrl`它不会被调用所以移动了：
```js
// 如果指令存在templateUrl,终止循环
if (directive.templateUrl) {
    return false;
} else if (directive.compile) {
    const linkFn = directive.compile($compileNode, attrs);
    const isolateScope = (directive === newIsolateScopeDirective);
    const attrStart = directive.$$start;
    const attrEnd = directive.$$end;
    const require = directive.require;
    
    // 如果linkFn是一个函数
    if (_.isFunction(linkFn)) {
        addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope, require);
        postLinkFns.push(linkFn);
    } else if (linkFn) {
        addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd, isolateScope, require);
    }
}
```
在这个阶段会发生的另一件事情就是当前元素的内容应该被移除。最终当模板获取到的时候都会被模板内容代替，但是我们需要立即移除其他旧的内容，这样就不会造成不必要的编译：
```js
it('immediately empties out the element', function() {
  var injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {templateUrl: '/my_directive.html'};
      }
    });
    injector.invoke(function($compile) {
      var el = $('<div my-directive>Hello</div>');
      $compile(el);
      expect(el.is(':empty')).toBe(true);
  }); 
});	
```
为了这个目的，我们引入一个新函数叫作`compileTemplateUrl`，它的工作是处理所有异步请求进入返回的模板：
```js
if (directive.templateUrl) {
  compileTemplateUrl($compileNode);
  return false;
}
```
这个函数（在`applyTemplatesToNode`函数外引入）在这个阶段只是清理节点不做其他工作，是的我们的测试通过：
```js
function compileTemplateUrl($compileNode) {
  $compileNode.empty();
}
```
现在我们已经有效地实现了当DOM子树看到`templateUrl`的时候暂停编译处理程序：当前元素上的当前指令和其他指令都不会再编译，并且元素的子元素已经被移除。

现在我们开始思考如何恢复编译。我们需要做的是从URL获取指定的模板。这个我们可以使用在本书前面章节实现的`$http`服务。

为了测试模板获取，我们需要安装fake XMLHttpRequest支持从Sinon.js就像我们在`$http`章节的一样。

首先，我们引入Sinon到`compile_spec.js`:
```js
'use strict';
var _ = require('lodash');
var $ = require('jquery');
var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
```
然后添加下面的设置代码到`describe(‘templateUrl’)`测试块：
```js
describe('templateUrl', function() {
    var xhr, requests;
    beforeEach(function() {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function(req) {
        requests.push(req);
      };
    });
    afterEach(function() {
      xhr.restore();
    });
    // ...
});
```
现在我们可以添加第一个模板加载的用例。它检查当一个指令有一个`templateUrl`编译，URL有一个GET请求：
```js
it('fetches the template', function() {
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {templateUrl: '/my_directive.html'};
    }
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el);
    $rootScope.$apply();
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('/my_directive.html');
  }); 
});
```
注意到`$aaply`在`$compile`后面调用。我们需要它来启动`$http`内部的promise链。

我们从`compileTemplateUrl`中制造HTTP请求。在做这个之前，它需要访问指令对象，所以我们需要传递它：
```js
if (directive.templateUrl) {
  compileTemplateUrl(directive, $compileNode);
  return false;
} else if (directive.compile) {
```
我可以使用`$http`服务的`get`方法创建真正的请求：
```js
function compileTemplateUrl(directive, $compileNode) {
  $compileNode.empty();
  $http.get(directive.templateUrl);
}
```
我们在`$compiler`服务里面还没有`$http`，因此我们需要在`CompileProvider.$get`中注入它：
```js
this.$get = ['$injector', '$parse', '$controller', '$rootScope', '$http',
    function($injector, $parse, $controller, $rootScope, $http) {
```
现在满足了我们的测试。

当最终接收到模板应该发生什么？最多有效的行为就是元素的内容将全部来源于模板：
```js
it('populates element with template', function() {
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {templateUrl: '/my_directive.html'};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div class="from-template"></div>');
        expect(el. nd('> .from-template').length).toBe(1);
    });
});
``` 
这个可以通过从`$http`调用返回一个`success`处理器到promise。处理器的第一个参数将是响应的body - 模板HTML：
```js
function compileTemplateUrl(directive, $compileNode) {
    $compileNode.empty();
    $http.get(directive.templateUrl).success(function(template) {
      $compileNode.html(template);
    });
}
```
现在我们有了在DOM的状态，我们可以恢复编译指令。这意味着当一个模板响应接收到，我们也应该期望当前指令编译函数最终会被调用：
```js
it('compiles current directive when template received', function() {
    var compileSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {
                templateUrl: '/my_directive.html',
                compile: compileSpy
            };
        } });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div class="from-template"></div>');
        expect(compileSpy).toHaveBeenCalled();
    });
});
```
对于元素上剩下的指令都是`true` - 需要在`applyDirectivesToNode`跳出。我们现在应该也要编译他们：
```js
it('resumes compilation when template received', function() {
    var otherCompileSpy = jasmine.createSpy();
    var injector = makeInjectorWithDirectives({
        myDirective: function() {
            return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function() {
            return {compile: otherCompileSpy};
        }
    });
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div class="from-template"></div>');
        expect(otherCompileSpy).toHaveBeenCalled();
    });
});
```
这个如何工作？我们要做的是当接收到模板的时候，什么时候恢复`applyDirectivesToNode`中的逻辑，但是目前对于指令没有做的只有编译。这就是我们将要做的。

开始之前，`compileTemplateUrl`不仅需要访问当前指令，而且要访问当前没有应用的所有指令。换句话说，它需要我们已经有的指令的子数组，从当前指令的索引开始。
另外，我们将床底当前元素的`Attributes`对象，因为我们也需要这个：
```js
if (directive.templateUrl) {
  compileTemplateUrl(_.drop(directives, i), $compileNode, attrs);
  return false; 
```
`i`变量在这里并不存在。我们应该引入它作为指令`_.forEach`循环的第二个参数。它指向循环中的当前索引：
```js
_.forEach(directives, function(directive, i) {
// ...
});
```
现在`compileTemplateUrl`的第一个参数将是一个数组，并且有`templateUrl`的指令将是数组的第一项：
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives[0];
  $compileNode.empty();
  $http.get(origAsyncDirective.templateUrl).success(function(template) {
    $compileNode.html(template);
  });
}
```
现在我们有了需要返回到`applyDirectivesToNode`的一切东西：
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives[0];
  $compileNode.empty();
  $http.get(origAsyncDirective.templateUrl).success(function(template) {
    $compileNode.html(template);
    applyDirectivesToNode(directives, $compileNode, attrs);
  }); 
}
```
这里仍然有一个问题。我们恢复了含有`templateUrl`属性指令的编译。这意味着`applyDirectivesToNode`将很快看到`templateUrl`并且再次停止编译。我们永远就在一遍又一遍的获取模板。

我们可以通过从指令数组移除异步模板指令来解决：
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives.shift();
  $compileNode.empty();
  $http.get(origAsyncDirective.templateUrl).success(function(template) {
    $compileNode.html(template);
    applyDirectivesToNode(directives, $compileNode, attrs);
  });
}
```
我们将使用一个新的指令对象代替它，这个对象从原来的指令拷贝所有的属性，但是设置`templateUrl`为`null`。
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives.shift();
  var derivedSyncDirective = _.extend(
      {},
      origAsyncDirective,
      {templateUrl: null}
  );
  $compileNode.empty();
  $http.get(origAsyncDirective.templateUrl).success(function(template) {
    directives.unshift(derivedSyncDirective);
    $compileNode.html(template);
    applyDirectivesToNode(directives, $compileNode, attrs);
  });
}
```
另外一个仍然缺失的事情就是，恢复子节点的编译处理。`applyDirectivesToNode`函数没有做它。
```js
it('resumes child compilation after template received', function() {
  var otherCompileSpy = jasmine.createSpy();
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {templateUrl: '/my_directive.html'};
    },
    myOtherDirective: function() {
      return {compile: otherCompileSpy};
    }
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el);
    $rootScope.$apply();
    requests[0].respond(200, {}, '<div my-other-directive></div>');
    expect(otherCompileSpy).toHaveBeenCalled();
  });
});
```
为了让这个工作我们需要做的是调用`compileNodes`在当前节点的子节点 - 在这个阶段包含从模板来的子节点：
```js
function compileTemplateUrl(directives, $compileNode, attrs) {
  var origAsyncDirective = directives.shift();
  var derivedSyncDirective = _.extend({}, origAsyncDirective, {templateUrl: null});
  $compileNode.empty();
  $http.get(origAsyncDirective.templateUrl).success(function(template) {
    directives.unshift(derivedSyncDirective);
    $compileNode.html(template);
    applyDirectivesToNode(directives, $compileNode, attrs);
    compileNodes($compileNode[0].childNodes);
  }); 
}
```