## Linking Directives Across Multiple Nodes
几张之前，我们看到如何将一个指令配置为`multiElement`指令，然后在DOM中使用`-start`和`-end`应用。这些情况在linking的时候需要特别注意，
因为你会期望这些指令的link函数接收一个从开始到结束的元素集合，而目前它只是接收了开始元素：
```js
it('invokes multi-element directive link functions with whole group', function() {
  var givenElements;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      multiElement: true,
      link: function(scope, element, attrs) {
        givenElements = element;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $(
      '<div my-directive-start></div>'+
      '<p></p>'+
      '<div my-directive-end></div>'
   );
   $compile(el)($rootScope);
   expect(givenElements.length).toBe(3);
  }); 
});
```
我们要做的是添加一个逻辑到`applyDirectivesToNode`知道多元素指令应用做什么。但首先我们做一个小小的重构，引入一个帮助函数收集节点的link函数，
这样指令`_.forEach`就不会太大：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [];
    function addLinkFns(preLinkFn, postLinkFn) {
      if (preLinkFn) {
        preLinkFns.push(preLinkFn);
      }
      if (postLinkFn) {
        postLinkFns.push(postLinkFn);
      }
    }
    _.forEach(directives, function(directive) {
      if (directive.$$start) {
        $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
      }
      if (directive.priority < terminalPriority) {
        return false;
      }
      if (directive.compile) {
        var linkFn = directive.compile($compileNode, attrs);
        if (_.isFunction(linkFn)) {
    addLinkFns(null, linkFn);
    } else if (linkFn) {
    addLinkFns(linkFn.pre, linkFn.post);
    } }
      if (directive.terminal) {
        terminal = true;
        terminalPriority = directive.priority;
      }
    });
    // ...
}
```
`addLinkFns`新函数会知道一些技巧关于多元素指令，但是往后县我们需要了解我们实际上如何处理它。我们已经有了添加到指令对象的`$$start`和`$$end`属性
在这些情况（我们在`addDirective`做的）。这些属性包含属性名称，我们在DOM中使用的去标记指令应用的开始和结束。我们传递他们到`addLinkFns`：
```js
_.forEach(directives, function(directive) {
  if (directive.$$start) {
    $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
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
```
在`addLinkFns`我们将检查这些参数实际上是否具有定义的值。如果有，我们将要特殊的包装器包装link函数，这些包装器知道如何处理开始和结束的元素集合：
```js
function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd) {
    if (preLinkFn) {
        if (attrStart) {
          preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
        }
        preLinkFns.push(preLinkFn);
    }
    if (postLinkFn) {
        if (attrStart) {
          postLinkFn = groupElementsLinkFnWrapper(postLinkFn, attrStart, attrEnd);
        }
        postLinkFns.push(postLinkFn);
    }
}
```
`groupElementsLinkFnWrapper`新函数返回一个包装的link函数，它替换`element`到原始的link函数使用全部的元素组。为收集这个组，我们已经
有了需要的函数：`groupScan`函数我们在编译阶段做的相同的事情：
```js
function groupScan(node, startAttr, endAttr) {
// ..
}
function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
  return function(scope, element, attrs) {
    var group = groupScan(element[0], attrStart, attrEnd);
    return linkFn(scope, group, attrs);
  };
}
```
因此，我们有多元素指令是一个在公共link函数和指令link函数间接的功能：一个包装器知道如何处理元素组，给定开始元素和开始、结束属性名称。