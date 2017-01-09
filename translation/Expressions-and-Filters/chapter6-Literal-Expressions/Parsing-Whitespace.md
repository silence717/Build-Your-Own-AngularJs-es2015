## 解析空白符
在我们开始讨论多个token表达式的时候，我们先考虑一下空白问题。像表达式'[1, 2, 3]','a = 42',和'aFunction (42)'都包含空字符。
他们的共同点就是空格完全是可选的，可以被解析器忽略。在Angular表达式中技术所有空格都是这样的。
```js
it('ignores whitespace', function() {
  var fn = parse(' \n42 ');
  expect(fn()).toEqual(42);
});
```
我们认为空字符是占用一个空间，回车、水平和垂直制表符，换行，而不是打破空间：
```js
Lexer.prototype.isWhitespace = function(ch) {
  return ch === ' ' || ch === '\r' || ch === '\t' ||
};
```
在`lex`中遇到这些字符的时候，我们只需要将索引累加即可
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
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  return this.tokens;
};
```