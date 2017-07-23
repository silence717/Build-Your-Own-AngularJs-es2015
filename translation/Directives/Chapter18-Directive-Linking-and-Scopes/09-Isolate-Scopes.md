## Isolate Scopes
回到第2章节我们看到继承scope有两种可选的方式：原型继承，和非原型，隔离scope继承。我们已经看到了第一种方法与指令有什么联系。接下来的章节我们会把注意力放到第2种。

正如我们所知，隔离scope的作用域是scope分层，但是不继承他们父亲的属性。他们参与事件传播和脏检查循环与其他Scope一起工作，但你不能使用他们分享从父亲到后代的任意数据。
当你在一个指令中使用隔离scope，使指令模块化更加容易，因为你可以或多或少的确保指令与周围环境隔离。

然而，隔离作用域并不完全脱离他们的上下文。指令系统允许你绑定属性从周围环境到隔离scope，通过指令隔离scope绑定。这和继承scope最主要的不同是所有传递到隔离scope的东西
必须在定隔离绑定里面明确定义，对于正常的继承scope所有的父亲属性通过JavaScript对象原型传递，不管你是否需要他们。

但是，在我们进入绑定之前，我们先了解一下基本情况。一个隔离scope通过使用对象作为指令`scope`属性的值。该指令的scope将是从周围的上下文决定的子scope，但是不会从原先继承：
```js
it('creates an isolate scope when requested', function() {
     var givenScope;
     var injector = makeInjectorWithDirectives('myDirective', function() {
       return {
         scope: {},
         link: function(scope) {
           givenScope = scope;
         }
     }; 
     });
     injector.invoke(function($compile, $rootScope) {
       var el = $('<div my-directive></div>');
       $compile(el)($rootScope);
       expect(givenScope.$parent).toBe($rootScope);
       expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
     }); 
   });
```
隔离scope指令一个重要点，使他们不同于普通的继承scope指令是，如果一个指令使用隔离scope，该scope与同一元素上的其他指令不一样。scope对于指令是隔离的，而不是整个元素：
```js
it('does not share isolate scope with other directives', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        scope: {} 
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
    expect(givenScope).toBe($rootScope);
  }); 
});
```
正如我们看到的，当一个元素上有两个指令，并且其中一个使用隔离scope,第二个指令仍然使用周围上下文的scope：
```js
it('does not use isolate scope on child elements', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        scope: {} 
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
      var el = $('<div my-directive><div my-other-directive></div></div>');
      $compile(el)($rootScope);
      expect(givenScope).toBe($rootScope);
  }); 
});
```
用基本的隔离测试，我们开始构建我们需要的东西。

