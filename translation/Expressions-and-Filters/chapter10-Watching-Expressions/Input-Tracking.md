## 输入追踪（Input Tracking）
我们对表达式监控还有一个优化，这就是所谓的输入追踪。这个想法是当表达式由一个或者多个输入表达式组成（就像`a*b`由`a`和`b`组成），
这个没必要重新计算表达式的值除非至少一个输入值发生改变。

例如，一个literal的数组表达式不应该变化，如果它包含的项没有任何改变的：
```js
it('does not re-evaluate an array if its contents do not change', function() {
  var values = [];

  scope.a = 1;
  scope.b = 2;
  scope.c = 3;

  scope.$watch('[a, b, c]', function(value) {
    values.push(value);
  });

  scope.$digest();
  expect(values.length).toBe(1);
  expect(values[0]).toEqual([1, 2, 3]);

  scope.$digest();
  expect(values.length).toBe(1);
  scope.c = 4;

  scope.$digest();
  expect(values.length).toBe(2);
  expect(values[1]).toEqual([1, 2, 4]);
});
```
现在我们监控一个非常量数组。我们digest三次。第一次我们期望listener触发数组的值。第二次我们不期望listener触发因为数组内容没有发生改变。
第三次我们更改了数组的内容并且期望listener再次被触发。

实际上发生了"10 $digest iterations reached"的异常，因为我们使用了引用watch,表达式生成了一个新数组引用在每次调用中。这个是不应该的。

我们要做的是，通过解析器创建的每个表达式函数包含它输入的表达式信息 - 这个表达式可能会导致整个表达式的值发生变化。我们从根本上需要扩展我们的AST compiler，
不仅编译整体表达式函数，而且每个整体表达式的输入也要便以为输入表达式函数。

让我们首先考虑watcher实现的一面，在进入AST compiler之前。当我们解析表达式，如果它不是一个常量或者单次，但是它有输入，它应该有一个`input`属性。如果是，
我们使用一个特殊的`inputsWatchDelegate`去监控它：
```js
function parse(expr) {
  switch (typeof expr) {
    case 'string':
      var lexer = new Lexer();
      var parser = new Parser(lexer);
      var oneTime = false;
      if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
        oneTime = true;
        expr = expr.substring(2);
      }
      var parseFn = parser.parse(expr);
      if (parseFn.constant) {
        parseFn.$$watchDelegate = constantWatchDelegate;
      } else if (oneTime) {
        parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate :
                                                    oneTimeWatchDelegate;
      } else if (parseFn.inputs) {
        parseFn.$$watchDelegate = inputsWatchDelegate;
      }
      return parseFn;
    case 'function':
      return expr;
    default:
      return _.noop;
  }
}
```
inputs的watch代理将实现给定表达式的输入条件的watcher:
```js
function inputsWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var inputExpressions = watchFn.inputs;
  return scope.$watch(function() {

  }, listenerFn, valueEq);
}
```
输入追踪是通过维护一个输入表达式的值得数组完成。数组使用一些特殊的"唯一的"值来初始化（一个空literal函数），然后在scope上通过再次运行计算每个输入表达式来更新每个watch:
```js
function inputsWatchDelegate(scope, listenerFn, valueEq, watchFn) {
    var inputExpressions = watchFn.inputs;
    var oldValues = _.times(inputExpressions.length, _.constant(function() { }));
    return scope.$watch(function() {
    _.forEach(inputExpressions, function(inputExpr, i) {
      var newValue = inputExpr(scope);
      if (!expressionInputDirtyCheck(newValue, oldValues[i])) {
        oldValues[i] = newValue;
      }
    });
    }, listenerFn, valueEq);
}
```
实际上脏检查代理到一个帮助方法，一个简单的NaN-aware引用值等值检测：
```js
function expressionInputDirtyCheck(newValue, oldValue) {
  return newValue === oldValue ||
    (typeof newValue === 'number' && typeof oldValue === 'number' &&
     isNaN(newValue) && isNaN(oldValue));
}
```
每次watch运行，如果任一inputs发生变化，那么设置`changed`标识：
```js
function inputsWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var inputExpressions = watchFn.inputs;
  var oldValues = _.times(inputExpressions.length, _.constant(function() { }));
  return scope.$watch(function() {
    var changed = false;
    _.forEach(inputExpressions, function(inputExpr, i) {
      var newValue = inputExpr(scope);
    if (changed || !expressionInputDirtyCheck(newValue, oldValues[i])) {
      changed = true;
      oldValues[i] = newValue;
    }
  });
  }, listenerFn, valueEq);
}
```
如果发生改变，则对复合表达式自身重新计算新值。它被当作watch的返回值；
```js
function inputsWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var inputExpressions = watchFn.inputs;
  var oldValues = _.times(inputExpressions.length, _.constant(function() { }));
  var lastResult;
  return scope.$watch(function() {
      var changed = false;
      _.forEach(inputExpressions, function(inputExpr, i) {
        var newValue = inputExpr(scope);
        if (changed || !expressionInputDirtyCheck(newValue, oldValues[i])) {
          changed = true;
          oldValues[i] = newValue;
        }
      });
    if (changed) {
        lastResult = watchFn(scope);
    }
    return lastResult;
  }, listenerFn, valueEq);
}
```
`lastResult`变量一直保持相同的值，直到至少一个input表达式发生改变。

