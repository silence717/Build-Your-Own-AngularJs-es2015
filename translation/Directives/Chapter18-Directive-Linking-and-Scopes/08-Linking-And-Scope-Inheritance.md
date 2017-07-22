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
这里我们在同一元素上应用两个指令，其中一个需要继承scope。我们检查指令，即使它没有继承的scope，现在我们获取一个。

当一个元素上有继承scope的时候，有两个东西添加到元素上：
* 一个`ng-scope`的css class
* 一个作为jQuery/jqLite数据scope对象

```js
it('adds scope class and data for element with new scope', function() {
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
    expect(el.hasClass('ng-scope')).toBe(true);
    expect(el.data('$scope')).toBe(givenScope);
  }); 
});
```
我们让测试通过。让需要做的第一件事情就是检查指令的是否需要一个新的scope。我们可以在`applyDirectivesToNode`，如果我们遇到至少一个指令的`scope`属性是`true`，
我们需要设置一个类似的节点link函数：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [];
  var newScopeDirective;
  
    function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd) {
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
      newScopeDirective = newScopeDirective || directive;
    }
    if (directive.compile) {
      var linkFn = directive.compile($compileNode, attrs);
      var attrStart = directive.$$start;
      var attrEnd = directive.$$end;
      if (_.isFunction(linkFn)) {
        addLinkFns(null, linkFn, attrStart, attrEnd);
      } else if (linkFn) {
        addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd);
      }
    }
    if (directive.terminal) {
      terminal = true;
      terminalPriority = directive.priority;
    }
    });
    function nodeLinkFn(childLinkFn, scope, linkNode) {
    // ...
    }
  nodeLinkFn.terminal = terminal;
  nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope;
  return nodeLinkFn;
}
```
在复合link函数，如果节点link函数被标记，我们需要创建一个新的scope。就是节点至少需要一个指令需要继承的scope：
```js
_.forEach(linkFns, function(linkFn) {
  if (linkFn.nodeLinkFn) {
    if (linkFn.nodeLinkFn.scope) {
      scope = scope.$new();
    }
    linkFn.nodeLinkFn(
          linkFn.childLinkFn,
          scope,
          stableNodeList[linkFn.idx]
      );
    } else {
        linkFn.childLinkFn(
          scope,
          stableNodeList[linkFn.idx].childNodes
        );
    } 
});
```
如果有继承的scope我们应该设置css样式和data。在编译的过程中css样式已被添加 - 不是在linking中：
```js
_.forEach($compileNodes, function(node, i) {
  var attrs = new Attributes($(node));
  var directives = collectDirectives(node, attrs);
  var nodeLinkFn;
  if (directives.length) {
    nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
  }
  var childLinkFn;
  if ((!nodeLinkFn || !nodeLinkFn.terminal) &&
      node.childNodes && node.childNodes.length) {
    childLinkFn = compileNodes(node.childNodes);
  }
  if (nodeLinkFn && nodeLinkFn.scope) {
    attrs.$$element.addClass('ng-scope');
  }
  if (nodeLinkFn || childLinkFn) {
      linkFns.push({
        nodeLinkFn: nodeLinkFn,
        childLinkFn: childLinkFn,
        idx: i
      }); 
  }
});
```
在linking过程中添加`$scope`的jQuery data - 因为到目前为止我们还没有scope对象：
```js
_.forEach(linkFns, function(linkFn) {
    var node = stableNodeList[linkFn.idx];
    if (linkFn.nodeLinkFn) {
      if (linkFn.nodeLinkFn.scope) {
        scope = scope.$new();
        $(node).data('$scope', scope);
      }
      linkFn.nodeLinkFn(
        linkFn.childLinkFn,
        scope,
        node
      );
    } else {
      linkFn.childLinkFn(
        scope,
        node.childNodes
      ); 
    }
});
```
在本书的第一部分中，我们讨论了scope继承一般遵循DOM树结构。现在我们看到了实际上是如何发生的：指令可以要求创建新的scope，在这种情况下，应用指令的元素
 - 和他们的子节点 - 获取他们的继承scope。
 