## Relational And Equality Operators
在优先级顺序的算术里，他们由不同的方式去比较东西。对于数字，这里有4个关系操作符：
```js
it('parses relational operators', function() {
  expect(parse('1 < 2')()).toBe(true);
  expect(parse('1 > 2')()).toBe(false);
  expect(parse('1 <= 2')()).toBe(true);
  expect(parse('2 <= 2')()).toBe(true);
  expect(parse('1 >= 2')()).toBe(false);
  expect(parse('2 >= 2')()).toBe(true);
});
```
对于数字也像其他的值一样，这里有想等值和不等值的检测。Angular表达式支持JavaScript宽松和严格的相等校验:
```js
it('parses equality operators', function() {
  expect(parse('42 == 42')()).toBe(true);
  expect(parse('42 == "42"')()).toBe(true);
  expect(parse('42 != 42')()).toBe(false);
  expect(parse('42 === 42')()).toBe(true);
  expect(parse('42 === "42"')()).toBe(false);
  expect(parse('42 !== 42')()).toBe(false);
});
```

在这两种操作符里面，关系优先：
```js
it('parses relationals on a higher precedence than equality', function() {
  expect(parse('2 == "2" > 2 === "2"')()).toBe(false);
});
```
这里的测试用于检查操作符的顺序：
```js
1. 2 == “2” > 2 === “2”
2. 2 == false === “2”
3. false === “2”
4. false
```
代替：
```js
1. 2 == “2” > 2 === “2”
2. true > false
3. 1 > 0
4. true
```
不管是关系和等值运算符都低于 additive 操作符优先级：
```js
it('parses additives on a higher precedence than relationals', function() {
  expect(parse('2 + 3 < 6 - 2')()).toBe(false);
});
```
整理的测试检测应用的顺序是：
```js
1. 2+3<6- 2
2. 5 < 4
3. false
```
而不是：
```js
1. 2+3<6- 2
2. 2 + true - 2
3. 2+1- 2
4. 1
```
将这8种新操作符添加到`OPERATORS`对象：
```js
var OPERATORS = {
  '+': true,
  '-': true,
  '!': true,
  '*': true,
  '/': true,
  '%': true,
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '<': true,
  '>': true,
  '<=': true,
  '>=': true
 };
```
在AST builder中，引入了两个新函数 - 一个用于等值操作符另一个用于关系操作符。我们不能对两个操作符用一个函数，这样会破坏我们的优先级规则。这两个函数的组成很相似：
```js
AST.prototype.equality = function() {
  var left = this.relational();
  var token;
  while ((token = this.expect('==', '!=', '===', '!=='))) {
    left = {
      type: AST.BinaryExpression,
      left: left,
      operator: token.text,
      right: this.relational()
    };
  }
  return left;
};
AST.prototype.relational = function() {
  var left = this.additive();
  var token;
  while ((token = this.expect('<', '>', '<=', '>='))) {
    left = {
      type: AST.BinaryExpression,
      left: left,
      operator: token.text,
      right: this.additive()
    };
  }
  return left;
};
```
Equality现在是优先级最低的在assignment后面，所以赋值应该代理给：
```js
AST.prototype.assignment = function() {
    var left = this.equality();
    if (this.expect('=')) {
    var right = this.equality();
        return {type: AST.AssignmentExpression, left: left, right: right};
    }
    return left;
};
```
我们需要对`Lexer.lex`做出一些改变去支持这些函数。在之前的章节我们引入了条件分支从`OPERATORS`对象里面查找操作符。然而，所有返回的操作符都由单个字符组成。现在我们操作符
有两个字符，像`==`，甚至有的还有3个字符，像`===`。这些在条件分支里面都是需要支持的。它应该首先查看三个字符是否能匹配一个操作符，接下来是是两个字符，最后才是单个字符。
```js
Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = unde ned;
  this.tokens = [];
  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch) ||
         (this.is('.') && this.isNumber(this.peek()))) {
      this.readNumber();
    } else if (this.is('\'"')) {
      this.readString(this.ch);
    } else if (this.is('[],{}:.()=')) {
      this.tokens.push({
        text: this.ch
      });
      this.index++;
    } else if (this.isIdent(this.ch)) {
      this.readIdent();
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else {
        var ch = this.ch;
        var ch2 = this.ch + this.peek();
        var ch3 = this.ch + this.peek() + this.peek(2);
        var op = OPERATORS[ch];
        var op2 = OPERATORS[ch2];
        var op3 = OPERATORS[ch3];
        if (op || op2 || op3) {
          var token = op3 ? ch3 : (op2 ? ch2 : ch);
          this.tokens.push({text: token});
          this.index += token.length;
        } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  }
  return this.tokens;
};
```
这块代码使用`Lexer.peek`的一个修改版本，可以查看不仅仅是下一个字符，可以是当前索引的第n个字符。它需要一个可选参数`n`，默认为`1`:
```js
Lexer.prototype.peek = function(n) {
    n = n || 1;
    return this.index + n < this.text.length ?
      this.text.charAt(this.index + n) :
      false;
    };
```
这些对等值操作符的测试仍然不能通过，即使我们一切都做好了。问题在于在上一章节开始的时候，我们consuming等号字符`=`作为一个文本token,我们需要在赋值里面实现。
现在是什么样子呢？当lexer遇到一个`=`在`==`里面，它立刻返回没有查找整个操作符。

我们首先应该做的是从文本tokens集合里面移除`=`，修改`lex`从：
```js
} else if (this.is('[],{}:.()=')) {
```
到：
```js
} else if (this.is('[],{}:.()')) {
```
然后，我们应该添加单个等号标识给操作符集合：
```js
var OPERATORS = {
  '+': true,
  '-': true,
  '!': true,
  '*': true,
  '/': true,
  '%': true,
  '=': true,
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '<': true,
  '>': true,
  '<=': true,
  '>=': true
};
```
单个等号符号现在作为一个操作符token返回代替文本token。它仍然构建到一个赋值节点，由于所有的tokens种类都有一个文本属性的值是`=`,这是AST builder的有意思的地方。