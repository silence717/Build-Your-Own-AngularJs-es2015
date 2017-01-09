## 解析true,false,和null值
第三种类型的literals，我们将会添加对boolean值`true`和`false`的值，还有`null`值。他们就是所谓的标识符tokens，
意味着输入的是单一的数字或者字母。我们将会看到更多的标识符。经常被用来查找`scope`的属性名称，单他们也可以是保留字，
例如`true`,`false`,或`null`。解析出的值应该有相应的JavaScript值：
```js
it('will parse null', function() {
  var fn = parse('null');
  expect(fn()).toBe(null);
});
it('will parse true', function() {
  var fn = parse('true');
  expect(fn()).toBe(true);
});
it('will parse false', function() {
  var fn = parse('false');
  expect(fn()).toBe(false);
});
```
在`Lexer`中我们可以找出一个标识符去辨认一个以一个小写或大写字母，下划线，或美元符的字符序列：
```js
Lexer.prototype.isIdent = function(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
    ch === '_' || ch === '$';
};
```
当我们遇到一个字符，我们将会使用一个叫作`readIdent`的新函数去做解析：
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
    } else if (this.isIdent(this.ch)) {
      this.readIdent();
    } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  return this.tokens;
};
```
在`readIdent`中，读取标识符token和读取字符串非常相似：
```js
Lexer.prototype.readIdent = function() {
  var text = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isIdent(ch) || this.isNumber(ch)) {
      text += ch;
    } else {
        break;
    }
    this.index++;
  }
  var token = {text: text};
  this.tokens.push(token);
};
```
注意到标识符可能包含数字，但是不会以数字开始。

现在我们有了识别token，但是对使用AST  builder没什么用。我们必须改变它，我们可以定义一些常量token代表某些预定义的值而使AST认识：
```js
AST.prototype.constants = {
  'null': {type: AST.Literal, value: null},
  'true': {type: AST.Literal, value: true},
  'false': {type: AST.Literal, value: false}
};
```
将它他们插入AST，在`program`和`constant`之间我们介绍一个函数，叫做`primary`。也就是说，一个程序的主体由一个主要token组成：
```js
AST.prototype.program = function() {
return {type: AST.Program, body: this.primary()};
};
AST.prototype.primary = function() {
  return this.constant();
};
AST.prototype.constant = function() {
  return {type: AST.Literal, value: this.tokens[0].value};
};
```
一个主要的token可以是一个预先定义好的常量，或者其他一些我们之前实现中的常量：
```js
AST.prototype.primary = function() {
    if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        return this.constants[this.tokens[0].text];
    } else {
        return this.constant();
    }
};
```
对`true`和`false`的测试用例现在可以通过了，他们最终被JavaScript编译了。对于`null`还没有发生，因为默认字符串表示一个空字符串。我们需要一个特殊的用例
在编译器的`escape`方法中，使文本`null`出现在编译代码中：
```js
ASTCompiler.prototype.escape = function(value) {
  if (_.isString(value)) {
      return '\'' +
      value.replace(this.stringEscapeRegex, this.stringEscapeFn) +
      '\'';
    } else if (_.isNull(value)) {
      return 'null';
    } else {
        return value;
  }
};
```