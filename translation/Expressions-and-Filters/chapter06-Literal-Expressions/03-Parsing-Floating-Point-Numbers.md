## 解析浮点数
我们的`lexer`目前只能解析整数，而不能处理浮点数，例如`4.2`:
```js
// parse_spec.js
it('can parse a  oating point number', function() {
  var fn = parse('4.2');
  expect(fn()).toBe(4.2);
});
```
解决这个问题很简单。我们需要做的是允许`readNumber`中的一个字符除了一个数字之外的点：
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (ch === '.' || this.isNumber(ch)) {
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
我们不需要做任何特别的事情来解析点，因为JavaScript的内置数字强制可以处理它。

当浮点数的整数部分为零时，Angular表达式允许您可以完全省略整数部分，就像JavaScript一样。我们的实现还没有起作用，导致下面测试失败：
```js
it('can parse a  oating point number without an integer part', function() {
  var fn = parse('.42');
  expect(fn()).toBe(0.42);
});
```
原因是在`lex`函数张，我们通过查看当前字符是否为一个数字来决定是否进去`readNumber`方法。我们也应该这样做，当它是一个点，下一个字符将是一个数字。

首先，为了查看下一个字符，我们给lexer添加一个叫做`peek`的函数。它返回下一个字符的文本，而不向前移动当前的索引。如果没有下一个字符，`peek`会返回`false`:
```js
Lexer.prototype.peek = function() {
  return this.index < this.text.length - 1 ?
    this.text.charAt(this.index + 1) :
    false;
};
```

lexer函数现在将使用它来决定是否进去`readNumber`:
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
      } else {
        throw 'Unexpected next character: '+this.ch;
      }
  }
    return this.tokens;
  };
```