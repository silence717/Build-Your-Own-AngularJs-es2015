## Applying Directives Across Multiple Nodes
到目前为止，我们已经知道了如何使用四种不同的机制将指令与单个元素匹配。还有一个机制可以覆盖，它将指令与几个兄弟元素的集合匹配，通过明确的生命指令开始和结束元素：
```angular2html
<div my-directive-start>
</div>
<some-other-html></some-other-html>
<div my-directive-end>
</div>
```
不是所有的指令都可以使用这种方式应用。指令作者必须明确的设置一个`multiElement`标识在指令定义对象去让这种行为生效。此外这种机制只应用于属性匹配。

当你像这样应用一个属性指令，你得到的指令`compile`函数是一个 jQuery/jqLite 对象，包含开始、结束元素和他们之间的所有元素：
```js
it('allows applying a directive to multiple elements', function() {
  var compileEl = false;
  var injector = makeInjectorWithDirectives('myDir', function() {
    return {
      multiElement: true,
      compile: function(element) {
        compileEl = element;
      }
    }; 
  });
  injector.invoke(function($compile) {
    var el = $('<div my-dir-start></div><span></span><div my-dir-end></div>');
    $compile(el);
    expect(compileEl.length).toBe(3);
  }); 
});
```
开始/结束属性处理开始在`collectDirectives`，我们第一次迭代每个元素属性的函数。在这里我们需要做的是检测我们处理的是否是一个多元素指令。完成它有3个步骤：
* 从指令名称来判断是否有Start或者End后缀
* 通过名称判断是否有注册多元素指令
* 查看当前的书序名称是不是以Start结束

如果2和3都是`true`，我们将处理一个多元素指令应用：
```js
_.forEach(node.attributes, function(attr) {
  var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
  if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
    normalizedAttrName = normalizedAttrName[6].toLowerCase() +normalizedAttrName.substring(7);
  }
  var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
  if (directiveIsMultiElement(directiveNName)) {
    if (/Start$/.test(normalizedAttrName)) {
    }
  }
  addDirective(directives, normalizedAttrName, 'A');
});
```
新帮助函数`directiveIsMultiElement`首先去查看是否具有给定名称的指令注册。如果有的话从 injector 获取他们，并且检测他们中是否有`multiElement`标识设置为`true`：
```js
function directiveIsMultiElement(name) {
  if (hasDirectives.hasOwnProperty(name)) {
    var directives = $injector.get(name + 'Directive');
    return _.some(directives, {multiElement: true});
  }
  return false;
}
```
如果这确实是一个多元素指令应用程序，我们将开始和结束属性名称与指令存储在一起。这样我们就可以在编译过程中使用它们来匹配元素。我们将为开始和结束属性名称引入一个变量，
如果匹配到一个开始属性将更新它，并且将它们传递到`addDirective`:
```js
_.forEach(node.attributes, function(attr) {
    var attrStartName, attrEndName;
    var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
    if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
      normalizedAttrName =
        normalizedAttrName[6].toLowerCase() +
        normalizedAttrName.substring(7);
    }
    var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
    if (directiveIsMultiElement(directiveNName)) {
      if (/Start$/.test(normalizedAttrName)) {
        attrStartName = normalizedAttrName;
        attrEndName =
          normalizedAttrName.substring(0, normalizedAttrName.length - 5) + 'End';
        normalizedAttrName =
          normalizedAttrName.substring(0, normalizedAttrName.length - 5);
      } 
    }
    addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);
});
```
在我们继续前进之前，我们需要解决一个问题。我们现在传递到`addDirective`全部统一，在DOM里面不会再明确的格式化驼峰属性名。稍后再看DOM时，很难与它们进行匹配。

我们需要做的是使用原始的，不统一化的属性名称。什么是Angular这样做独特的地方，但是，如果有一个`ng-attr-`前缀用于开始属性，这是不存储的。因此，基本上是，`ng-attr-`
和`-start`不能同时使用。

我们要做的是，去除`ng-attr-`之后，"非规范化"的属性名称再一次通过hyphenizing，然后使用该存储的开始和结束属性名称：
```js
_.forEach(node.attributes, function(attr) {
  var attrStartName, attrEndName;
  var name = attr.name;
  var normalizedAttrName = directiveNormalize(name.toLowerCase());
  if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
    name = _.kebabCase(
      normalizedAttrName[6].toLowerCase() +
      normalizedAttrName.substring(7)
    );
  }
  var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
  if (directiveIsMultiElement(directiveNName)) {
    if (/Start$/.test(normalizedAttrName)) {
        attrStartName = name;
        attrEndName = name.substring(0, name.length - 5) + 'end';
        name = name.substring(0, name.length - 6);
    } 
  }
  normalizedAttrName = directiveNormalize(name.toLowerCase());
  addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);
});
```
现在我们有了一个可接受的`collectDirectives`实现，我们看一下`addDirective`，现在有两个新可选参数：开始和结束属性和指令一起使用。

