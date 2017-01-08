## 解析科学计数法
在Angular表达式中表示数字的第三种，也是最后一种方法是科学计数法，它实际是由两个数字组成：系数和指数，由字符`e`分隔。
例如，数字42000,可以表示为`42e3`。作为一个测试用例：
```js
it('can parse a number in scienti c notation', function() {
  var fn = parse('42e3');
  expect(fn()).toBe(42000);
});
```
此外，科学计数法的系数不一定为整数：
```js
it('can parse scienti c notation with a  oat coef cient', function() {
  var fn = parse('.42e2');
  expect(fn()).toBe(42);
});
```
科学计数法的指数也可能是负的，导致系数乘以十的负幂：
```js
it('can parse scienti c notation with negative exponents', function() {
  var fn = parse('4200e-2');
  expect(fn()).toBe(42);
});
```
指数也可以通过在之前具有+号而明确表示为正数：
```js
it('can parse scienti c notation with the + sign', function() {
  var fn = parse('.42e+2');
  expect(fn()).toBe(42);
});
```
最后系数和指数之间的符号`e`也可以是大写的`E`：
```js
it('can parse upper case scienti c notation', function() {
  var fn = parse('.42E2');
  expect(fn()).toBe(42);
});
```
现在我们有科学计数法，我们应该如何实施呢？最直接的方法可能是判断每个字符，如果是`e`,`-`,`+`，接下来为数字，并且依赖
JavaScript的数字强制做剩下的。这就可以让我们的测试通过：
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if (ch === '.' || ch === 'e' || ch === '-' ||
        ch === '+' || this.isNumber(ch)) {
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
正如你想的一样，我们不能轻易的逃避。虽然这个实现正确的解析了科学计数法，但是对于无效的记法也是通过的，如下所示：
```js
it('will not parse invalid scienti c notation', function() {
  expect(function() { parse('42e-'); }).toThrow();
  expect(function() { parse('42e-a'); }).toThrow();
});
```
让我们严谨一些。首先，我们需要引入指数运算符的概念。也就是说，允许在科学计数法的`e`字符之后的字符，可能是数字，加号或者减号：
```js
Lexer.prototype.isExpOperator = function(ch) {
  return ch === '-' || ch === '+' || this.isNumber(ch);
};
```
接下来，我们需要在`readNumber`中使用此检查。首先，让我们清空在`else`中的实现，并引入一个空的`else`分支：
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if (ch === '.' || this.isNumber(ch)) {
    number += ch;
    } else {

    }
    this.index++;
  }
  this.tokens.push({
    text: number,
    value: Number(number)
  });
};
```
有3种情况需要我们考虑：

* 如果当前字符为`e`,并且下一个字符是有效的运算符，应该当前字符加入结果中并继续。
* 如果当前字符是`+`或者`-`，并且上一个字符是`e`，下一个字符是数字，应该当前字符加入结果中并继续。
* 如果当前字符是`+`或者`-`，并且上一个字符是`e`，下一个字符不是数字，我们应该抛出异常。
* 否则，我们应该终止数字解析并发出结果token。
```js
Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if (ch === '.' || this.isNumber(ch)) {
      number += ch;
    } else {
        var nextCh = this.peek();
        var prevCh = number.charAt(number.length - 1);
        if (ch === 'e' && this.isExpOperator(nextCh)) {
          number += ch;
        } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                    nextCh && this.isNumber(nextCh)) {
          number += ch;
        } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                    (!nextCh || !this.isNumber(nextCh))) {
          throw 'Invalid exponent';
        } else {
            break;
        }
    }
    this.index++;
  }
  this.tokens.push({
    text: number,
    value: Number(number)
  });
};
```
注意，在第二、第三个分支中，我们通过`isExpOperator`检查加减号。虽然`isExpOperator`可以接受一个数字，如果它是一个数字，可以激活`while`循环中的第一个`if`条件。

这个函数很复杂，但它现在给了我们在Angular表达式中数字解析的全部能力 -- 除了负数，我们将使用`-`运算符处理。