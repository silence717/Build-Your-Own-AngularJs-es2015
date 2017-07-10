## Directive Link Functions
如果所有的公共link函数都给元素添加`$scope`的数据属性，它将变得不再有趣。但这肯定不是它所做的一切。公共link函数的主要任务是初始化指令真正的连接到DOM。这就是指向指令link函数的地方。

每一个指令都有它自己的link函数。如果你编写过Angular的指令，你会了解这个情况，并且你也会知道这是实际中经常使用的指令API。

指令的link函数和指令的compile函数是非常相似的，有两个主要的不同：
1. 这两个函数在不同的时间点上被调用。指令compile函数在编译阶段被调用，link函数在链接阶段被调用。这种差异主要与其他指令在这两个步骤中所起的作用有关。例如，在DOM改变
面前像`ngRepeat`，你的指令会编译一次，但是通过`ngRepeat`引入的每个项目都会独立的进行link。
2. compile函数可以访问DOM元素和属性对象，如我们所见。link函数不仅可以访问这些，也可以访问与之链接的Scope对象。这是通常将应用数据和功能连接到指令的地方。

这里有集中方式去定义指令link函数。最简单的开始是最低级的一种：当一个指令有一个`compile`函数，期望它返回一个link函数作为返回值。让我们做一个测试，检查link函数需要接收的参数：
```js
it('calls directive link function with scope', function() {
  var givenScope, givenElement, givenAttrs;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      compile: function() {
        return function link(scope, element, attrs) {
            givenScope = scope;
            givenElement = element;
            givenAttrs = attrs;
          }; 
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
link函数需要3个参数：
1. scope，我们期望它与公共link函数的scope相同。
2. element，我们期望它与实际应用指令的元素相同。
3. 一个元素的参数对象。

指令API经常因其复杂性而受到批评 - 而且常常是正确的 - 但是这里有一个很好的对应：公共的link函数返回公共的link函数，单个指令的compile函数返回它的link函数。
这是在所有编译和链接过程中重复的模式。

让我们通过连接公共link函数和指令link函数让测试通过。在我们需要处理的两个步骤之间会有几个中间步骤。

我们公共的`compile`函数调用`compileNodes`函数，它编译节点的集合。这里是中间步骤的第一步：`compileNodes`函数需要返回另一个link函数给我们。我们将此成为复合link函数，
因为它是单个节点link函数的组合。这个复合link函数由公共link函数调用：
```js
function compile($compileNodes) {
    var compositeLinkFn = compileNodes($compileNodes);
    return function publicLinkFn(scope) {
      $compileNodes.data('$scope', scope);
      compositeLinkFn(scope, $compileNodes);
    }; 
}
```
符合link函数接收两个参数：给link的scope，和DOM元素。后者与我们编译的的元素实际上是一样的，但不是总是这样，我们稍后再看。

因此，在`compileNodes`我们应该引入复合link的函数并且返回它：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var attrs = new Attributes($(node));
    var directives = collectDirectives(node, attrs);
    var terminal = applyDirectivesToNode(directives, node, attrs);
    if (!terminal && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  });
  function compositeLinkFn(scope, linkNodes) {
  }
  return compositeLinkFn;
}
```
复合link函数的工作是链接独立的节点。对于每一个，需要有另一个级别的link函数：每个节点有一个*节点link函数*，它是由`applyDirectivesToNode`函数返回：

注意到这意味着`applyDirectivesToNode`不再只是返回`terminal`标识。代替，`terminal`标识是节点link函数的一个*属性*：
```js
function compileNodes($compileNodes) {
  _.forEach($compileNodes, function(node) {
    var attrs = new Attributes($(node));
    var directives = collectDirectives(node, attrs);
    var nodeLinkFn;
    if (directives.length) {
      nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
    }
    if ((!nodeLinkFn || !nodeLinkFn.terminal) && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
  });
  function compositeLinkFn(scope, linkNodes) {
  }
  return compositeLinkFn;
}
```
我们在编译的时候将这些节点link函数集合到一个数组，连同我们当前在节点集合中的索引一起：
```js
function compileNodes($compileNodes) {
  var linkFns = [];
  _.forEach($compileNodes, function(node, i) {
    var attrs = new Attributes($(node));
    var directives = collectDirectives(node, attrs);
    var nodeLinkFn;
    if (directives.length) {
      nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
    }
    if ((!nodeLinkFn || !nodeLinkFn.terminal) && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
    if (nodeLinkFn) {
      linkFns.push({
        nodeLinkFn: nodeLinkFn,
        idx: i 
      });
    }
  });
  function compositeLinkFn(scope, linkNodes) {
  }
  return compositeLinkFn;
}
```
我们在循环结束的时候有存储对象，包含节点link函数和索引。我们只为有指令的节点去集合他们。

在复合link函数，我们现在可以调用我们集合的所有节点link函数：
```js
function compileNodes($compileNodes) {
  var linkFns = [];
  _.forEach($compileNodes, function(node, i) {
    var attrs = new Attributes($(node));
    var directives = collectDirectives(node, attrs);
    var nodeLinkFn;
    if (directives.length) {
      nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
    }
    if ((!nodeLinkFn || !nodeLinkFn.terminal) && node.childNodes && node.childNodes.length) {
      compileNodes(node.childNodes);
    }
    if (nodeLinkFn) {
      linkFns.push({
        nodeLinkFn: nodeLinkFn,
        idx: i 
      });
    }
  });
  function compositeLinkFn(scope, linkNodes) {
  	_.forEach(linkFns, function(linkFn) {
      linkFn.nodeLinkFn(scope, linkNodes[linkFn.idx]);
    });
  }
  return compositeLinkFn;
}
```
我们希望这里的compile节点和link节点是一一对应关系，因为我们希望索引可以匹配。这是一个不会永远存在的假设，但现在它会起作用。

最后，当我们进入每个独立的节点link函数，我们达到了可以将指令链接起来的点。我们需要收集指令的link函数 - 这是调用每个指令`compile`函数的结果：
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
      if (linkFn) {
        linkFns.push(linkFn);
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
现在我们可以构建节点link函数并且返回它。函数调用指令link函数。我们仍然设置`terminal`标识作为一个属性，因此`compileNodes`可以检查它的值：
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
      if (linkFn) {
        linkFns.push(linkFn);
      }
    }
    if (directive.terminal) {
      terminal = true;
      terminalPriority = directive.priority;
    }
  });
  function nodeLinkFn(scope, linkNode) {
    _.forEach(linkFns, function(linkFn) {
      var $element = $(linkNode);
      linkFn(scope, $element, attrs);
    });
  }
  nodeLinkFn.terminal = terminal;
  return nodeLinkFn;
}
```
我们的测试用例终于通过了，并且我们成功的完成了链接！就像我们看到的，这里有几个步骤调用，但是每个都有一个特殊的目的：
1. 公共link函数用于在编译的时候链接整个DOM树。
2. 复合link函数链接节点的集合。
3. 节点link函数链接所有单个节点的指令。
4. 指令link函数链接单个指令。

这些link函数的第一个和最后一个是作为应该开发者可以接触到的。中间的两个是`compile.js`的内部机制。

PS: 761 page have a process flow chart!