随着watch代理，我们考虑如何使用`inputs`数组。它把我们带回到AST compiler。

形成`inputs`的过程决定于表达式输入的是什么。不同的表达式有不同的inputs，所以每个AST节点类型的inputs节点需要单独确认。这意味着我们需要一个像常量检查一样的树形函数。

实际上，我们不需要新建一个树形函数，但是我们可以扩展一下已存在的函数，将input检查附加到常量检查上。竖线我们去改一个能更好地反应一个新目的函数名：
```
代码太长省略，将markConstantExpressions改为markConstantAndWatchExpressions
```
`ASTCompiler.compile`也需要改变一下名称：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  // ...
};
```
我们需要在这个函数里面做些什么，除了标记常量，是手机每个AST节点到`toWatch`属性。我们需要一个变量去收集这些inputs,所以我们首先引入：
```js
function markConstantAndWatchExpressions(ast) {
  var allConstants;
  var argsToWatch;
  // ...
}
```
现在，我们反过来考虑一下每个节点类型的input。对于每一个节点类型，我们需要考虑"这个表达式的值什么时候改变？"

对于literals,没有什么需要监控 - 简单的literals不会改变：
```js
case AST.Literal:
    ast.constant = true;
    ast.toWatch = [];
    break;
```
对于identifier表达式，需要监控的是表达式本身。没有更小的部分可以被分解：
```js
case AST.Identi er:
  ast.constant = false;
  ast.toWatch = [ast];
  break;
```
对于数组，我们需要监控数组中所有非常量的人意元素：
```js
case AST.ArrayExpression:
    allConstants = true;
    argsToWatch = [];
    _.forEach(ast.elements, function(element) {
      markConstantAndWatchExpressions(element);
      allConstants = allConstants && element.constant;
    if (!element.constant) {
      argsToWatch.push.apply(argsToWatch, element.toWatch);
    }
    });
    ast.constant = allConstants;
    ast.toWatch = argsToWatch;
    break;
```
同上对于对象，inputs依赖于对象中的每个非常量值：
```js
case AST.ObjectExpression:
  allConstants = true;
  argsToWatch = [];
  _.forEach(ast.properties, function(property) {
      markConstantAndWatchExpressions(property.value);
      allConstants = allConstants && property.value.constant;
      if (!property.value.constant) {
          argsToWatch.push.apply(argsToWatch, property.value.toWatch);
      }
  });
  ast.constant = allConstants;
  ast.toWatch = argsToWatch;
  break;

```
`this`和`locals`没有inputs:
```js
case AST.ThisExpression:
case AST.LocalsExpression:
    ast.constant = false;
    ast.toWatch = [];
    break;
```
一个member表达式，像一个identifier，没有独立的inputs。我们需要监控的是表达式本身：
```js
case AST.MemberExpression:
  markConstantAndWatchExpressions(ast.object);
  if (ast.computed) {
    markConstantAndWatchExpressions(ast.property);
  }
  ast.constant = ast.object.constant &&
                  (!ast.computed || ast.property.constant);
  ast.toWatch = [ast];
  break;
```
一个call表达式inputs需要考虑调用本身，除非是一个filter, inputs由它自己非常量的参数组成：
```js
case AST.CallExpression:
  allConstants = ast. lter ? true : false;
    argsToWatch = [];
    _.forEach(ast.arguments, function(arg) {
      markConstantAndWatchExpressions(arg);
      allConstants = allConstants && arg.constant;
    if (!arg.constant) {
      argsToWatch.push.apply(argsToWatch, arg.toWatch);
    }
    });
    ast.constant = allConstants;
    ast.toWatch = ast. lter ? argsToWatch : [ast];
    break;
