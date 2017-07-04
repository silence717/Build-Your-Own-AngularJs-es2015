## Providing Class Directives As Attributes
我们现在已经覆盖了Angular如何使一个元素的属性有效通过`Attributes`对象。然而，这不是`Attributes`对象拥有的唯一内容。这里有一些类和注释相关的特殊情况，这些导致属性被填充。

首先，当有一个class指令，该指令名称将出现在属性中：
```js
it('adds an attribute from a class directive', function() {
  registerAndCompile(
    'myDirective',
    '<div class="my-directive"></div>',
    function(element, attrs) {
      expect(attrs.hasOwnProperty('myDirective')).toBe(true);
    }
  ); 
});
```
在`collectDirectives`中我们将指令名字放到属性中：
```js
_.forEach(node.classList, function(cls) {
  var normalizedClassName = directiveNormalize(cls);
  addDirective(directives, normalizedClassName, 'C');
  attrs[normalizedClassName] = undefined;
});
```
这个属性的值是`undefined`但是它仍然出现在属性对象，因此`hasOwnProperty`检查返回`true`。

然而，不能总是将class放到属性中。它只发生在实际匹配指令的类中，但是我们当前的实现添加了所有类：
```js
it('does not add attribute from class without a directive', function() {
  registerAndCompile(
    'myDirective',
    '<my-directive class="some-class"></my-directive>',
    function(element, attrs) {
      expect(attrs.hasOwnProperty('someClass')).toBe(false);
    }
  ); 
});
```
当我们为class添加属性时，我们首先需要检查一个指令是否与它匹配。我们期望`addDirective`函数返回关于这个的信息：
```js
_.forEach(node.classList, function(cls) {
  var normalizedClassName = directiveNormalize(cls);
  if (addDirective(directives, normalizedClassName, 'C')) {
    attrs[normalizedClassName] = undefined;
  }
});
```
因此在`addDirective`我们需要返回一个值，告诉调用者这个指令是否已经添加：
```js
function addDirective(directives, name, mode, attrStartName, attrEndName) {
  var match;
  if (hasDirectives.hasOwnProperty(name)) {
    var foundDirectives = $injector.get(name + 'Directive');
    var applicableDirectives = _. lter(foundDirectives, function(dir) {
      return dir.restrict.indexOf(mode) !== -1;
    });
    _.forEach(applicableDirectives, function(directive) {
      if (attrStartName) {
        directive = _.create(directive, {$$start: attrStartName, $$end: attrEndName});
      }
      directives.push(directive);
      match = directive;
    }); 
  }
  return match;
}
```
函数的返回值是`undefined`或者其中一个指令的定义对象，虽然在这个用例中我们只检查值是否为真。

因此class属性的值默认是`undefined`，但不一定必须是。你也可以通过在class名称后面添加冒号来为属性提供一个值。这个值可能也有空格：
```js
it('supports values for class directive attributes', function() {
  registerAndCompile(
    'myDirective',
    '<div class="my-directive: my attribute value"></div>',
    function(element, attrs) {
      expect(attrs.myDirective).toEqual('my attribute value');
    }
  ); 
});
```
默认情况下，属性值将消耗class属性的剩余部分，但也可以使用分号终止。在分号之后，你可以添加其他css类，这些类可能与指令相关，也可能与指令无关：
```js
it('terminates class directive attribute value at semicolon', function() {
  registerAndCompile(
    'myDirective',
    '<div class="my-directive: my attribute value; some-other-class"></div>',
    function(element, attrs) {
      expect(attrs.myDirective).toEqual('my attribute value');
    }
  ); 
});
```
我们现在已经有了元素的CSS`class`属性，而不是直接消耗`classList`数组，这就是我们在上一章使用的。我们需要切换到正则表达式去陪陪`className`字符串为了支持属性值语法。

