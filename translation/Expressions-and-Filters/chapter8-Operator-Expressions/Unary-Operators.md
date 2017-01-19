## 一元操作符
我们将从具有最高优先级的操作符开始，以降低优先级顺序工作。在最上面的基本表达式，我们已经实现：不论是调用一个函数或者computed或者non-computed属性访问，
在做这些之前都是计算。在基本表达式的后面都是一元表达式。

一元操作符就是有一个运算元的操作符：
* 一元`-`就是对操作数取反，就像`-42`或者`-a`。
* 一元`+`并没有做什么，它被用于明确和强调，就像`+42`或者`+a`。
* 非运算符`!`对其操作数布尔值取反，就像`!true`或者`!a`。

我们以一元操作符`+`开始因为它非常简单。实际上，它会返回它的操作数：
```js
it('parses a unary +', function() {
  expect(parse('+42')()).toBe(42);
  expect(parse('+a')({a: 42})).toBe(42);
});
```
在AST builder我们引入一个新方法`unary`去处理一元操作符，并且在else中返回`primary`:
```js
AST.prototype.unary = function() {
  if (this.expect('+')) {
  } else {
    return this.primary();
  }
};
```
`unary`实际上是构建一个`UnaryExpression` token，它唯一的参数就是一个基本表达式:
```js
AST.prototype.unary = function() {
  if (this.expect('+')) {
    return {
      type: AST.UnaryExpression,
      operator: '+',
      argument: this.primary()
    };
  } else {
    return this.primary();
  }
};
```
`UnaryExpression`是一个新的AST节点类型:
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identi er = 'Identi er';
AST.ThisExpression = 'ThisExpression';
AST.LocalsExpression = 'LocalsExpression';
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';
AST.AssignmentExpression = 'AssignmentExpression';
AST.UnaryExpression = 'UnaryExpression';
```
为了使一元表达式被解析，我们需要调用`unary`从某个地方。从`assignment`开始，我们在之前叫做`primary`。赋值表达式的左边和右边在基本表达式里面可能不需要，
但是可能需要一元表达式:
```js
AST.prototype.assignment = function() {
    var left = this.unary();
    if (this.expect('=')) {
        var right = this.unary();
        return {type: AST.AssignmentExpression, left: left, right: right};
    }
    return left;
};
```
因为`unary`返回`primary`，`assigment`现在支持左边或者右边的任何一个。

在这一点上，我们应该重访Lexer。我们的AST builder准备好处理一元运算符`+`,但是Lexer现在还没有返回它。

在前面的章节里面，我们处理了一些场景都是从Lexer返回的一些常量tokens，就想我们做的`[`，`]`和`.`。对于操作符我们需要做一些不同的：我们将引入一个常量对象叫做
`OPERATORS`，它将包括我们考虑到的操作符的tokens。
```js
var OPERATORS = {
'+': true 
};
```
在这个对象里面所有的值都为`true`。我们只是使用一个对象去代替数组，因为对象允许我们检测一个key值是否存在更高效，在不变的时候。

The Lexer still needs to emit the +. We need a final else branch in the lex method,
that attempts to look up an operator for the current character from the OPERATORS object:
在Lexer仍然需要返回`+`。们在`lex`方法里面需要最终的一个`else`分支，它试着从`OPERATORS`对象里面为当前的字符查找一个操作符：
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
        var op = OPERATORS[this.ch];
        if (op) {
          this.tokens.push({text: this.ch});
          this.index++;
        } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  }
  return this.tokens;
};
```
总的来说，`lex`现在尝试着与所有东西去匹配字符，如果所有的都失败了，可以看到`OPERATORS`存储了。

在AST compiler里面剩下的疑问就是,我们需要学习如何编译一元表达式。我们所能做的就是返回一个JavaScript片段组成操作符表达式，就下来就是参数的递归值。
```js
case AST.UnaryExpression:
  return ast.operator + '(' + this.recurse(ast.argument) + ')';
```
在Angular表达式和JavaScript一元算数运算符是不同的，Angular将undefined的值当作0，JavaScript中却认为是`NaN`:
```js
it('replaces undefined with zero for unary +', function() {
  expect(parse('+a')({})).toBe(0);
});
```

我们为了保护一元表达式操作数，我们调用一个新方法`ifDefined`，它需要两个参数：一个表达式和一个值用于如果表达式是undefined，那么在这个用例中值为0.
```js
case AST.UnaryExpression:
  return ast.operator +
    '(' + this.ifDe ned(this.recurse(ast.argument), 0) + ')';
```
调用`ifDefined`方法运行时候生成一个与`ifDefined`有着相同参数的JavaScript函数：
```js
ASTCompiler.prototype.ifDefined = function(value, defaultValue) {
  return 'ifDe ned(' + value + ',' + this.escape(defaultValue) + ')';
};
```
这个函数传入生成的JavaScript函数：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  var fnString = 'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      )+ this.state.body.join('') + '}; return fn;';
  /* jshint -W054 */
  return new Function(
    'ensureSafeMemberName',
    'ensureSafeObject',
    'ensureSafeFunction',
    'ifDefined',
    fnString)(
      ensureSafeMemberName,
      ensureSafeObject,
      ensureSafeFunction,
    ifDefined);
 /* jshint +W054 */
};
```
最终，`ifDefined`真正的实现是如果它定义了就返回它自己，没有的话就返回默认值：
```js
function ifDefined(value, defaultValue) {
    return typeof value === 'undefined' ? defaultValue : value;
}
```
我们现在对`+`已经处理完整了，让我们转到下一个一元运算符，这是一个很有意思的事情因为它做的事情：
```js
it('parses a unary !', function() {
  expect(parse('!true')()).toBe(false);
  expect(parse('!42')()).toBe(false);
  expect(parse('!a')({a: false})).toBe(true);
  expect(parse('!!a')({a: false})).toBe(false);
});
```
取反操作符和JavaScript里面的有着相同的含义。测试的最后一个期望它可以展示一下如何连续使用多个。

我们将这个操作符添加到`OPERATORS`对象：
```js
var OPERATORS = {
  '+': true,
  '!': true
};
```
在AST builder的`unary`中，我们现在期望的是`+`或者`!`。我们就不能在AST节点的操作符中把`+`写死(hardcode)，但是必须使用我们实际的去代替：
```js
AST.prototype.unary = function() {
  var token;
  if ((token = this.expect('+', '!'))) {
    return {
      type: AST.UnaryExpression,
      operator: token.text,
      argument: this.primary()
    };
  } else {
    return this.primary();
  }
};
```
我们已经解决了部分测试用例，为了使它工作我们不需要在AST compiler里面做任何改变。测试现在仍然是失败的，因为我们在一行中应用`!`多次。
要修复它非常容易我们将另一个一元表达式作为`unary`的参数：
```js
AST.prototype.unary = function() {
  var token;
  if ((token = this.expect('+', '!'))) {
    return {
      type: AST.UnaryExpression,
      operator: token.text,
      argument: this.unary()
    };
  } else {
    return this.primary();
  }
};
```