```
对于assignments，inputs也是节点本身：
```js
case AST.AssignmentExpression:
  markConstantAndWatchExpressions(ast.left);
  markConstantAndWatchExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  ast.toWatch = [ast];
  break;
```
对于一元表达式操作符我们应该监控参数的inputs - 在参数发生变化的时候没必要再次应用操作符本身：
```js
case AST.UnaryExpression:
  markConstantAndWatchExpressions(ast.argument);
  ast.constant = ast.argument.constant;
  ast.toWatch = ast.argument.toWatch;
  break;
```
对于binary表达式，我们需要考虑它左右两边的参数inputs:
```js
case AST.BinaryExpression:
case AST.LogicalExpression:
  markConstantAndWatchExpressions(ast.left);
  markConstantAndWatchExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  ast.toWatch = ast.left.toWatch.concat(ast.right.toWatch);
  break;
```
我们应该小心这个不适用于逻辑表达式。如果我们watch左右两边的inputs,我们科恩个打破AND和OR的行为。所以在这一点上，我们需要分别实现`BinaryExpression`和`LogicalExpression`,
并且设置`LogicalExpression`的input未它自己：
```js
case AST.BinaryExpression:
  markConstantAndWatchExpressions(ast.left);
  markConstantAndWatchExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  ast.toWatch = ast.left.toWatch.concat(ast.right.toWatch);
  break;
case AST.LogicalExpression:
  markConstantAndWatchExpressions(ast.left);
  markConstantAndWatchExpressions(ast.right);
  ast.constant = ast.left.constant && ast.right.constant;
  ast.toWatch = [ast];
  break;
```
最后，对于条件表达式它的input也是它自己。在这里，我们也要小心不要打破short-circuiting，所以我们不能破坏表达式到inputs:
```js
case AST.ConditionalExpression:
  markConstantAndWatchExpressions(ast.test);
  markConstantAndWatchExpressions(ast.consequent);
  markConstantAndWatchExpressions(ast.alternate);
  ast.constant =
    ast.test.constant && ast.consequent.constant && ast.alternate.constant;
  ast.toWatch = [ast];
  break;
```
在这一点上，我们实现`markConstantAndWatchExpressions`后在AST（除了`Program`）的每个节点都有一个`toWatch`数组。在有可能的情况下，每个节点指向该节点的输入节点。
当输入追踪是不可能的，数组将包含这些本身。在任何情况下，我们可以利用这些信息去实现输入追踪。

我们在`AST`节点中有`toWatch`数组，并且期望在表达式函数中有一个`inputs`数组。要做的就是连接他们两个。在AST compiler中需要分别遍历主要表达式的输入节点。

让我们先重构compiler让它真正有几个编译目标。现在我们返回所有的JavaScript到数组`this.state.body`，并且所有的变量名称到`this.state.vars`。由于我们马上需要编译
多个函数，我们需要改变它，以便于达到根据我们当前正在变异的使body和vars进入不同的地方。

让我们将body和vars包裹起来在compiler状态到一个中间对象叫做`fn`:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
  nextId: 0,
  fn: {body: [], vars: []},
  filters: {} };
  // ...
};
```
然后，在调用`recurse`之前我们设置`computing`属性的置为`fn`:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {}
  };
  this.state.computing = 'fn';
  this.recurse(ast);
```
这个说明"不论你返回什么，将它放到`state`的`fn`对象，因为这是我们正在计算的"。让我们使用`computing`属性通过返回的代码或者变量更新locations。

在`recurse`的`AST.Program`分支：
```js
case AST.Program:
  _.forEach(_.initial(ast.body), _.bind(function(stmt) {
    this.state[this.state.computing].body.push(this.recurse(stmt), ';');
  }, this));
  this.state[this.state.computing].body.push(
   'return ', this.recurse(_.last(ast.body)), ';');
  break;
```
在`recurse`的`AST.LogicalExpression`分支：
```js
case AST.LogicalExpression:
    intoId = this.nextId();
    this.state[this.state.computing].body.push(
    this.assign(intoId, this.recurse(ast.left)));
    this.if_(ast.operator === '&&' ? intoId : this.not(intoId),
      this.assign(intoId, this.recurse(ast.right)));
    return intoId;