我们在这里需要做什么，如果开始和结束属性都给了，使用特殊的`$$start`和`$$end`key添加到指令对象。我们不想使用这些key值污染原始的指令对象，因此我们为了自己的目的创建一个扩展版本。
这是非常重要的，因为一个指令可以被应用多次，有时候使用 start/end 标签分离，有时候没有：
```js
function addDirective(directives, name, mode, attrStartName, attrEndName) {
    if (hasDirectives.hasOwnProperty(name)) {
      var foundDirectives = $injector.get(name + 'Directive');
      var applicableDirectives = _. lter(foundDirectives, function(dir) {
        return dir.restrict.indexOf(mode) !== -1;
      });
      _.forEach(applicableDirectives, function(directive) {
        if (attrStartName) {
          directive = _.create(directive, {
            $$start: attrStartName,
            $$end: attrEndName
          }); 
        }
      directives.push(directive);
    });
  } 
}
```
下一步操作在`applyDirectivesToNode`，这是我们真正调用指令`compile`的方法。在做这个之前，我们需要去看一下这个指令应用有 start/end 标签分离，如果有，将传入`compile`的节点使用开始和结束节点和他们直接的兄弟节点代替。
我们希望设置的元素是有效的使用叫做`groupScan`的函数。
```js
function applyDirectivesToNode(directives, compileNode) {
  var $compileNode = $(compileNode);
  var terminalPriority = -Number.MAX_VALUE;
  var terminal = false;
  _.forEach(directives, function(directive) {
    if (directive.$$start) {
      $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
    }
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
这个新函数有三个参数：一个开始搜索的节点，开始和结束属性名称：
```js
function groupScan(node, startAttr, endAttr) {

}
```
这个函数检测初始化是否有开始属性。如果没有，这个函数结束，只是返回一个包含初始化节点的结果：
```js
function groupScan(node, startAttr, endAttr) {
  var nodes = [];
  if (startAttr && node && node.hasAttribute(startAttr)) {
  
  } else {
    nodes.push(node);
  }
  return $(nodes);
}
```
如果初始化节点有开始属性，这个函数开始收集组。它使用`depth`帮助变量，当 depth 到0的之后终止：
```js
function groupScan(node, startAttr, endAttr) {
  var nodes = [];
  if (startAttr && node && node.hasAttribute(startAttr)) {
    var depth = 0;
    do {
    	
    } while (depth > 0);
  } else {
    nodes.push(node);
  }
  return $(nodes);
}
```
在循环里面，我们遍历节点的兄弟节点，并且将每一个加入到节点数组。他们成为group的成员。
```js
function groupScan(node, startAttr, endAttr) {
  var nodes = [];
  if (startAttr && node && node.hasAttribute(startAttr)) {
    var depth = 0;
    do {
    	nodes.push(node);
        node = node.nextSibling;
    } while (depth > 0);
  } else {
    nodes.push(node);
  }
  return $(nodes);
}
```
这个版本手机所有的兄弟节点，但是我们只需要一个，直到这一个有组的结束属性。这就是`depth`变量的进来的地方。不管我们在哪里看到组的开始属性，我们自增depth，当我们看到组的结束属性时候，我们自减depth。
这意味着，当我们看到结束属性和开始属性一样多的时候，循环中止，工作结束:
```js
function groupScan(node, startAttr, endAttr) {
  var nodes = [];
  if (startAttr && node && node.hasAttribute(startAttr)) {
    var depth = 0;
    do {
    	if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.hasAttribute(startAttr)) {
            depth++;
          } else if (node.hasAttribute(endAttr)) {
            depth--; 
          }
        }
    } while (depth > 0);
  } else {
    nodes.push(node);
  }
  return $(nodes);
}
```
一般的，depth只会到1，但是维持它很重要，这样我们可以支持嵌套组。像下面的DOM结果，当我们收集外部组的时，我们需要收集到第二个`my-dir-end`结束。在这过程中，`depth`到达2：
```angular2html
<div my-dir-start></div>
<div my-dir-start></div>
<div my-dir-end></div>
<div my-dir-end></div>
```
最终我们可以应用多个指令到多个元素上！
