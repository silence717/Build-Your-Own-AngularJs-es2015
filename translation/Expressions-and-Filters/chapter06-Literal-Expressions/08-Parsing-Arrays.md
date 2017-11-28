## 解析数组
数字、字符串、布尔值和`null`值所有所谓的标量常量表达式。它们是简单的单一值，每个值只包含一个token。
现在我们将注意力转到多token表达式。首先是数组。

最简单的数组就是一个空数组。它由一个开方括号和闭方括号组成：
```js
it('will parse an empty array', function() {
  var fn = parse('[]');
  expect(fn()).toEqual([]);
});
```
虽然这可能是简单的，这是我们看到的第一个多token的表达式。Lexer将为这个表达式传递两个token,每个中括号都是一个token。
我们将从`lex`的函数里面直接得到tokens。
```js
Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = unde ned;
  this.tokens = [];
  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch) ||
          (this.ch === '.' && this.isNumber(this.peek()))) {
      this.readNumber();
    } else if (this.ch === '\'' || this.ch === '"') {
      this.readString(this.ch);
    } else if (this.ch === '[' || this.ch === ']') {
      this.tokens.push({
        text: this.ch
      });
      this.index++;
    } else if (this.isIdent(this.ch)) {
      this.readIdent();
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  return this.tokens;
};
```
在AST builder中，我们必须考虑下面的情况，lexer输出不止是一个token。我们现在有两个tokens - `[`和`]`会引起AST中的
一系列节点。

数组是基本表达式，像常量一样，所以在`AST.primary`对数组进行处理。一个基本表达式可能由 [ 开始，这种用例我们可以按照数组
声明去处理：
```js
AST.prototype.primary = function() {
   if (this.expect('[')) {
    return this.arrayDeclaration();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    return this.constants[this.tokens[0].text];
  } else {
    return this.constant();
  }
};
```
这里的`expect`函数我们还没有东西。实际上它与我们正在使用的多个tokens有关。`expect`检测如果下一个token是我们期望的，
并且返回它。它也会从`this.tokens`中移除这个token,让我们进入到下一个token:
```js
AST.prototype.expect = function(e) {
  if (this.tokens.length > 0) {
    if (this.tokens[0].text === e || !e) {
      return this.tokens.shift();
    }
  }
};
```
注意到`expect`也可以不需要参数，这种情况下直接处理下一个token。

`arrayDeclaration`函数也许全新的。这是我们需要一个token去关联数组并且构建AST节点。当我们进入函数,开始中括号已经被
移除。由于我们目前只关心空数组，剩下的就是关闭的中括号：
```js
AST.prototype.arrayDeclaration = function() {
  this.consume(']');
};
```
`consume`函数在这里基本和`expect`相同，但是主要不同的一点是：如果没有找到匹配的token会抛出异常。闭合方括号在数组中
是必选的，所以我们必须对它严格判断：
```js
AST.prototype.consume = function(e) {
  var token = this.expect(e);
  if (!token) {
    throw 'Unexpected. Expecting: ' + e;
  }
  return token;
};
```
如果没有抛出异常，我们将有一个合法的空数组，我们可以转为相应的AST节点。它有自己的类型`ArrayExpression`:
```js
AST.prototype.arrayDeclaration = function() {
  this.consume(']');
    return {type: AST.ArrayExpression};
};
```
我们需要引入一下这个类型：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
```
这是一个需要AST compile处理的新类型。现在我们可以传递一个`[]`使我们的测试通过：
```js
ASTCompiler.prototype.recurse = function(ast) {
  switch (ast.type) {
  case AST.Program:
    this.state.body.push('return ', this.recurse(ast.body), ';');
    break;
  case AST.Literal:
    return this.escape(ast.value);
  case AST.ArrayExpression:
    return '[]';
  }
};
```
那么是怎样的一个基础，产生空数组的：Lexer传递一个开始和闭合的方括号作为token,`AST.primary`注意到开始方括号委托给` AST.ar- rayDeclaration`, 
移除闭合方括号并且传递一个`ArrayExpression`AST节点。`AST compile`返回一个JavaScript空数组表达式。

接下来，我们考虑一下非空数组。在数组常量元素在，他们使用逗号分隔。元素可以是任何类型，也可以包含数组：
```js
it('will parse a non-empty array', function() {
  var fn = parse('[1, "two", [3], true]');
  expect(fn()).toEqual([1, 'two', [3], true]);
});
```
逗号的值也需要从lex传递。就像方括号一样，作为一个纯文本tokem:
```js
Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = unde ned;
  this.tokens = [];
  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch) ||
         (this.ch === '.' && this.isNumber(this.peek()))) {
      this.readNumber();
    } else if (this.ch === '\'' || this.ch === '"') {
      this.readString(this.ch);
    } else if (this.ch === '[' || this.ch === ']' || this.ch === ',') {
        this.tokens.push({
            text: this.ch
        });
      this.index++;
    } else if (this.isIdent(this.ch)) {
      this.readIdent();
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else {
      throw 'Unexpected next character: ' + this.ch;
    }
  }
  return this.tokens;
};

