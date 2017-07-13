## Keeping The Node List Stable for Linking
正如我们已经接触到的，我们设置复合link函数的方式需要一个compile节点和link节点一一对应的关系，当底层DOM变化的时候它不是很健壮。
由于DOM操作经常在指令里面使用，这可能是个问题。例如，如果我们有一个指令在linking过程中插入新的兄弟节点到链接到的元素：
```js
it('stabilizes node list during linking', function() {
  var givenElements = [];
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      link: function(scope, element, attrs) {
        givenElements.push(element[0]);
        element.after('<div></div>');
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div><div my-directive></div><div my-directive></div></div>');
    var el1 = el[0].childNodes[0], el2 = el[0].childNodes[1];
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(2);
    expect(givenElements[0]).toBe(el1);
    expect(givenElements[1]).toBe(el2);
  }); 
});
```
在这个测试中，我们有一个指令在linking的过程中在当前元素后面插入一个新元素。我们应用这个元素到两个子元素，期望他们都被linked。取而代之
的是插入的元素中的一个被link，对于指令的第二个应用，用于编译的元素和用于linking的元素不同。这绝对不是我们想要的。

在开始运行节点link函数之前，我们可以通过复制自己节点的集合来解决这个问题。与原始DOM集合不同，此集合将受到linking过程中移动元素的保护。
我们可以通过在`linkFns`数组迭代所有的索引来创建集合：
```js
function compositeLinkFn(scope, linkNodes) {
    var stableNodeList = [];
    _.forEach(linkFns, function(linkFn) {
      var nodeIdx = linkFn.idx;
      stableNodeList[nodeIdx] = linkNodes[nodeIdx];
    });
    _.forEach(linkFns, function(linkFn) {
      if (linkFn.nodeLinkFn) {
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
}
```