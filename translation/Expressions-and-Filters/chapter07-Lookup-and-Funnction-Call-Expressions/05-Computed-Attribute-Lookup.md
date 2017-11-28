## Computed Attribute Lookup
我们已经看到了在 non-computed方式在 使用dot操作符如何获取一个scope的属性。在Angular表达式(就像在JavaScript中)第二种方式就是
使用方括号实现*computed attribute lookup*:
```js
it('parses a simple computed property access', function() {
  var fn = parse('aKey["anotherKey"]');
  expect(fn({aKey: {anotherKey: 42}})).toBe(42);
});
```
同样的标记适用于数组。你可以使用数字代替字符串作为key值：
```js
it('parses a computed numeric array access', function() {
  var fn = parse('anArray[1]');
  expect(fn({anArray: [1, 2, 3]})).toBe(2);
});
```
放括号标记也许是最有用的，当在解析的时间里不认识时，但它本身是从`scope`或者*computed*其他方法。你不能使用点符号：
```js
it('parses a computed access with another key as property', function() {
  var fn = parse('lock[key]');
  expect(fn({key: 'theKey', lock: {theKey: 42}})).toBe(42);
});
```
最后，符号应该是足够灵活的，递归允许更精细的表达式，例如其他computed属性访问 - 作为key:
```js
it('parses computed access with another access as property', function() {
  var fn = parse('lock[keys["aKey"]]');
  expect(fn({keys: {aKey: 'theKey'},  lock: {theKey: 42}})).toBe(42);
});
```
表达式`lock[key]`由4个token组成：identifier token`lock`，一个单字符token`[`，identifier token`key`，和单个字符token`]`。他们一起形成了一个AST节点。
除了点我们应该添加`AST.primary`查找方括号：
```js
AST.prototype.primary = function() {
  var primary;
  if (this.expect('[')) {
    primary = this.arrayDeclaration();
  } else if (this.expect('{')) {
    primary = this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    primary = this.constants[this.consume().text];
  } else if (this.peek().identi er) {
    primary = this.identi er();
  } else {
    primary = this.constant();
  }
  **var next;
  while ((next = this.expect('.')) || (next = this.expect('['))) {**
  primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.identi er()
  }; }
    return primary;
  };
```
为了使`expect`调用更加简洁，我们可以扩展`expect`和`peek`去支持多个可替代的tokens。让我们继续，并且使用4个代替数字：
```js
AST.prototype.expect = function(e1, e2, e3, e4) {
  var token = this.peek(e1, e2, e3, e4);
  if (token) {
    return this.tokens.shift();
  }
};
AST.prototype.peek = function(e1, e2, e3, e4) {
  if (this.tokens.length > 0) {
      var text = this.tokens[0].text;
    if (text === e1 || text === e2 || text === e3 || text === e4 ||
        (!e1 && !e2 && !e3 && !e4)) {
    return this.tokens[0];
    }
  }
};
```
现在我们继续，并且使用两个参数形成`primary`:
```js
var next;
while ((next = this.expect('.', '['))) {
    primary = {
      type: AST.MemberExpression,
      object: primary,
      property: this.identi er()
    };
}
```
如果我们遇到开始的方括号，在完成之前我应该consume一个关闭的方括号：
```js
var next;
while ((next = this.expect('.', '['))) {
  primary = {
    type: AST.MemberExpression,
    object: primary,
    property: this.identi er()
  };
  if (next.text === '[') {
    this.consume(']');
  }
}
```
此外正如我们在测试中看到的一样，在方括号之间不是一个identifier。这是一个其他基本表达式的整体。为了支持这一点，我们将computed和non-computed分别处理：
```js
var next;
while ((next = this.expect('.', '['))) {
    if (next.text === '[') {
      primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.primary()
      };
      this.consume(']');
    } else {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.identi er()
        };
    }
}
```
AST compile同样需要知道处理的是computed还是non-computed属性访问。当我们完成AST builder的时候，我们给AST节点添加一些信息：
```js
var next;
while ((next = this.expect('.', '['))) {
  if (next.text === '[') {
    primary = {
      type: AST.MemberExpression,
      object: primary,
      property: this.primary(),
      computed: true
    };
    this.consume(']');
  } else {
      primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.identi er(),
    computed: false
    }; }
}
```
注意到现在方括号的位置不同它的意思也不同。在基本表达式中如果是第一个字符，则表示为一个数组。如果前面有别的，那就是属性访问。

转到AST compiler中，我们现在有两种不同类型的`AST.MemberExpression`,这里需要生成不同类型的代码：
```js
case AST.MemberExpression:
    intoId = this.nextId();
    var left = this.recurse(ast.object);
    if (ast.computed) {
    } else {
    this.if_(left,
      this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
    }
    return intoId;
```
由于computed查找的是一个任意表达式，首先我们需要递归到它：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object);
  if (ast.computed) {
   ** var right = this.recurse(ast.property);**
  } else {
   this.if_(left,
      this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
  }
  return intoId;
```
这给我们应该查找的computed属性。我们可以完成picture在实际查找和将member表达式结果赋值给结果：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object);
  if (ast.computed) {
      var right = this.recurse(ast.property);
      **this.if_(left,
        this.assign(intoId, this.computedMember(left, right)));**
  } else ~~{~~
      this.if_(left,
        this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
  }
  return intoId;
```
新方法`computedMember`是我们完成computed查找需要的最后一部分。它为computed属性访问生成JavaScript:
```js
ASTCompiler.prototype.computedMember = function(left, right) {
  return '(' + left + ')[' + right + ']';
};
```