```
在`recurse`的`AST.ConditionalExpression`分支：
```js
case AST.ConditionalExpression:
    intoId = this.nextId();
    var testId = this.nextId();
    this.state[this.state.computing].body.push(
    this.assign(testId, this.recurse(ast.test)));
    this.if_(testId,
      this.assign(intoId, this.recurse(ast.consequent)));
    this.if_(this.not(testId),
      this.assign(intoId, this.recurse(ast.alternate)));
    return intoId;
```
在`nextId`:
```js
ASTCompiler.prototype.nextId = function(skip) {
  var id = 'v' + (this.state.nextId++);
  if (!skip) {
    this.state[this.state.computing].vars.push(id);
  }
  return id;
};
```
在`if_`:
```js
ASTCompiler.prototype.if_ = function(test, consequent) {
    this.state[this.state.computing].body.push(
        'if(', test, '){', consequent, '}');
};
```
在`addEnsureSafeMemberName`, `addEnsureSafeObject`和`addEnsureSafeFunction`:
```js
ASTCompiler.prototype.addEnsureSafeMemberName = function(expr) {
    this.state[this.state.computing].body.push(
        'ensureSafeMemberName(' + expr + ');');
};
ASTCompiler.prototype.addEnsureSafeObject = function(expr) {
    this.state[this.state.computing].body.push(
        'ensureSafeObject(' + expr + ');');
};
ASTCompiler.prototype.addEnsureSafeFunction = function(expr) {
    this.state[this.state.computing].body.push(
        'ensureSafeFunction(' + expr + ');');
};
```
现在我们改变了生成代码的location,我们也需要改变生成函数中的读取：
```js
ASTCompiler.prototype.compile = function(text) {
 //...
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
  (this.state.fn.vars.length ?
    'var ' + this.state.fn.vars.join(',') + ';' :
  ''
  )+
  this.state.fn.body.join('') +
  '}; return fn;';
 //... 
};
```
我们做这么多重构的原因是，现在我们可以重复使用编译代码，基于AST节点的`toWatch`属性编译输入函数。我们将使用编译状态中`inputs`数组跟踪生成的输入字符串：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {},
    inputs: []
  };
  // ...
};
```
input函数编译将在主表达式函数编译前完成:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {},
    inputs: []
  };
  _.forEach(getInputs(ast.body), function(input) {
  });
  this.state.computing = 'fn';
  this.recurse(ast);
  // ...
};
```
`getInputs`帮助函数在这使用，我们将得到顶级AST节点的输入。它仅仅做，如果程序主体由一个表达式，并且表达式inputs不是表达式本身：
```js
function getInputs(ast) {
  if (ast.length !== 1) {
    return;
  }
  var candidate = ast[0].toWatch;
  if (candidate.length !== 1 || candidate[0] !== ast[0]) {
    return candidate;
  }
}
```
在循环内部我们现在可以编译每个输入表达式函数。我们为每个输入生成一个唯一的"input key",为它初始化compiler状态，并且将它设置为`computing`的值。当我们调用`recurse`,
生成的代码将进入正确的地方。最后我们为函数生成最终的`return`语句，并且添加input key到input数组。
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
     lters: {},
    inputs: []
  };
  _.forEach(getInputs(ast.body), _.bind(function(input, idx) {
      var inputKey = 'fn' + idx;
      this.state[inputKey] = {body: [], vars: []};
      this.state.computing = inputKey;
        this.state[inputKey].body.push('return ' + this.recurse(input) + ';');
        this.state.inputs.push(inputKey);
  }, this));
  this.state.computing = 'fn';
  this.recurse(ast);
  // ...
};
```
在这一点上，我们有了每个在`state.inputs`中生成的每个输入表达式的名字，而且生成的代码在state里面嵌套。接下来要做的是将生成的输入函数链接到主表达式函数。
我们使用一个叫做`watchFns`的方法来做：
```js
ASTCompiler.prototype.compile = function(text) {
//...
var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
    (this.state.fn.vars.length ?
      'var ' + this.state.fn.vars.join(',') + ';' :
''
)+ this.state.fn.body.join('') + '};' +
this.watchFns() +
' return fn;';
  // ...
};
```
`watchFns`做的是通过我们收集到编译器的状态`inputs`。它收集JavaScript代码片段的数组并且将他们拼接成一个字符串返回：
```js
ASTCompiler.prototype.watchFns = function() {
  var result = [];
  _.forEach(this.state.inputs, _.bind(function(inputName) {
  }, this));
  return result.join('');
};
```
一个JavaScript函数为每个inputs生成，基于vars和body在编译器状态存储为input key。函数的生成类似于主表达式函数:首先声明Var,然后是body。
函数需要一个参数，它是（推测）是scope:
```js
ASTCompiler.prototype.watchFns = function() {
  var result = [];
  _.forEach(this.state.inputs, _.bind(function(inputName) {
    result.push('var ', inputName, '=function(s) {',
      (this.state[inputName].vars.length ?
        'var ' + this.state[inputName].vars.join(',') + ';' :
    ''
    ),
      this.state[inputName].body.join(''),
    '};');
  }, this));
  return result.join('');
};
```
一个语句，实际上把`input`数组中生成的主要功能也产生。它包含所有生成的属兔函数的引用：
```js
ASTCompiler.prototype.watchFns = function() {
  var result = [];
  _.forEach(this.state.inputs, _.bind(function(inputName) {
    result.push('var ', inputName, '=function(s) {',
      (this.state[inputName].vars.length ?
        'var ' + this.state[inputName].vars.join(',') + ';' :
    ''
    ),
          this.state[inputName].body.join(''),
        '};');
    }, this));
    if (result.length) {
      result.push('fn.inputs = [', this.state.inputs.join(','), '];');
    }
    return result.join('');
};
```
我们测试通过之前需要考虑剩下的一个就是输入表达式中的locals角色。你可能已经注意到，在`watchFns`中生成输入函数不需要locals`l`参数。这就是我们不考虑locals的原因。