```
元素解析发生在 AST `arrayDeclaration`。它可以检测数组立即关闭而判断为空数组与否。如果不是，我们需要对元素进行处理。单个元素都被存储到一个叫做`elements`的本地数组里面：
```js
AST.prototype.arrayDeclaration = function() {
    var elements = [];
    if (!this.peek(']')) {

    }
    this.consume(']');
    return {type: AST.ArrayExpression};
};
```
上面定义的`peek`函数的作用就是收集元素。它和`expect`有点相似，但是不移除token像下面这样：
```js
AST.prototype.peek = function(e) {
  if (this.tokens.length > 0) {
    var text = this.tokens[0].text;
    if (text === e || !e) {
      return this.tokens[0];
    }
  }
};
```
现在我们需要重新定义一下`expect`函数在`peek`中，我们不需要重复他们相同的逻辑。如果在`peek`中匹配一个token，`expect`移除它即可：
```js
AST.prototype.expect = function(e) {
    var token = this.peek(e);
    if (token) {
        return this.tokens.shift();
    }
};
```
如果在数组中有元素，我们将在循环中处理他们。循环将在最后一个元素后面没有逗号出现而终止。每个元素将会作为另一个主要节点递归处理：
```js
AST.prototype.arrayDeclaration = function() {
  var elements = [];
  if (!this.peek(']')) {
    do {
      elements.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(']');
  return {type: AST.ArrayExpression};
};
```
在这些工作之前，我们必须改变我们早期在AST中实现的`primary`和`constant`方法。他们不再是一个token，并且他们需要移除当前的token以便于进行到下一个。

在`primary`我们应该移除常量值的token:
```js
AST.prototype.primary = function() {
  if (this.expect('[')) {
    return this.arrayDeclaration();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    return this.constants[this.consume().text];
  } else {
    return this.constant();
  }
};
```
在`constant`中应该做相同的事情：
```js
AST.prototype.constant = function() {
    return {type: AST.Literal, value: this.consume().value};
};
```
最后一件事情就是AST builder应该绑定这些集合元素到`ArrayExpression`节点便于我们在compiler进入他们：
```js
AST.prototype.arrayDeclaration = function() {
  var elements = [];
  if (!this.peek(']')) {
    do {
      elements.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(']');
  return {type: AST.ArrayExpression, elements: elements};
};
```
进去编译器之后，我们需要做的是递归数组里面的每个元素，集合起来，并输出JavaScript表达式：
```js
case AST.ArrayExpression:
    var elements = _.map(ast.elements, _.bind(function(element) {
      return this.recurse(element);
    }, this));
    return '[]';
```
我们可以把他们作为JavaScript表达式的内容输出：
```js
case AST.ArrayExpression:
  var elements = _.map(ast.elements, _.bind(function(element) {
    return this.recurse(element);
  }, this));
  return '[' + elements.join(',') + ']';
```
Angular表达式中的数组也允许尾随的一个逗号，允许一个逗号后再没有更多的元素在数组中。这是和标准的JavaScript实现一致：
```js
it('will parse an array with trailing commas', function() {
  var fn = parse('[1, 2, 3, ]');
  expect(fn()).toEqual([1, 2, 3]);
});
```
为了支持尾随逗号，我们需要对AST builder中的`do..while`循环做一下微调，为后面没有元素表达式处理而做准备。如果看到闭合方括号，可以提前退出：
```js
AST.prototype.arrayDeclaration = function() {
  var elements = [];
  if (!this.peek(']')) {
    do {
        if (this.peek(']')) {
        break;
        }
        elements.push(this.primary());
        } while (this.expect(','));
      }
  this.consume(']');
  return {type: AST.ArrayExpression, elements: elements};
};
```