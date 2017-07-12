## Pre- And Post-Linking
一个元素的子元素在元素本身link之前先被link起来似乎很奇怪。这是一个很好的解释，这其实有两种不同的link函数，而到目前为止我们只看到了其中一种：这里既有*prelink*
函数也有*postlink*函数。两者之间的区别是他们调用的顺序。prelink函数在子节点link之前被调用，postlink函数在子节点link后调用。

到目前为止我们调用的link函数实际上是postlink函数，当你不指定一个或者另一个的时候，默认的是postlink。另一个更能明确表达我们目前已经做的，就是在指令定义对象里面
需要一个嵌套的`post`键:
```js
it('supports link function objects', function() {
  var linked;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: {
        post: function(scope, element, attrs) {
          linked = true;
        }
      } 
    };
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div><div my-directive></div></div>');
    $compile(el)($rootScope);
    expect(linked).toBe(true);
  }); 
});
```
当我们compile一个节点，我们需要看是否有一个直接的link函数，或者link函数的对象，在这种情况下我们将访问对象的`post`键值去找到函数本身：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var linkFns = [];
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
        linkFns.push(linkFn);
      } else if (linkFn) {
        linkFns.push(linkFn.post);
      }
    }
    if (directive.terminal) {
      terminal = true;
      terminalPriority = directive.priority;
    }
  });
  return terminal;
}
```
对于link函数有这个对象符号的真正原因是，我们现在支持pre-和postlink函数。让我们建立一个测试用例具有两级节点，并且检查link的调用顺序：
```js
it('supports prelinking and postlinking', function() {
  var linkings = [];
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: {
        pre: function(scope, element) {
          linkings.push(['pre', element[0]]);
        },
        post: function(scope, element) {
          linkings.push(['post', element[0]]);
        }
      } 
    };
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive><div my-directive></div></div>');
    $compile(el)($rootScope);
    expect(linkings.length).toBe(4);
    expect(linkings[0]).toEqual(['pre',  el[0]]);
    expect(linkings[1]).toEqual(['pre',  el[0].firstChild]);
    expect(linkings[2]).toEqual(['post', el[0].firstChild]);
    expect(linkings[3]).toEqual(['post', el[0]]);
  });
});
```
我们在这里确定的link函数调用顺序是：
1. Parent prelink
2. Child prelink
3. Child postlink
4. Parent postlink

目前，测试失败的prelink函数并没有被调用。

我们修改`applyDirectivesToNode`以便手机link函数到两个分离的数组：`preLinkFns`和`postLinkFns`:
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  var preLinkFns = [], postLinkFns = [];
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
        postLinkFns.push(linkFn);
      } else if (linkFn) {
      if (linkFn.pre) {
        preLinkFns.push(linkFn.pre);
      }
      if (linkFn.post) {
        postLinkFns.push(linkFn.post);
      }
      }
    }
    if (directive.terminal) {
      terminal = true;
      terminalPriority = directive.priority;
    }
  });
  return terminal;
}
```
然后我们更改节点link函数去支持我们想要的调用顺序：首先我们调用prelink函数，然后调用子的link函数，最终调用postlink函数：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    var $element = $(linkNode);
    _.forEach(preLinkFns, function(linkFn) {
      linkFn(scope, $element, attrs);
    });
    if (childLinkFn) {
      childLinkFn(scope, linkNode.childNodes);
    }
    _.forEach(postLinkFns, function(linkFn) {
      linkFn(scope, $element, attrs);
  });
}
```
在上衣部分我们传递子节点的link函数到节点link函数而不是直接调用它。现在我们看一下主要原因：这给节点link函数一个机会调用自己的prelink函数在调用子link函数钱。

在prelink和postlink之间有一个主要的不同，这与它们在一个元素中调用的顺序有关。prelink函数按照指令的优先级顺序调用，但是postlink函数实际调用顺序和指令优先级
是相反的。这是关于postlink的一般规则，在多个元素或者单个元素：他们和编译的顺序相比是相反的。

我们当前的实现仍然以优先级顺序调用这两种link函数，因为我们仅仅按照在编译过程中收集他们的顺序调用。下面的测试还是没通过：
```js
it('reverses priority for postlink functions', function() {
  var linkings = [];
  var injector = makeInjectorWithDirectives({
    firstDirective: function() {
      return {
        priority: 2,
        link: {
          pre: function(scope, element) {
            linkings.push('first-pre');
          },
          post: function(scope, element) {
            linkings.push('first-post');
          }
        } 
      };
    },
    secondDirective: function() {
      return {
        priority: 1,
        link: {
          pre: function(scope, element) {
            linkings.push('second-pre');
          },
          post: function(scope, element) {
            linkings.push('second-post');
          }
        } 
      };
    }, 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div first-directive second-directive></div>');
    $compile(el)($rootScope);
    expect(linkings).toEqual([
      'first-pre',
      'second-pre',
      'second-post',
      'first-post'
    ]); 
  });
});
```
我们可以通过改变迭代函数使用postlink去修复，以便于他们从右向左遍历：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
  var $element = $(linkNode);
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