首先，让我们重构一下`collectDirectives`为设置做点准备。我们需要一个本地变量去保持正则表达式匹配。为此我们使用一个叫做`match`的变量。这样的变量已经在注释程序里面使用，
所以我们将变量声明拉到函数的顶层。然后我们使用一个占位符替换`classList`循环，我们去做class解析 - 如果一个元素有非空的`className`属性我们只能这么做：
```js
function collectDirectives(node, attrs) {
    var directives = [];
    var match;
    if (node.nodeType === Node.ELEMENT_NODE) {
      var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
      addDirective(directives, normalizedNodeName, 'E');
      _.forEach(node.attributes, function(attr) {
        var attrStartName, attrEndName;
        var name = attr.name;
        var normalizedAttrName = directiveNormalize(name.toLowerCase());
        var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
        if (isNgAttr) {
          name = _.kebabCase(
            normalizedAttrName[6].toLowerCase() + 
            normalizedAttrName.substring(7)
        );
        normalizedAttrName = directiveNormalize(name.toLowerCase());
      }
      attrs.$attr[normalizedAttrName] = name;
      var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
      if (directiveIsMultiElement(directiveNName)) {
        if (/Start$/.test(normalizedAttrName)) {
          attrStartName = name;
          attrEndName = name.substring(0, name.length - 5) + 'end';
          name = name.substring(0, name.length - 6);
        } 
      }
      normalizedAttrName = directiveNormalize(name.toLowerCase());
      addDirective(
        directives, normalizedAttrName, 'A', attrStartName, attrEndName);
      if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
        attrs[normalizedAttrName] = attr.value.trim();
        if (isBooleanAttribute(node, normalizedAttrName)) {
          attrs[normalizedAttrName] = true;
        }
    } });
    var className = node.className;
    if (_.isString(className) && !_.isEmpty(className)) {
    	
    }
  } else if (node.nodeType === Node.COMMENT_NODE) {
      match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
      if (match) {
        addDirective(directives, directiveNormalize(match[1]), 'M');
      }
  }
  directives.sort(byPriority);
  return directives;
}
```
你可能已经猜到，就像在`$injector`中函数参数的解析一样，这是一个调用一些非常相关的正则表达式工作的任务。我们需要制定一个正则表达式：
* 匹配class名称 - 多个之间是有空格分离
* 如果每个class名称后面都有一个冒号，可以为每个匹配一个值。这个值可能包含空格
* 以分号结束，并且去匹配下一个class名称。

事不宜迟，这里是我们将要使用的正则：
```
/([\d\w\-_]+)(?:\:([^;]+))?;?/
```
* `([\d\w\-_]+)`匹配一个或多个数字， 汉字，字符，或者下划线将他们捕捉到一个组。这与Class名匹配。
* `(?:`开始非捕货组为属性的值。在表达式的结尾`)?`结束非捕获组，并且标记为可选，`:?`在末尾添加一个可选的分号。
* 在非捕货组，`\:`匹配冒号字符，`([^;]+)`匹配分号以外的一个或多个字符，并在另一组中捕获它们。这是属性的值。

如果我们在class名称的循环中使用这个正则表达式，我们可以使用类名，每次迭代只使用一个class名称或者Class名称后面跟着的值：
```js
className = node.className;
if (_.isString(className) && !_.isEmpty(className)) {
    while ((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
      className = className.substr(match.index + match[0].length);
    }
}
```
为了不创建一个无限循环，在每次迭代中我们需要使用剩余的任何匹配的去替换`className`。我们通过以`className`的子类名，它匹配结束开始。

为了把东西连起来，我们现在可以找到指令，以及属性和循环里面的值：
```js
className = node.className;
if (isString(className) && className !== '') {
  while ((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
      var normalizedClassName = directiveNormalize(match[1]);
      if (addDirective(directives, normalizedClassName, 'C')) {
          attrs[normalizedClassName] = match[2] ? match[2].trim() : unde ned;
      }
      className = className.substr(match.index + match[0].length);
  }
}
```
指令名将在匹配数组的第二项中（因为它与第一个捕获组匹配）。属性值，如果有的，将在第三项中。

有了这个，我们新的和旧的class指令测试用例都会通过。