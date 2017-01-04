## 准备
Angular 表达式解析的代码将放在`src/parse.js`的新文件中，该文件根据`$parse`提供的服务命名。  

在该文件中，将对外提供一个叫做`parse`的方法。它接收一个Angular表达式字符串，并且返回一个在函数在确定的上下问中执行：
```js
// src/parse.js
'use strict';
function parse(expr) {
// return ...
}
module.exports = parse;
```
我们晚点将此方法改为`$parse`服务，一旦我们有了依赖注入并运行。  

这个文件将包含四个对象，它将字符串表达式转为方法：Lexer, AST Builder, AST Compiler, Parser。他们在不同的阶段有不同的职责：  

Lexer 获取最原始的字符串表达式，并返回该字符串解析的标记数组。例如，字符串"`a+b`"将会返回标记`a`,`+`，和 `b`。  

AST Builder 接收此法分析器生成的标记数组，并从中构建`bstract Syntax Tree (AST)`(抽象语法树)。这个树表示表达式作为嵌套JavaScript
对象的句法结构。例如，标记`a`,`+`，和 `b`会生成下面的结构：
```js
{
  type: AST.BinaryExpression,
  operator: '+',
  left: {
    type: AST.Identi er,
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
