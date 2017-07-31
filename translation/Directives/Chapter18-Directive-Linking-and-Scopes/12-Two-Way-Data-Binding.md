## Two-Way Data Binding
双向数据绑定和单向数据绑定非常相似。我们接下来讨论这几个重要的差异，但首先让我们充实已经有了的单向数据绑定。

最简单的双向数据绑定配置就是在Scope定义对象里面使用文本`=`字符：
```js
it('allows binding two-way expression to isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        anAttr: '='
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.anAttr).toBe(42);
  });
});
```
我们也可以使用别名让scope属性与DOM属性有一个不同的名字：
```js
it('allows aliasing two-way expression attribute on isolate scope', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '=theAttr'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive the-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myAttr).toBe(42);
  });
});
```
双向数据绑定也被watch,就像单向数据绑定：
```js
it('watches two-way expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
          scope: {
            myAttr: '='
          },
          link: function(scope) {
            givenScope = scope;
          }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);
    $rootScope.parentAttr = 41;
    $rootScope.$digest();
    expect(givenScope.myAttr).toBe(42);
  }); 
});
```
并且他们是可选的，当绑定符是特定的`=?`:
```js
it('does not watch optional missing two-way expressions', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '=?'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive></div>');
    $compile(el)($rootScope);
    expect($rootScope.$$watchers.length).toBe(0);
  }); 
});
```
我们可以通过在绑定正则表达式里面添加对`=`的支持让这些测试通过。

```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<=])(\??)\s*(\w*)\s*/);
// ...
```
然后通过特定的实现，和对单向绑定里面做的一样：
```js
_.forEach(
  newIsolateScopeDirective.$$isolateBindings,
  function(definition, scopeName) {
    var attrName = definition.attrName;
    var parentGet, unwatch;
    switch (definition.mode) {
      case '@':
        attrs.$observe(attrName, function(newAttrValue) {
          isolateScope[scopeName] = newAttrValue;
        });
        if (attrs[attrName]) {
          isolateScope[scopeName] = attrs[attrName];
        }
        break;
      case '<':
        if (definition.optional && !attrs[attrName]) {
    break; }
    parentGet = $parse(attrs[attrName]);
    isolateScope[scopeName] = parentGet(scope);
    unwatch = scope.$watch(parentGet, function(newValue) {
      isolateScope[scopeName] = newValue;
    });
    isolateScope.$on('$destroy', unwatch);
    break;
    case '=':
      if (definition.optional && !attrs[attrName]) {
    break; }
      parentGet = $parse(attrs[attrName]);
      isolateScope[scopeName] = parentGet(scope);
      unwatch = scope.$watch(parentGet, function(newValue) {
        isolateScope[scopeName] = newValue;
      });
      isolateScope.$on('$destroy', unwatch);
      break;
    } 
  });
```
如果这就是全部，那么双向绑定就没有多大意义了，不是吗？此时，我们将得到双向数据绑定的实际两面：当你在隔离scope上赋值一个绑定的属性时，它也可能会影响父scope上
绑定的另一面。这是我们之前没有见过的。下面举个栗子：
```js
it('allows assigning to two-way scope expressions', function() {
  var isolateScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '='
      },
      link: function(scope) {
        isolateScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-attr="parentAttr"></div>');
    $compile(el)($rootScope);
    isolateScope.myAttr = 42;
    $rootScope.$digest();
    expect($rootScope.parentAttr).toBe(42);
  }); 
});
```
在测试中，我们在隔离scope上已经绑定属性`myAttr`到父scope上面叫作`parentAttr`。我们测试当给子scope赋一个值，并且进行脏检查，父scope上的相同的值得到更新。

