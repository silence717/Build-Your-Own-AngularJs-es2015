## 字面和常量表达式（Literal And Constant Expressions）
我们已经看到了如何使用解析器返回一个函数，它可以被用于计算原始表达式。返回的函数不应该只是一个简单的函数。它应该有属性附加到它：

* `literal` - 一个布尔值表示表达式是否为一个literal值，例如整形或者数组literal。
* `constant` - 一个布尔值表示表达式是否是一个常量，例如原始类型literal，或者一个literal常量值得集合。当表达式是一个常量，它的值不会随着时间的推移而改变。

例如，`42`是literal也是一个常量，就像`[42, 'abc']`。另一方面，一些类似于`[42, 'abc', aVariable]`是一个literal但是不是一个常量，因为`aVariable`不是常量。

`$parse`的用户偶尔使用这两个标识来决定如何使用表达式。`constant`标识在本章中将应用于表达式监听中的一些优化。

让我们先谈谈`literal`标识，因为它更容易实现。各种简单的literal值，包括数字、字符串，和布尔值应该都标为literal：
```js
it('marks integers literal', function() {
  var fn = parse('42');
  expect(fn.literal).toBe(true);
});
it('marks strings literal', function() {
  var fn = parse('"abc"');
  expect(fn.literal).toBe(true);
});
it('marks booleans literal', function() {
  var fn = parse('true');
  expect(fn.literal).toBe(true);
});
```
数组和对象也应该被标识为literal:
```js
it('marks arrays literal', function() {
  var fn = parse('[1, 2, aVariable]');
  expect(fn.literal).toBe(true);
});
it('marks objects literal', function() {
  var fn = parse('{a: 1, b: aVariable}');
  expect(fn.literal).toBe(true);
});
```
任何其他的都应该被标识为non-literal:
```js
it('marks unary expressions non-literal', function() {
     var fn = parse('!false');
     expect(fn.literal).toBe(false);
   });
   it('marks binary expressions non-literal', function() {
     var fn = parse('1 + 2');
     expect(fn.literal).toBe(false);
   });
```
我们需要做是使用帮助函数`isLiteral`检测是否为一个AST literal。然后我我们将编译后的表达式函数中附加结果：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
     lters: {}
  };
  this.recurse(ast);
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      )+ this.state.body.join('') + '}; return fn;';
  /* jshint -W054 */
    var fn = new Function(
    'ensureSafeMemberName',
      'ensureSafeObject',
      'ensureSafeFunction',
      'ifDe ned',
      'filter',
      fnString)(
        ensureSafeMemberName,
        ensureSafeObject,
        ensureSafeFunction,
        ifDe ned,
     filter);
    /* jshint +W054 */
    fn.literal = isLiteral(ast);
    return fn;
};
```
`isLiteral`函数像下面一样定义：

* 一个空program是literal
* 如过一个非空的program仅仅只有一个表达式并且类型是literal，一个数组或者一个对象，那么它是literal

在代码中这些表达：
```js
function isLiteral(ast) {
  return ast.body.length === 0 ||
      ast.body.length === 1 && (
      ast.body[0].type === AST.Literal ||
      ast.body[0].type === AST.ArrayExpression ||
      ast.body[0].type === AST.ObjectExpression);
}
```
设置`constant`标识有点复杂。我们需要独立地考虑每个AST节点类型如何确定它是"不变的"。

我们从简单的literal开始。数字、字符串，和布尔值都是常量：
```js
it('marks integers constant', function() {
  var fn = parse('42');
  expect(fn.constant).toBe(true);
});
it('marks strings constant', function() {
  var fn = parse('"abc"');
  expect(fn.constant).toBe(true);
});
it('marks booleans constant', function() {
  var fn = parse('true');
  expect(fn.constant).toBe(true);
});
```
生成的函数将会有一个`constant`标识，就像它有一个`literal`标识一样。这个标识的值从AST的根节点读取：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
     lters: {}
  };
  this.recurse(ast);
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      )+ this.state.body.join('') + '}; return fn;';
  /* jshint -W054 */
    var fn = new Function(
    'ensureSafeMemberName',
      'ensureSafeObject',
      'ensureSafeFunction',
      'ifDe ned',
      'filter',
      fnString)(
        ensureSafeMemberName,
        ensureSafeObject,
        ensureSafeFunction,
        ifDe ned,
     filter);
    /* jshint +W054 */
    fn.literal = isLiteral(ast);
    fn.constant = ast.constant;
    return fn;
};
```
问题是AST根节点目前没有这样的标识。它是怎么解决的？好的，我们要做的是在AST编译前的预处理过程，使用一个叫做`markConstantExpressions`的函数。我们期望`constant`
标识在预处理过程中设置：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantExpressions(ast);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
     lters: {}
  };
  this.recurse(ast);
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      )+ this.state.body.join('') + '}; return fn;';
  /* jshint -W054 */
    var fn = new Function(
    'ensureSafeMemberName',
      'ensureSafeObject',
      'ensureSafeFunction',
      'ifDe ned',
      'filter',
      fnString)(
        ensureSafeMemberName,
        ensureSafeObject,
        ensureSafeFunction,
        ifDe ned,
     filter);
    /* jshint +W054 */
    fn.literal = isLiteral(ast);
    fn.constant = ast.constant;
    return fn;
};
```
有点像`recurse`,`markConstantExpressions`将是一个由一个大的`switch`语句组成的递归函数。例如，literal表达式都是常量，所以当`markConstantExpressions`
被叫做AST的literal节点，它将设置`constant`标识为`true`:
```js
function markConstantExpressions(ast) {
  switch (ast.type) {
  case AST.Literal:
    ast.constant = true;
    break;
  }
}
```
在测试用例通过之前我们需要考虑实际上AST根节点通常是一个`Program`类型。一个program由一组子表达式组成。当`markConstantExpressions`看到一个program,
它需要递归递归调用本身的每一个子表达式：
```js
function markConstantExpressions(ast) {
  switch (ast.type) {
    case AST.Program:
      _.forEach(ast.body, function(expr) {
        markConstantExpressions(expr);
      });
      break;
    case AST.Literal:
      ast.constant = true;
      break;
    }
}
```
如果一个`Program`所有子节点都是常量，那么它可以被标记为常量：
```js
function markConstantExpressions(ast) {
    var allConstants;
    switch (ast.type) {
    case AST.Program:
        allConstants = true;
        _.forEach(ast.body, function(expr) {
          markConstantExpressions(expr);
          allConstants = allConstants && expr.constant;
        });
        ast.constant = allConstants;
            break;
    case AST.Literal:
        ast.constant = true;
        break;
    }
}
```
Identifier表达式永远不是常量 - 随着时间的推荐我们不知道它是否发生变化：
```js
it('marks identi ers non-constant', function() {
  var fn = parse('a');
  expect(fn.constant).toBe(false);
});
```
这个的实现非常简单：
```js
case AST.Identi er:
  ast.constant = false;
  break;
