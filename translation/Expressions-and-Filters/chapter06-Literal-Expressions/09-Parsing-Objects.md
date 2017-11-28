## 解析对象
本章的最后一个表达式类型将会添加对对象常量的支持。那就是键值对，像`{a: 1, b:2}`。在表达式中，对象经常被使用到，不仅可以用于的数据常量，
并且可以作为之类的配置，就像ngClass和ngStyle。

解析对象和解析数组在很多方式上一致，也有几个关键的区别。首先，让我们测试一下空对象。一个空对象可以等于两一个空对象：
```js
it('will parse an empty object', function() {
  var fn = parse('{}');
  expect(fn()).toEqual({});
});
```
对于对象，我们在 Lexer 中需要三个字符token：起始花括号，键值对必须成对出现：
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
        } else if (this.ch === '[' || this.ch === ']' || this.ch === ',' ||
                   this.ch === '{' || this.ch === '}' || this.ch === ':') {
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
这个`else if`分支开始变得有些笨重。我们给Lexer添加一个帮助方法，检测当前字符是否为可替换的数字而变得简单。这个函数需要一个字符串参数，并且检测当前字符是否和字符串中的匹配：
```js
Lexer.prototype.is = function(chs) {
  return chs.indexOf(this.ch) >= 0;
};
```
现在我们可以将`lex`中的代码变得简洁：
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
    } else if (this.is('[],{}:')) {
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
对象，像数组一个，都是一个基本的表达式。`AST.primary`一旦遇到一个开始大括号，委托给一个叫做`object`的新方法：
```js
AST.prototype.primary = function() {
  if (this.expect('[')) {
    return this.arrayDeclaration();
    } else if (this.expect('{')) {
      return this.object();
      } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        return this.constants[this.consume().text];
    } else {
    return this.constant();
  }
};
```
`object`方法的基本结构和`arrayDeclaration`一样。它consumes对象，包括关闭花括号，并且返回一个`ObjectExpression`的AST节点：
```js
AST.prototype.object = function() {
  this.consume('}');
  return {type: AST.ObjectExpression};
};
```
我们需要再一次定义一下类型：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
```
AST 编译器现在需要返回一个对象常量当在`recurse`中遇到`ObjectExpression`时候：
```js
case AST.ObjectExpression:
  return '{}';
```
当一个对象不为空的时候，它的key值是一个标识符或者字符串，它的value值可以是任意表达式。下面是一个字符串的key值用例:
```js
it('will parse a non-empty object', function() {
  var fn = parse('{"a key": 1, \'another-key\': 2}');
  expect(fn()).toEqual({'a key': 1, 'another-key': 2});
});
```
就像数组的AST构建一样，在对象的AST构建过程我们也需要一个`do.while`循环consumes键值，并且逗号分隔：
```js
AST.prototype.object = function() {
    if (!this.peek('}')) {
      do {
      } while (this.expect(','));
    }
    this.consume('}');
    return {type: AST.ObjectExpression};
};
```
在循环体中，我们首先要从constant token读取key。我们需要另一个AST节点类型`Property`:
```js
AST.prototype.object = function() {
  if (!this.peek('}')) {
    do {
        var property = {type: AST.Property};
        property.key = this.constant();
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression};
};
```
这个类型也需要声明：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
```
我们将consume冒号字符，用于分隔key和value的：
```js
AST.prototype.object = function() {
  if (!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      property.key = this.constant();
      this.consume(':');
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression};
};
```
最后我们需要consume value，这是另一个主要的AST节点，我们附加到property:
```js
AST.prototype.object = function() {
  if (!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      property.key = this.constant();
      this.consume(':');
      property.value = this.primary();
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression};
};
```
然后我们从循环中收集他们的属性，并且将他们附加到`ObjectExpression`节点：
```js
AST.prototype.object = function() {
var properties = [];
    if (!this.peek('}')) {
      do {
        var property = {type: AST.Property};
        property.key = this.constant();
        this.consume(':');
        property.value = this.primary();
        properties.push(property);
      } while (this.expect(','));
    }
    this.consume('}');
    return {type: AST.ObjectExpression, properties: properties};
};
```
在编译的过程中我们队每个属性生成JavaScript，并且将他们放到生成对象的值中：
```js
case AST.ObjectExpression:
    var properties = _.map(ast.properties, _.bind(function(property) {
    }, this));
    return '{' + properties.join(',') + '}';
```
`Constant`节点值，包含一个`value`属性我们可能需要一个转义，由于它是一个字符串：
```js
case AST.ObjectExpression:
  var properties = _.map(ast.properties, _.bind(function(property) {
    var key = this.escape(property.key.value);
  }, this));
  return '{' + properties.join(',') + '}';
```
value可以是任意表达式，它的值可以使用`recurse`来得到。属性的组合由冒号分隔的key和value来组成：
```js
case AST.ObjectExpression:
  var properties = _.map(ast.properties, _.bind(function(property) {
    var key = this.escape(property.key.value);
    var value = this.recurse(property.value);
    return key + ':' + value;
    }, this));
  return '{' + properties.join(',') + '}';
```
一个对象的key值不一定一直是字符串。他们也可以是忽略标引号识符：
```js
it('will parse an object with identifier keys', function() {
  var fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
  expect(fn()).toEqual({a: 1, b: [2, 3], c: {d: 4}});
});
```
这个测试会失败因为AST consumes在对象的keys的标识符位置的tokens由`readIdent`生成，则希望他们由constants代替。
让我们微调一下`readIdent`以便于达到实际上被标识符标记他们：
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
  var token = {
    text: text,
    identifier: true
  };
  this.tokens.push(token);
};
```
AST builder应该检查一个标志，形成一个真正的标识符节点而不是一个常量：
```js
AST.prototype.object = function() {
  var properties = [];
  if (!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      if (this.peek().identi er) {
        property.key = this.identi er();
      } else {
      property.key = this.constant();
      }
      this.consume(':');
      property.value = this.primary();
      properties.push(property);
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression, properties: properties};
};
```
标识符是一个新的AST节点类型，来自类型`Identifier`。他们有一个`name`属性由标识符token的text形成：
```js
AST.prototype.identifier = function() {
  return {type: AST.Identifier, name: this.consume().text};
};
```
我们需要引入一个` Identifier`类型：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identi er = 'Identifier';
```
稍后我们将使用标识符节点在AST的其他地方，但是他们只存在于对象的键里面。

在AST compiler里面我们应该检查key值是否为`Identifier`。这会影响我们使用实际key生成的属性：
```js
case AST.ObjectExpression:
  var properties = _.map(ast.properties, _.bind(function(property) {
  var key = property.key.type === AST.Identi er ?
    property.key.name :
    this.escape(property.key.value);
    var value = this.recurse(property.value);
    return key + ':' + value;
  }, this));
return '{' + properties.join(',') + '}';
```
最后我们可以解析所有Angular表达式语言支持的literals。