数据绑定的工作方式有两种，优先级的问题就变得相关了：如果父和子属性在同一digest发生变化怎么办 ？哪一个结束的早，它的值就会成为父和子scope的值？Angular把优先级给了父scope：
```js
it('gives parent change precedence when both parent and child change', function() {
  var isolateScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '='
      },
      link: function(scope) {
        isolateScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    var el = $('<div my-directive my-attr="parentAttr"></div>');
    $compile(el)($rootScope);
    
    $rootScope.parentAttr = 42;
    isolateScope.myAttr = 43;
    $rootScope.$digest();
    expect($rootScope.parentAttr).toBe(42);
    expect(isolateScope.myAttr).toBe(42);
    }); 
});
```
这基本上是双向数据绑定如何工作。让我们继续并且建立起来。它不是特别复杂，但是这里有一些微妙的细节去解决。

首先，我们需要更多的控制，当变化发生而不是我们给的普通 watch-listener。相反，为了使其变得简单，我们只注册了一个watch函数，完全忽略了listener函数。
我们依赖于在每次digest中watch函数，并在其中检测我们自己的变化：
```js
case '=':
  if (definition.optional && !attrs[attrName]) {
    break; 
  }
  parentGet = $parse(attrs[attrName]);
  isolateScope[scopeName] = parentGet(scope);
  var parentValueWatch = function() {
      var parentValue = parentGet(scope);
      if (isolateScope[scopeName] !== parentValue) {
        isolateScope[scopeName] = parentValue;
      }
      return parentValue;
  };
  unwatch = scope.$watch(parentValueWatch);
  isolateScope.$on('$destroy', unwatch);
  break;
```
这个实现仍然只通过我们旧的测试，而不是新的测试，但是代码现在的形式更适合双向数据绑定的两部分。

现在我们追踪watch的当前值如果和隔离scope上的不同，但是如果发生了变化我们无法追踪到变化的地方。为此，我们将引入一个新的变量`lastValue`，它将永远存储父scope最后一次的digest值：
```js
case '=':
  if (definition.optional && !attrs[attrName]) {
    break; 
  }
  parentGet = $parse(attrs[attrName]);
  var lastValue = isolateScope[scopeName] = parentGet(scope);
  var parentValueWatch = function() {
    var parentValue = parentGet(scope);
    if (isolateScope[scopeName] !== parentValue) {
      if (parentValue !== lastValue) {
        isolateScope[scopeName] = parentValue;
      }
    }
    lastValue = parentValue;
    return lastValue;
  };
  unwatch = scope.$watch(parentValueWatch);
  isolateScope.$on('$destroy', unwatch);
  break;
```
新变量出现的目的变得非常清晰，当我们看到隔离scope的当前属性值和父scope的相同属性的当前值不一样的时候，但是和`lastValue`相同？
这意味着这个值在隔离Scope上已经改变了，并且我们需要更新父scope:
```js
case '=':
  if (definition.optional && !attrs[attrName]) {
    break; 
  }
  parentGet = $parse(attrs[attrName]);
  var lastValue = isolateScope[scopeName] = parentGet(scope);
  var parentValueWatch = function() {
    var parentValue = parentGet(scope);
    if (isolateScope[scopeName] !== parentValue) {
      if (parentValue !== lastValue) {
        isolateScope[scopeName] = parentValue;
      } else {
      	
      }
    }
    lastValue = parentValue;
    return lastValue;
  };
  unwatch = scope.$watch(parentValueWatch);
  isolateScope.$on('$destroy', unwatch);
  break;
```
我们如何更新父scope?当我们实现表达式的时候，我们看到一些表达式是被赋值的，意味着衙门不仅可以被计算为一个值，并且我们可以使用
`assign`函数更新一个新值到表达式。这就是我们用于放到父Scope的新值：
```js
case '=':
  if (definition.optional && !attrs[attrName]) {
    break; 
  }
  parentGet = $parse(attrs[attrName]);
  var lastValue = isolateScope[scopeName] = parentGet(scope);
  var parentValueWatch = function() {
    var parentValue = parentGet(scope);
    if (isolateScope[scopeName] !== parentValue) {
      if (parentValue !== lastValue) {
        isolateScope[scopeName] = parentValue;
      } else {
      	parentValue = isolateScope[scopeName];
        parentGet.assign(scope, parentValue);
      }
    }
    lastValue = parentValue;
    return lastValue;
  };
  unwatch = scope.$watch(parentValueWatch);
  isolateScope.$on('$destroy', unwatch);
  break;
```
注意到除了调用`assign`,我们更新了局部变量`parentValue`，从而`lastValue`的变量也被赋予了我们的值。所有的都会在下一次的digest中同步。

