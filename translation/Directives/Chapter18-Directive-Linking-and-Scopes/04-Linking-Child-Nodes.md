## Linking Child Nodes
到目前为止，我们一直专注于DOM层次结构的单个界别的节点链接。对于正在编译的整个DOM树，包括所有的子代，都应该发生link，所以我们要处理好它。

当你在一个DOM树有多个级别的指令，底层的指令将首先被link：
```js
it('links directive on child elements  rst', function() {
  var givenElements = [];
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: function(scope, element, attrs) {
        givenElements.push(element);
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive><div my-directive></div></div>');
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(2);
    expect(givenElements[0][0]).toBe(el[0].firstChild);
    expect(givenElements[1][0]).toBe(el[0]);
  }); 
});
```
在这个测试里面，我们收集了所有元素连接到`myDirective`实例。我们应用指令到两个元素：一个父亲和一个子。然后我们看到子元素在父元素之前被链接。

在编译中，我们通过在`compileNodes`里面递归调用每个节点的`childNodes`去处理子节点。由于`compileNodes`现在返回一个复合link函数，为了链接子节点，我们需要抓住递归
返回的值。因此，对于每一个节点，我们需要收集潜在的两个link函数：节点link函数和他们子节点的复合link函数。如果存在，我们会对`linkFns`数组添加元素：
```js
function compileNodes($compileNodes) {
  var linkFns = [];
  _.forEach($compileNodes, function(node, idx) {
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
    if (nodeLinkFn || childLinkFn) {
      linkFns.push({
        nodeLinkFn: nodeLinkFn,
        childLinkFn: childLinkFn,
        idx: i 
      });
    } 
  });
  // ...
}
```
现在，在复合link函数，我们调用节点link函数，我们添加一个额外的参数：子link函数。我们期望使用节点link函数来处理子节点的链接。
```js
function compositeLinkFn(scope, linkNodes) {
    _.forEach(linkFns, function(linkFn) {
      linkFn.nodeLinkFn(
        linkFn.childLinkFn,
        scope,
        linkNodes[linkFn.idx]
      );
    }); 
}
```
子link函数实际上是节点link函数的第一个参数，它改变了节点链接函数的规则，并且破坏了我们现有的一些测试用例。我们通过更新`nodeLinkFn`添加一个新参数，并且在
node本身被链接的时候调用它：
```js
function nodeLinkFn(childLinkFn, scope, linkNode) {
    if (childLinkFn) {
      childLinkFn(scope, linkNode.childNodes);
    }
    _.forEach(linkFns, function(linkFn) {
        var $element = $(linkNode);
        linkFn(scope, $element, attrs);
    }); 
}
```
现在我们已经让测试通过了，并且link了子节点。当一个节点被link，它的子节点也会被link。

这种方法的问题是，当一个节点没有应用任何的指令时，它将不会被link，它的子节点也不会被链接即使他们有指令应用。如果我们为此添加一个测试，它将会失败：
```js
it('links children when parent has no directives', function() {
  var givenElements = [];
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: function(scope, element, attrs) {
        givenElements.push(element);
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div><div my-directive></div></div>');
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(1);
    expect(givenElements[0][0]).toBe(el[0].firstChild);
  }); 
})
```
在测试中，我们希望子节点是被link的，但是它没有发生。实际上，这个测试抛出一个错误，因为我们尝试调用了复合link函数中不存在的一个节点link函数。

我们可以通过添加一个节点link函数是否存在的检查。如果有，我们做以前做过的：调用它并期望它连接到子节点。如果没有，我们直接从复合link函数调用子link函数。
```js
function compositeLinkFn(scope, linkNodes) {
  _.forEach(linkFns, function(linkFn) {
    if (linkFn.nodeLinkFn) {
    linkFn.nodeLinkFn(
      linkFn.childLinkFn,
      scope,
      linkNodes[linkFn.idx]
    );
    } else {
      linkFn.childLinkFn(
    scope,
        linkNodes[linkFn.idx].childNodes
      );
    }
  });
}
```
记得`childLinkFn`是子节点的复合link函数，因此需要两个参数：scope和需要link的节点。