```
如果并且仅仅只有所有的元素都为常量的时候，数组表达式为常量：
```js
it('marks arrays constant when elements are constant', function() {
  expect(parse('[1, 2, 3]').constant).toBe(true);
  expect(parse('[1, [2, [3]]]').constant).toBe(true);
  expect(parse('[1, 2, a]').constant).toBe(false);
  expect(parse('[1, [2, [a]]]').constant).toBe(false);
});
```
我们检测数组和program非常相似：我们可以递归数组中的每个元素，并且根据我们看到的标记数组：
```js
case AST.ArrayExpression:
  allConstants = true;
  _.forEach(ast.elements, function(element) {
    markConstantExpressions(element);
    allConstants = allConstants && element.constant;
  });
  ast.constant = allConstants;
  break;
```
对象也是相似，常量性依赖对象中的每个值是否都是常量。（对象的key值仅仅是字符串，它们在定义的时候就是常量了，所以我们不需要考虑它们。）
```js
it('marks objects constant when values are constant', function() {
  expect(parse('{a: 1, b: 2}').constant).toBe(true);
  expect(parse('{a: 1, b: {c: 3}}').constant).toBe(true);
  expect(parse('{a: 1, b: something}').constant).toBe(false);
  expect(parse('{a: 1, b: {c: something}}').constant).toBe(false);
});
```
我们通过遍历对象属性并且标记它们的值去实现：
```js
case AST.ObjectExpression:
  allConstants = true;
  _.forEach(ast.properties, function(property) {
    markConstantExpressions(property.value);
    allConstants = allConstants && property.value.constant;
  });
  ast.constant = allConstants;
  break;
```
`this`不是一个常量。它也不能是，因为它的值根据运行时的作用域而来：
```js
it('marks this as non-constant', function() {
  expect(parse('this').constant).toBe(false);
});
```
在`markConstantExpressions`中对`ThisExpression`和`LocalsExpression`的实现就不足为奇了：
```js
case AST.ThisExpression:
case AST.LocalsExpression:
  ast.constant = false;
  break;
```
对于non-computed表达式查找，常量性决定于我们查找对象的常量性：
```js
it('marks non-computed lookup constant when object is constant', function() {
  expect(parse('{a: 1}.a').constant).toBe(true);
  expect(parse('obj.a').constant).toBe(false);
});
```
当我们有一个查找，我们首先访问对象，并且设置constant标识：
```js
case AST.MemberExpression:
  markConstantExpressions(ast.object);
  ast.constant = ast.object.constant;
  break;