注意到优先级规则现在也已经实现了：我们有一个 if-else 语句，我们首先检查父scope的属性是否发生变化， 并且只有在没有变化的时候我们认为子scope
没有任何变化。当父和子scope的值都发生变化，子的变化会被忽略并且重写。


你可以已经注意到数据绑定使用引用来检测值变化。虽然不可能改变这种行为来使用基于值的watch，在使用双向绑定的时候我们可以很容易的查看集合的更改。使用一个特殊的
符号在Scope定义对象里面该诉框架我们对双向数据绑定应该使用`$watchCollection`而不是`$watch`。例如，当我们绑定一个函数，每次调用返回一个新数组是非常有用的：
```js
it('throws when two-way expression returns new arrays', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '='
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
      $rootScope.parentFunction = function() {
        return [1, 2, 3];
      };
      var el = $('<div my-directive my-attr="parentFunction()"></div>');
      $compile(el)($rootScope);
      expect(function() {
        $rootScope.$digest();
      }).toThrow();
  }); 
});
```
我们在这里看到，正常的引用是不会覆盖this: watch每次看到一个新数组，并且认为它是一个新值。digest运行到迭代限制并且抛出异常，这是测试用例希望发生的。

为了修复这个，我们引入一个集合watch使用`=*`符号在scope定义：
```js
it('can watch two-way bindings as collections', function() {
  var givenScope;
  var injector = makeInjectorWithDirectives('myDirective', function() {
    return {
      scope: {
        myAttr: '=*'
      },
      link: function(scope) {
        givenScope = scope;
      }
    }; 
  });
  injector.invoke(function($compile, $rootScope) {
    $rootScope.parentFunction = function() {
      return [1, 2, 3];
    };
    var el = $('<div my-directive my-attr="parentFunction()"></div>');
    $compile(el)($rootScope);
    $rootScope.$digest();
    expect(givenScope.myAttr).toEqual([1, 2, 3]);
  }); 
});
```
我们需要再次扩展我们的解析函数。它应该有一个可选的星号在双向数据绑定的符号`=`后面：
```
/\s*([@<]|=(\*?))(\??)\s*(\w*)\s*/
```
现在有效地匹配表达式的开头，像`@`或者`<`或者`=`和可选的`*`。使用这个正则表达式，`parseIsolateBindings`可以填充`collection`标识在绑定，基于是否看到了星号。
注意，我们需要再次调整匹配的索引：
```js
function parseIsolateBindings(scope) {
  var bindings = {};
  _.forEach(scope, function(definition, scopeName) {
    var match = definition.match(/\s*([@<]|=(\*?))(\??)\s*(\w*)\s*/);
    bindings[scopeName] = {
    mode: match[1][0],
    collection: match[2] === '*',
    optional: match[3],
    attrName: match[4] || scopeName
    }; 
  });
  return bindings;
}
```
现在我们基于`collection`标识简单的来选择使用`$watch`或者`$watchCollection`。实现剩下的部分可以保持不变：
```js
case :'=':
	// ...
	if (definition.collection) {
      unwatch = scope.$watchCollection(attrs[attrName], parentValueWatch);
    } else {
      unwatch = scope.$watch(parentValueWatch);
    }
    break;
```
注意到`$watchCollection`情况我们注册我们的函数作为listener 函数而不是watch函数。这主要是因为`$watchCollection`不支持忽略listener函数就像`$watch`。
这是好的，因为我们真的不需要做任何工作，指向同一个数组或者对象：因为我们赋值引用相同的数组和对象，任何突变在它都是自动"同步"。只有当父节点开始指向一个新数组
或者对象时候，我们才需要做出反应，这时listener函数才会触发。

这就是双向数据绑定！