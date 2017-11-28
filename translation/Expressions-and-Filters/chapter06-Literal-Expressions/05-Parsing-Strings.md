## 解析字符串
随着数字的解析完成，我们继续扩展解析器，增加对字符串的解析。它和数字解析差不多，但有几个特殊情况需要我们处理。

最简单的字符串是，一个字符序列被单引号或者双引号包裹：
```js
it('can parse a string in single quotes', function() {
  var fn = parse("'abc'");
  expect(fn()).toEqual('abc');
});
it('can parse a string in double quotes', function() {
  var fn = parse('"abc"');
  expect(fn()).toEqual('abc');
});
```
`lex`可以检测当前字符是否为一个或多个引号，并进入一个函数读取字符串，我们很快就会实现它：
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
      this.readString();
    } else {
      throw 'Unexpected next character: '+this.ch;
    }
}
  return this.tokens;
};
```
从一定高度来看，`readNumber`和`readString`非常相似，它读取表达式文本，使用一个`while`循环，创建一个字符串赋值给本地变量。
一个重要的区别就是，在进入`while`循环之前，我们会增加索引跳过开始的引号：
```js
Lexer.prototype.readString = function() {
  this.index++;
  var string = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    this.index++;
  }
};
```
那么我们应该在循环里面做什么呢？有两件事：如果当前字符不是引号，我们将它拼接到字符串中。如果是一个引号，我们应该传递一个token并且终止循环，
因为引号结束字符串。循环结束以后，如果我们仍在读取字符串，我们将抛出一个异常，因为这意味着字符串在表达式结束前未终止：
```js
Lexer.prototype.readString = function() {
  this.index++;
  var string = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (ch === '\'' || ch === '"') {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};
```
这对于字符串解析是一个好的开始，但是没有完成。我们的测试用例还会失败，因为当token以AST作为一个literal，它的值应该被
编译为一个JavaScript函数。表达式`abc`的结果应该是一个像下面这样的函数：
```js
function() {
    return abc;
}
```
包裹字符的引号没有了，而函数看起来更像被一个变量代替。

我们的`AST Compile`需要带引号的字符串值，使他们在JavaScript中正确引用。我们需要一个交`escape`的方法：
```js
case AST.Literal:
    return this.escape(ast.value);
```
这个方法为字符串添加引号，即转义：
```js
ASTCompiler.prototype.escape = function(value) {
  if (_.isString(value)) {
    return '\'' + value + '\'';
  } else {
    return value;
  }
};
```
由于我们需要使用`_.isString`，所以在`parse.js`中引入lodash:
```js
'use strict';
var _ = require('lodash');
```
对于字符串开始和结束引号的判断条件过于宽松，允许一个字符串以不同的引号结尾，和开始的不一样：
```js
it('will not parse a string with mismatching quotes', function() {
  expect(function() { parse('"abc\''); }).toThrow();
});
```
我们需要保证一个字符串，开始和结束使用相同的引号。首先，我们从`lex`的`readString`方法传入开始字符：
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
    } else {
          throw 'Unexpected next character: '+this.ch;
        }
    }
  return this.tokens;
};
```
在`readString`，我们可以通过引号检测字符串终止，而不是字面上的`'`或者`"`:
```js
Lexer.prototype.readString = function(quote) {
    this.index++;
    var string = '';
    while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
        if (ch === quote) {
        this.index++;
         this.tokens.push({
                text: string,
                value: string
        });
      return;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};
```
像JavaScript的字符串一样，Angular表达式也需要对字符串进行转义。有两种转义需要我们支持：
* 1. 单字符转义：换行`\n`, 换页`\f`, 回车`\r`, 水平制表`\t`, 垂直制表`\v`, 单引号`\’`, 双引号`\”`。
* 2. Unicode转义，使用`\u`作为开始，包含四个大写的十六进制code值。例如：`\u00A0`表示一个非空格字符。

我们首先考虑单字符转义。例如，我们能够解析包含引号的字符串：
```js
it('can parse a string with single quotes inside', function() {
  var fn = parse("'a\\\'b'");
  expect(fn()).toEqual('a\'b');
});
it('can parse a string with double quotes inside', function() {
  var fn = parse('"a\\\"b"');
  expect(fn()).toEqual('a\"b');
});
```
在解析的过程中，我们是在分析和寻找`\`并进入转义模式，但是我们对下一个字符的处理将会不同：
```js
Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
    var escape = false;
    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index);
        if (escape) {
        } else if (ch === quote) {
            this.index++;
            this.tokens.push({
              text: string,
              value: string
            });
        return;
        } else if (ch === '\\') {
          escape = true;
        } else {
          string += ch;
        }
        this.index++;
      }
      throw 'Unmatched quote';
    };