这里的问题是，我们有一些在`recurse`的`AST.Identifier`分支中生成的代码，他们续爱`l`一直存在。我们需要改变它。我们在compiler上设置一个熟悉，并且标记它们
是input函数还是主表达式函数：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {},
    inputs: []
  };
    this.stage = 'inputs';
    _.forEach(getInputs(ast.body), _.bind(function(input, idx) {
      var inputKey = 'fn' + idx;
      this.state[inputKey] = {body: [], vars: []};
      this.state.computing = inputKey;
      this.state[inputKey].body.push('return ' + this.recurse(input) + ';');
      this.state.inputs.push(inputKey);
    }, this));
    this.stage = 'main';
    this.state.computing = 'fn';
      this.recurse(ast);
      // ...
    };
```
现在，我们为`AST.Identifier`生成代码，我们使用locals属性检测编译器的平台不同。当编译inputs,它将一直是`false`。当编译主函数，它根据`getHasOwnProperty`
像之前一样检查：
```js
case AST.Identi er:
    ensureSafeMemberName(ast.name);
    intoId = this.nextId();
    var localsCheck;
    if (this.stage === 'inputs') {
      localsCheck = 'false';
    } else {
      localsCheck = this.getHasOwnProperty('l', ast.name);
    }
    this.if_(localsCheck,
    this.assign(intoId, this.nonComputedMember('l', ast.name)));
    if (create) {
        this.if_(this.not(localsCheck) +
        ' && s && ' +
                   this.not(this.getHasOwnProperty('s', ast.name)),
            this.assign(this.nonComputedMember('s', ast.name), '{}'));
    }
    this.if_(this.not(localsCheck) + ' && s',
    this.assign(intoId, this.nonComputedMember('s', ast.name)));
    if (context) {
    context.context = localsCheck + '?l:s';
    context.name = ast.name;
      context.computed = false;
    }
    this.addEnsureSafeObject(intoId);
    return intoId;
```
现在我们队输入追踪有了一个实现。它最终涉及了相当多的变化，但它也是一个非常强大的优化。总之，这就是现在发生的：

* 1. 编译器访问每个AST的节点，并且根据输入节点适当的设置`toWatch`属性。
* 2. 编译器生成一个独立的JavaScript函数为每个表达式的顶级input。这个inputs依赖于上一步生成的`toWatch`属性。
* 3. 编译器的`watchFns`方法为上一步的每个bodies copiled生了输入表达式函数。它将他们添加到主表达式函数的`inputs`属性。
* 4. 一个inputs watch代理一旦被监控就添加表达式。
* 5. 代替监控主表达式函数，inputs watch代理它在`inputs`发现的每个函数。