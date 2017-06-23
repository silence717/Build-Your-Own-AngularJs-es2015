## Terminating Compilation
通常，当你给Angular一些DOM元素去编译时，从哪个元素开始的整个DOM子树马上开始编译。这是因为我们在本章中实现的递归性质。在这些情况下，并非所有的都会编译。其中之一就是DOM
中使用的*终止指令*。

一个指令可以被标记为终止，通过在定义对象设置`terminal`为`true`。然后当编译指令时，它立即终止编译，元素上的其他指令都不会被编译。

大多数使用`terminal`情况是指令想延迟编译。例如，Angular内置的`ng-if`就是一个终止指令，使用它可以阻止DOM的子树编译。当它的表达式为真的时，然后指令为它的内容启动另一个指令编译。
它采用嵌入包含的功能在后面的章节会实现。
```angular2html
<div ng-if="condition">
  <!-- Contents compiled later when condition is true -->
  <div some-other-directive></div>
</div>
```
就像讨论的，当一个节点上有一个终止指令，其他比它优先级低的指令将不会编译：
```js
it('stops compiling at a terminal directive', function() {
  var compilations = [];
  var myModule = window.angular.module('myModule', []);
  myModule.directive('firstDirective', function() {
    return {
      priority: 1,
      terminal: true,
      compile: function(element) {
        compilations.push('first');
      }
    }; 
  });
  myModule.directive('secondDirective', function() {
    return {
      priority: 0,
      compile: function(element) {
        compilations.push('second');
      }
    }; 
  });
  var injector = createInjector(['ng', 'myModule']);
  injector.invoke(function($compile) {
    var el = $('<div first-directive second-directive></div>');
    $compile(el);
    expect(compilations).toEqual(['first']);
  }); 
});
```
然而，如果这里有另一个指令和终止指令有着相同的优先级，他们仍然会被编译：
```js
it('still compiles directives with same priority after terminal', function() {
  var compilations = [];
  var myModule = window.angular.module('myModule', []);
  myModule.directive('firstDirective', function() {
    return {
      priority: 1,
      terminal: true,
      compile: function(element) {
        compilations.push('first');
      }
    }; 
  });
  myModule.directive('secondDirective', function() {
    return {
      priority: 1,
      compile: function(element) {
        compilations.push('second');
      }
    }; 
  });
  var injector = createInjector(['ng', 'myModule']);
  injector.invoke(function($compile) {
    var el = $('<div first-directive second-directive></div>');
    $compile(el);
    expect(compilations).toEqual(['first', 'second']);
  }); 
});
```
在`applyDirectivesToNode`，这是我们实际编译指令的地方，我们可以跟踪我们可能看到的任何指令的优先级。我们使用 JavaScript 中尽可能低的数字去初始化"终止优先级"，
并在终止指令看到的时候更新它：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  _.forEach(directives, function(directive) {
    if (directive.compile) {
      directive.compile($compileNode, attrs);
    }
    if (directive.terminal) {
      terminalPriority = directive.priority;
    }
  }); 
}
```
如果我们遇到一个指令优先级比终止指令的低，我们通过返回`false`退出指令循环，有效的阻止这个节点的编译：
```js
function applyDirectivesToNode(directives, compileNode, attrs) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  _.forEach(directives, function(directive) {
  	if (directive.priority < terminalPriority) {
      return false;
    }
    if (directive.compile) {
      directive.compile($compileNode, attrs);
    }
    if (directive.terminal) {
      terminalPriority = directive.priority;
    }
  }); 
}
```
当终止指令遇到子节点未被编译时候应该怎么做。当编译应该终止时，我们仍在编译他们：
```js
it('stops child compilation after a terminal directive', function() {
  var compilations = [];
  var myModule = window.angular.module('myModule', []);
  myModule.directive('parentDirective', function() {
    return {
      terminal: true,
      compile: function(element) {
        compilations.push('parent');
      }
    }; 
  });
  myModule.directive('childDirective', function() {
    return {
      compile: function(element) {
        compilations.push('child');
      }
    }; 
  });
  var injector = createInjector(['ng', 'myModule']);
  injector.invoke(function($compile) {
    var el = $('<div parent-directive><div child-directive></div></div>');
    $compile(el);
    expect(compilations).toEqual(['parent']);
  }); 
});
```
现在，我们可以做的是从`applyDirectivesToNode`返回一个"终止"标识，当一个节点有终止指令的时候，这个值应该为`true`：
```js
function applyDirectivesToNode(directives, compileNode) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  _.forEach(directives, function(directive) {
      if (directive.priority < terminalPriority) {
        return false;
      }
      if (directive.compile) {
        directive.compile($compileNode);
      }
      if (directive.terminal) {
        terminal = true;
        terminalPriority = directive.priority;
      }
  });
  return terminal;
}
```
我们在`compileNodes`检测这个标识。如果它被某个节点设置，我们跳过它子节点的编译：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var directives = collectDirectives(node);
    var terminal = applyDirectivesToNode(directives, node);
    if (!terminal && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  }); 
}
```
稍后我们将重温实现的细节，这个标识的管理，但是无论我们已经实现了这个功能的重点。