```
在转义模式中，如果我们遇到一个字符转义，我们应该看到它是什么，并且用相应的转义字符去替换它。让我们给`parse.js`顶部引入一个
常量对象存储支持的转义字符。这包括单元测试所引用的字符：
```js
var ESCAPES = {'n':'\n', 'f':'\f', 'r':'\r', 't':'\t',
               'v':'\v', '\'':'\'', '"':'"'};
```
然后再`readString`中，我们从这个对象中寻找转义字符。如果包含，我们使用字符替换。如果不是，我们就把原来的字符，有效的忽略反斜杠转义：
```js
Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
  var escape = false;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (escape) {
    var replacement = ESCAPES[ch];
        if (replacement) {
          string += replacement;
        } else {
          string += ch;
        }
        escape = false;
    } else if (ch === quote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else if (ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};
```
还有一个问题，当我进去`AST`编译阶段的时候。当`AST compile`遇到像`'`和`"`，只是把它们的结果放进去，这就会导致无效的JavaScript代码。
编译时转义方法`escape`需要处理这些字符。这时候我们需要一个正则表达式做替换：
```js
ASTCompiler.prototype.escape = function(value) {
  if (_.isString(value)) {
    return '\'' +
      value.replace(this.stringEscapeRegex, this.stringEscapeFn) +
      '\'';
  } else {
    return value;
  }
};
```
我们匹配转义以外的任意字符，或者一个阿拉伯数字：
```js
ASTCompiler.prototype.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
```
在替换函数里，我们得到转义字符的unicode值（使用charCodeAt），并将它转为相应的16进制Unicode转义序列可以将它安全地连接到
生成的JavaScript代码：
```js
ASTCompiler.prototype.stringEscapeFn = function(c) {
  return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
};
```
最后，我们考虑一下本身输入的就是一个unicode序列：
```js
it('will parse a string with unicode escapes', function() {
  var fn = parse('"\\u00A0"');
  expect(fn()).toEqual('\u00A0');
});
```
我们需要看的是反斜杠的下一个字符是否为`u`,如果是，获取下面4个字符，按照16进制解析他们，差对应的数字编码。我们可以使用
JavaScript内置的方法`String.fromCharCode`:
```js
Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
  var escape = false;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (escape) {
        if (ch === 'u') {
          var hex = this.text.substring(this.index + 1, this.index + 5);
          this.index += 4;
          string += String.fromCharCode(parseInt(hex, 16));
        } else {
            var replacement = ESCAPES[ch];
            if (replacement) {
              string += replacement;
            } else {
              string += ch;
            }
        }
      escape = false;
    } else if (ch === quote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else if (ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};
```
最后一个需要考虑的问题是，`u`字符后面不是一个有效的unicode编码会怎么？我们需要抛出一个异常：
```js
it('will not parse a string with invalid unicode escapes', function() {
    expect(function () {parse('"\\u00T0"');}).toThrow();
});
```
我们使用正则表达式来检查`\u`接着正好是4个字符，可以说数字或字母A-F之间，即有效的十六进制数字，我们将接收大小写字符，Unicode转义序列不区分大小写：
```js
Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
  var escape = false;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (escape) {
      if (ch === 'u') {
        var hex = this.text.substring(this.index + 1, this.index + 5);
        if (!hex.match(/[\da-f]{4}/i)) {
          throw 'Invalid unicode escape';
        }
        this.index += 4;
        string += String.fromCharCode(parseInt(hex, 16));
      } else {
            var replacement = ESCAPES[ch];
            if (replacement) {
              string += replacement;
            } else {
              string += ch;
            }
       }
      escape = false;
    } else if (ch === quote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else if (ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};
```
现在我们能够解析字符串！