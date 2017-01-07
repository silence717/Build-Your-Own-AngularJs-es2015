## 解析整数
可以解析的最简单的一个文字值是一个简单的整数，就像42。它的简单性为我们实现解析器有一个好的起点（为了准确，后期全部使用token不再翻译,个人理解它的意思为标识）。

我们添加第一个测试用例表达我们想要的。创建`test/parse_spec.js`文件，并且像下面一样设置它的内容：
```js
var parse = require('../src/parse');
describe('parse', function() {
  it('can parse an integer', () => {
    var fn = parse('42');
    expect(fn).toBeDe ned();
    expect(fn()).toBe(42);
  });
});
```
在前面，我们将文件设置为严格模式，并且将`parse.js`require进来。在测试用例本身，我们定义了解析规则：需要一个string并且返回一个函数。
函数求值为原始字符串的解析值。

为了实现这一点，我们先考虑Lexer的输出。我们之前讨论输出一个token的集合，但实际上token是什么样呢？

为了我们的目的，标识是给AST Builder提供构建抽象语法树所需要所有信息的一个对象。在这一点上，我们只需要两个对象对我们的数字值，这是：

* 从该标识解析解析的文本
* 标识的数字值

对于数字42，我们的token是像下面一样简单：
```js
{
    text: '42',
    value: 42
}
```
所以，让我们在Lexer中实现数字解析，获得像上面的的数据结构。

Lexer的函数基本形式上是一个大循环，遍历给定输入字符串的每一个字符。在迭代期间，它形成字符串包括的token集合：
```js
this.text = text;
this.index = 0;
this.ch = unde ned;
this.tokens = [];
while (this.index < this.text.length) {
  this.ch = this.text.charAt(this.index);
}
return this.tokens;
```
这个函数大纲没有什么（除了无限循环），但是它设置了我们在迭代过程中需要的字段：
* `text` - 原始字符串
* `index` - 字符串当中的当前字符位置
* `ch` - 当前字符
* `tokens` - 标识结果集合

我们在`while`循环中添加对不同字符的操作。我们下面对数字做一下处理：
```js
Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = unde ned;
  this.tokens = [];
  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
if (this.isNumber(this.ch)) {
  this.readNumber();
} else {
  throw 'Unexpected next character: ' + this.ch;
}
}
  return this.tokens;
};
```
如果当前字符是数字，我们委托`readNumber`帮助方法去读取它。如果不是数字，这是我们当前无法处理的，所以我们抛出一个异常。

`isNumber`检查非常简单：
```js
Lexer.prototype.isNumber = function(ch) {
  return '0' <= ch && ch <= '9';
};
```
我们使用数字`<=`操作符来检查字符值是否在'0'到'9'之间。JavaScript在这里使用字符比较，而不是数字比较，但是在单数字的情况下效果是一样的。

`readNumber`方法是比较复杂的，有一个类似于`lex`的结构：它循环遍历文本字符，构造数字如下：
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isNumber(ch)) {
          number += ch;
    } else {
        break;
    }
    this.index++;
  }
};
```
`while`循环读取当前字符。然后，如果当前字符是数字，那么使用本地变量`number`将其拼接起来，当前位置增加。如果当前字符不是一个数字，跳出当前循环。

这样得出一个`number`的字符串，但是对我们好像没什么用。我们需要token：
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isNumber(ch)) {
      number += ch;
    } else {
        break;
    }
    this.index++;
  }
  this.tokens.push({
    text: number,
    value: Number(number)
  });
};
```
这里我们只添加了一个新的token给`this.tokens`集合。这个token的`text`属性就是我们之前读取的字符串，`value`属性我们使用`Number constructor`从字符转换而来的数字。

`lexer`正在做对于整数的解析。接下来，我们看一下`AST Builder`。

如前面讨论的，AST是一个以树状形式表示表达式的嵌套JavaScript对象结构。书中的每个节点有一个`type`的属性去描述句法结构和的类型属性。除了类型之外，
节点还将具有特定类型的属性，用于保存有关该节点的更多信息。