```
当我们扩展去考虑computed查找的时候，我们应该考虑查找的key是否为常量：
```js
it('marks computed lookup constant when object and key are', function() {
  expect(parse('{a: 1}["a"]').constant).toBe(true);
  expect(parse('obj["a"]').constant).toBe(false);
  expect(parse('{a: 1}[something]').constant).toBe(false);
  expect(parse('obj[something]').constant).toBe(false);
});
```
如果是computed查找，我们应该额外的访问属性节点：
```js
case AST.MemberExpression:
    markConstantExpressions(ast.object);
    if (ast.computed) {
      markConstantExpressions(ast.property);
    }
    ast.constant = ast.object.constant &&
                    (!ast.computed || ast.property.constant);
    break;
```
一个call表达式不是一个常量 - 我们不能做出这样的假设关于函数被调用时候的性质：
```js
it('marks function calls non-constant', function() {
  expect(parse('aFunction()').constant).toBe(false);
});
```
我们仅仅将标识设置为`false`:
```js
case AST.CallExpression:
  ast.constant = false;
  break;
```
对于这种有一个特殊的情况就是filter。他们也是调用表达式，但与常规函数调用不同，如果它们输入的表达式为常量则认为他们是常量：
```js
it('marks filters constant if arguments are', function() {
  register('aFilter', function() {
    return _.identity;
  });
  expect(parse('[1, 2, 3] | aFilter').constant).toBe(true);
  expect(parse('[1, 2, a] | aFilter').constant).toBe(false);
  expect(parse('[1, 2, 3] | aFilter:42').constant).toBe(true);
  expect(parse('[1, 2, 3] | aFilter:a').constant).toBe(false);
});
```
我们可以训话试图相同的诀窍，就想数组和对象一样：遍历参数数组并且在所有都不变的时候设置常量标识。注意到我们初始化值基于`filter`的节点标识，
因此non-filter的call标识永远不会是`true`:
```js
case AST.CallExpression:
    allConstants = ast.filter ? true : false;
    _.forEach(ast.arguments, function(arg) {
      markConstantExpressions(arg);
      allConstants = allConstants && arg.constant;
    });
    ast.constant = allConstants;
    break;
```
一个赋值表达式当它的两边都是常量的时候它实际上就是一个常量，即使左边是一个常量也是无用的：
```js
it('marks assignments constant when both sides are', function() {
  expect(parse('1 = 2').constant).toBe(true);
  expect(parse('a = 2').constant).toBe(false);
  expect(parse('1 = b').constant).toBe(false);
  expect(parse('a = b').constant).toBe(false);
});
```
我们应该访问赋值的两边，并且根据结果设置`constant`常量：
```js
case AST.AssignmentExpression:
  markConstantExpressions(ast.left);
  markConstantExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  break;
```
如果一个一元操作符表达式的参数是常量，那么它是一个常量：
```js
it('marks unaries constant when arguments are constant', function() {
  expect(parse('+42').constant).toBe(true);
  expect(parse('+a').constant).toBe(false);
});
```
在实现中，我们首先访问参数，然后依据它检测标识：
```js
case AST.UnaryExpression:
  markConstantExpressions(ast.argument);
  ast.constant = ast.argument.constant;
  break;
```
然后binary和logical表达式的常量性都根据他们左右两边的参数来决定。如果他们是常量，那么整个表达式为常量:
```js
it('marks binaries constant when both arguments are constant', function() {
  expect(parse('1 + 2').constant).toBe(true);
  expect(parse('1 + 2').literal).toBe(false);
  expect(parse('1 + a').constant).toBe(false);
  expect(parse('a + 1').constant).toBe(false);
  expect(parse('a + a').constant).toBe(false);
});
it('marks logicals constant when both arguments are constant', function() {
  expect(parse('true && false').constant).toBe(true);
  expect(parse('true && false').literal).toBe(false);
  expect(parse('true && a').constant).toBe(false);
  expect(parse('a && false').constant).toBe(false);
  expect(parse('a && b').constant).toBe(false);
});
```
他们的实现也是首先访问左右两边参数节点，然后根据`constant`标识生成表达式自己的：
```js
case AST.BinaryExpression:
case AST.LogicalExpression:
  markConstantExpressions(ast.left);
  markConstantExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  break;
```
最后，如果三元操作符的3个操作数均为常量那么它就是常量：
```js
it('marks ternaries constant when all arguments are', function() {
  expect(parse('true ? 1 : 2').constant).toBe(true);
  expect(parse('a ? 1 : 2').constant).toBe(false);
  expect(parse('true ? a : 2').constant).toBe(false);
  expect(parse('true ? 1 : b').constant).toBe(false);
  expect(parse('a ? b : c').constant).toBe(false);
});
```
在这里，我们先访问三个操作数节点，然后生成结果：
```js
case AST.ConditionalExpression:
  markConstantExpressions(ast.test);
  markConstantExpressions(ast.consequent);
  markConstantExpressions(ast.alternate);
  ast.constant =
    ast.test.constant && ast.consequent.constant && ast.alternate.constant;
  break;
```
现在我们已经实现了完整的树形函数去标记各种表达式为常量或非常量。