在`applyDirectivesToNode`我们检测指令请求隔离scope，并且传递信息到`addLinkFns`:
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [];
    var newScopeDirective, newIsolateScopeDirective;
    function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope) {
    // ...
    }
    _.forEach(directives, function(directive) {
      if (directive.$$start) {
        $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
      }
      if (directive.priority < terminalPriority) {
        return false;
      }
      if (directive.scope) {
        if (_.isObject(directive.scope)) {
          newIsolateScopeDirective = directive;
        } else {
          newScopeDirective = newScopeDirective || directive;
        }
      }
      if (directive.compile) {
        var linkFn = directive.compile($compileNode, attrs);
        var isolateScope = (directive === newIsolateScopeDirective);
        var attrStart = directive.$$start;
        var attrEnd = directive.$$end;
    
      if (_.isFunction(linkFn)) {
        addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope);
      } else if (linkFn) {
        addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd, isolateScope);
        } 
      }
      if (directive.terminal) {
        terminal = true;
        terminalPriority = directive.priority;
      }
    });
    // ...
}
```
在`addLinkFns`我们仅仅需要添加`isolateScope`标识到pre和post link函数：
```js
function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope) {
  if (preLinkFn) {
    if (attrStart) {
      preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
    }
    preLinkFn.isolateScope = isolateScope;
    preLinkFns.push(preLinkFn);
  }
  if (postLinkFn) {
    if (attrStart) {
      postLinkFn = groupElementsLinkFnWrapper(postLinkFn, attrStart, attrEnd);
    }
    postLinkFn.isolateScope = isolateScope;
    postLinkFns.push(postLinkFn);
  }
}
```
然后在节点link函数，我们将实际创建隔离scope，如果元素的指令都需要她我们将这样做：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    var isolateScope;
    if (newIsolateScopeDirective) {
      isolateScope = scope.$new(true);
    }
    _.forEach(preLinkFns, function(linkFn) {
      linkFn(scope, $element, attrs);
    });
    if (childLinkFn) {
      childLinkFn(scope, linkNode.childNodes);
    }
    _.forEachRight(postLinkFns, function(linkFn) {
      linkFn(scope, $element, attrs);
    }); 
}
```
接下来我们传递隔离Scope到任意的link函数我们已经有了`isolateScope`标识。这意味着隔离scope的指令link函数接收隔离scope，但是其他接收上下文scope。另外，子link函数永远不会接收隔离scope:
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    var isolateScope;
    if (newIsolateScopeDirective) {
      isolateScope = scope.$new(true);
    }
    _.forEach(preLinkFns, function(linkFn) {
      linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs);
    });
    if (childLinkFn) {
      childLinkFn(scope, linkNode.childNodes);
    }
    _.forEachRight(postLinkFns, function(linkFn) {
      linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs);
    }); 
}
```
正如我们看到，隔离scope不会和同一元素的其他指令或者子元素共享scope。此外，仅允许元素上的一个指令为其自身创建隔离scope。在编译过程中多次尝试将其抛出：
```js
it('does not allow two isolate scope directives on an element', function() {
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        scope: {} 
      };
    },
    myOtherDirective: function() {
    return {
      scope: {} };
    } 
  });
  injector.invoke(function($compile, $rootScope) {
      var el = $('<div my-directive my-other-directive></div>');
      expect(function() {
        $compile(el);
      }).toThrow();
  }); 
});
```
实际上，如果一个元素上有一个隔离作用域的scope，其他资料不允许有非隔离的scope,继承scope:
```js
it('does not allow both isolate and inherited scopes on an element', function() {
  var injector = makeInjectorWithDirectives({
    myDirective: function() {
      return {
        scope: {} };
      },
    myOtherDirective: function() {
      return {
        scope: true
      };
    } 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-other-directive></div>');
    expect(function() {
      $compile(el);
    }).toThrow();
  }); 
});
```
我们在`applyDirectivesToNode`去检查这个条件，我们有两种方式可以打破规则：
1. 在我们遇到一个隔离scope,并且早已经有了另一隔离scope或者继承scope。
2. 我们遇到一个继承scope指令，并且我们早期已经有了隔离scope。

在这两种情况下，我们将对Angular应用的开发者抛出一个信息：
```js
_.forEach(directives, function(directive) {
  if (directive.$$start) {
    $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
  }
  if (directive.priority < terminalPriority) {
    return false;
  }
  if (directive.scope) {
    if (_.isObject(directive.scope)) {
      if (newIsolateScopeDirective || newScopeDirective) {
        throw 'Multiple directives asking for new/inherited scope';
      }
      newIsolateScopeDirective = directive;
      } else {
      if (newIsolateScopeDirective) {
        throw 'Multiple directives asking for new/inherited scope';
      }
      newScopeDirective = newScopeDirective || directive;
    }
  }
  // ...
});
```
最后，应用一个隔离scope指令引起元素将接收一个`ng-isolate-scope`css class（同时不会接收`ng-scope`class），并且scope对象作为jQuery data到`$isolateScope`key:
```js
it('adds class and data for element with isolated scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {},
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect(el.hasClass('ng-isolate-scope')).toBe(true);
    expect(el.hasClass('ng-scope')).toBe(false);
    expect(el.data('$isolateScope')).toBe(givenScope);
  }); 
});
```
当隔离scope对象创建时，这列昂个操作都在节点link函数中完成：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
	var $element = $(linkNode);
    var isolateScope;
    if (newIsolateScopeDirective) {
      isolateScope = scope.$new(true);
      $element.addClass('ng-isolate-scope');
      $element.data('$isolateScope', isolateScope);
    }
    // ...
}
```