例如，我们的数字文字为`AST.Literal`的一种类型，和一个`value`属性保存文字的值：
```js
{type: AST.Literal, value: 42}
```
每个`AST`都有一个`AST.Program`类型的根节点。该根节点具有一个叫做`body`的属性保存表达式的内容。因此，我们的数字文字实际上是包含在` AST.Program`中：
```js
{
  type: AST.Program,
  body: {
    type: AST.Literal,
    value: 42
  }
}
```
这是我们现在应该从 Lexer 输出的 AST 形式。

顶层程序节点是由AST builder叫做 `program` 的方法创建的。它成为整个AST构建过程的返回值：
```js
AST.prototype.ast = function(text) {
  this.tokens = this.lexer.lex(text);
    return this.program();
};
AST.prototype.program = function() {
  return {type: AST.Program};
};
```

类型的值`AST.Program`是在`AST`函数上定义的"标记常量"。它用于标识正在表示的节点类型。它的值是一个简单的字符串:
```js
function AST(lexer) {
  this.lexer = lexer;
}
AST.Program = 'Program';
```

我们将为所有AST节点类型引入类似的标记常量，并在 AST 编译器中使用它们来决定生成什么样的JavaScript代码。

程序应该有一个body，在这个用例中只能是一个数字文字值。它的类型是`AST.Literal`，它是由AST builder的常量方法生成的：
```js
AST.prototype.program = function() {
return {type: AST.Program, body: this.constant()};
};
AST.prototype.constant = function() {
  return {type: AST.Literal, value: this.tokens[0].value};
};
```

现在我们只需要关注第一个token,并取它的属性`value`的值。

我们需要为这个节点的类型创建一个常量：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
```

这给了我们需要数字文字的AST,接下来我们需要关注`AST Compiler`及其它从AST生成JavaScript函数的任务。

AST Compiler 将做什么，是在AST Builder生成的树上，构建表示树中节点的源代码。然后它将为源代码生成JavaScript函数。对于数字值，该函数非常简单：
```js
function() {
    return 42;
}
```

在编译器的主要编译函数中，我们将介绍一个`state`属性，我们将在(遍历)walking树时收集信息。现在我们只收集一个东西，它是形成函数体的JavaScripe代码：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
};
```

一旦我们初始化了state,我们将开始遍历树，我们在一个叫`recurse`的方法：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);
};
ASTCompiler.prototype.recurse = function(ast) {

};
```
目的是一旦`recurse`返回，`state.body `将保存可以从中创建一个函数的JavaScript语句。该函数将成为我们的返回值：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);
  /* jshint -W054 */
  return new Function(this.state.body.join(''));
  /* jshint +W054 */
};
```
我们使用`Function`构造函数来创建函数。这个构造函数需要一些JavaScript源码并且将其编译成一个函数。

最后一点困惑的是弄清楚在`recurse`中做什么。期望是生成一些JavaScript源码并将其放入`this.state.body`。

顾名思义，`recurse`是一个递归方法，我们将调用树中的每个节点。由于每个节点都有一个`type`，并且不同类型的节点需要不同类型的处理，我们将引入`switch`语句，
其中包含不同AST节点类型的背影分支：
```js
ASTCompiler.prototype.recurse = function(ast) {
    switch (ast.type) {
        case AST.Program:
        case AST.Literal:
    }
};
```

literal是一个"子节点"，这意味着它没有子节点 - 只有一个值。我们可以做的是简单地返回节点的值：
```js
case AST.Literal:
    return ast.value
```

对于`Program`我们需要做的更多一点。我们需要为整个表达式生成`return`语句。我们应该返回的`Program`的`body`，我们将通过递归调用`recurse`:
```js
case AST.Program:
    this.state.body.push('return ', this.recurse(ast.body), ';');
    break;
```

在我们的第一个测试用例中，返回值为42,函数体的结果是返回42。

到此我们的测试用例就通过了。我们通过字符串表达式`42`生成了一个表达式方法。

这里做了很多工作，这可能看起来不必要的复杂，但是不同的部分作用变得更加明显，因为我们添加了更多的方法到我们的表达式实现。