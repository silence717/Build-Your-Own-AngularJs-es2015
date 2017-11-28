## 准备
Angular 表达式解析的代码将放在`src/parse.js`的新文件中，该文件根据`$parse`提供的服务命名。  

在该文件中，将对外提供一个叫做`parse`的方法。它接收一个Angular表达式字符串，并且返回一个在函数在确定的上下文中执行：
```js
'use strict';
function parse(expr) {
// return ...
}
module.exports = parse;
```
我们晚点将此方法改为`$parse`服务，一旦我们有了依赖注入并运行。  

这个文件将包含四个对象，它将字符串表达式转为方法：Lexer, AST Builder, AST Compiler, Parser。他们在不同的阶段有不同的职责：  

Lexer 获取最原始的字符串表达式，并返回该字符串解析的词法单元（token）流。例如，字符串"`a+b`"将会返回标记`a`,`+`，和 `b`。

AST Builder 接收词法分析器生成的词法单元流，并从中构建`Abstract Syntax Tree (AST)`(抽象语法树)。这个树表示表达式作为嵌套JavaScript
对象的句法结构。例如，标记`a`,`+`，和 `b`会生成下面的结构：
```js
{
  type: AST.BinaryExpression,
  operator: '+',
  left: {
    type: AST.Identifier,
    name: 'a'
    },
    right: {
        type: AST.Identifier,
        name: 'b'
    }
}
```

AST Compiler 采用抽象语法树，计算树中的表达式并将其编译为JavaScript函数。例如，上面的AST将会转为下面这样：
```js
function(scope) {
  return scope.a + scope.b;
}
```

Parser 负责组合上述的几个步骤。它本身不会做太多事情，而是将重任委托到 Lexer、AST Builder 和 AST Compiler。

这就意味着，无论什么时候使用Angular中的表达式，JavaScript函数都会在幕后生成。这些函数在 digest 循环期间不断地计算表达式的值。

我们为每一个对象创建一个脚手架。首先，`Lexer`被定义为一个构造函数。它包含一个lex方法，执行标记化：
```js
function Lexer() {
}
Lexer.prototype.lex = function(text) {
  // Tokenization will be done here
};
```

`AST Builder`(在代码中由AST表示)是另一个构造函数。它需要一个 Lexer 作为参数。它还有一个`ast`方法，它将执行给定表达式标记的构建：
```js
function AST(lexer) {
  this.lexer = lexer;
}
AST.prototype.ast = function(text) {
  this.tokens = this.lexer.lex(text);
  // AST building will be done here
};
```

`AST Compiler`也是另一个构造函数，它需要一个AST Builder作为参数。它含有一个叫`compile`的方法，它将表达式编译为一个表达式函数:
```js
function ASTCompiler(astBuilder) {
  this.astBuilder = astBuilder;
}
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  // AST compilation will be done here
};
```

最后，`Parse`是一个从上面概述的部分构造完整的解析管道的构造函数。它需要一个Lexer作为参数，并且有一个叫做`parse`的方法：
```js
function Parser(lexer) {
  this.lexer = lexer;
  this.ast = new AST(this.lexer);
  this.astCompiler = new ASTCompiler(this.ast);
}
Parser.prototype.parse = function(text) {
  return this.astCompiler.compile(text);
};
```

现在我们可以扩充一下公共的`parse`函数，我们创建一个Lexer,Parser，然后调用Parser.parse：
```js
function parse(expr) {
  var lexer = new Lexer();
  var parser = new Parser(lexer);
  return parser.parse(expr);
}
```
这是`parse.js`的高级结构。在剩下来的章节里面，我们将填充这些可以发生奇妙作用的方法。


#### 名词解释
token - 词法单元
tokenizing - 分词
Abstract Syntax Tree - 抽象语法法树，简称为AST
Lexing - 词法分析

后面对这些不做翻译，为了更加准确。