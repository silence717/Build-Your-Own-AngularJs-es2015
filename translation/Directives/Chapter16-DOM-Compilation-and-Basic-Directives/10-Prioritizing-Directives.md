## Prioritizing Directives
当多个指令用在同一个元素上时，不同顺序的应用他们会产生很大的不同。一个指令可能依赖另一个已经应用的指令产生的效果。

为了避免将正确应用指令顺序的责任落在应用开发者的肩上，Angular内部有一个内部优先级配置去控制应用的顺序。每一个指令定义对象有一个`priority`属性，对于每一个节点，
在编译之前所有匹配的指令都由这个属性进行排序。优先级是数字，数字越大意味着优先级越高 - 也就是说，编译时指令按照优先级降序排列。

体现到测试用例，这意味着有两个特定优先级的指令应用到一个元素上，它们是按照优先级顺序编译的：
```js
it('applies in priority order', function() {
  var compilations = [];
  var injector = makeInjectorWithDirectives({
    lowerDirective: function() {
      return {
        priority: 1,
        compile: function(element) {
          compilations.push('lower');
        }
      }; 
    },
    higherDirective: function() {
      return {
        priority: 2,
        compile: function(element) {
          compilations.push('higher');
        }
      }; 
    }
  });
  injector.invoke(function($compile) {
    var el = $('<div lower-directive higher-directive></div>');
    $compile(el);
    expect(compilations).toEqual(['higher', 'lower']);
  }); 
});
```
当两个指令有相同的优先级时，通过按名称比较来打破这种，这样即使优先级是相同的，应用程序的顺序是稳定的和可预测的：
```js
it('applies in name order when priorities are the same', function() {
  var compilations = [];
  var injector = makeInjectorWithDirectives({
     firstDirective: function() {
     	return {
            priority: 1,
            compile: function(element) {
              compilations.push(' rst');
            }
        }; 
     },
    secondDirective: function() {
      return {
        priority: 1,
        compile: function(element) {
          compilations.push('second');
        }
      }; 
    }
  });
  injector.invoke(function($compile) {
    var el = $('<div second-directive first-directive></div>');
    $compile(el);
    expect(compilations).toEqual(['first', 'second']);
  }); 
});
```
当两个指令优先级和名称都相同的时候，他们按照注册的顺序去应用：
```js
it('applies in registration order when names are the same', function() {
  var compilations = [];
  var myModule = window.angular.module('myModule', []);
  myModule.directive('aDirective', function() {
    return {
      priority: 1,
      compile: function(element) {
        compilations.push(' rst');
      }
    }; 
  });
  myModule.directive('aDirective', function() {
    return {
      priority: 1,
      compile: function(element) {
        compilations.push('second');
      }
    }; 
  });
  var injector = createInjector(['ng', 'myModule']);
  injector.invoke(function($compile) {
    var el = $('<div a-directive></div>');
    $compile(el);
    expect(compilations).toEqual([' rst', 'second']);
   }); 
});
```
一旦我们在`collectDirectives`里收集了给定元素的所有指令，在返回给调用者之前将结果排序。我们可以使用 JavaScript 数组的内置排序方法，并且引入的时候提供一个自定义比较函数：
```js
function collectDirectives(node) {
  var directives = [];
  // ...
  directives.sort(byPriority);
  return directives;
}
```
`byPriority`比较函数需要两个指令：
```js
function byPriority(a, b) {

}
```
函数主要查看指令的优先级，并返回负或正数，这取决于优先级的第一或者第二个更大("高")：
```js
function byPriority(a, b) {
  return b.priority - a.priority;
}
```
当优先级一样，通过比较名称打破顺序。我们使用`<`操作符，它比较字符串的字典顺序：
```js
function byPriority(a, b) {
    var diff = b.priority - a.priority;
    if (diff !== 0) {
      return diff;
    } else {
      return (a.name < b.name ? -1 : 1);
    }
}
```
为了获取指令名，我们引用它的`name`属性，这是我们目前还没有的东西。我们应该在指令注册的时候去设置它，在`$compileProvider.directive`方法：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.name = directive.name || name;
    return directive;
  });
}]);
```
作为最后的优先级规则，即使指令的名称匹配，我们也要使用注册顺序来打破：
```js
function byPriority(a, b) {
  var diff = b.priority - a.priority;
  if (diff !== 0) {
    return diff;
  } else {
    if (a.name !== b.name) {
      return (a.name < b.name ? -1 : 1);
    } else {
      return a.index - b.index;
    }
  } 
}
```
`index`属性也是我们现在没有的，我们也可以在指令注册过程中添加：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory, i) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.name = directive.name || name;
    directive.index = i;
    return directive;
  });
}]);
```
作为一个指令的作者你不需要每次都添加优先级。如果你没有给值，会使用默认值`0`:
```js
it('uses default priority when one not given', function() {
  var compilations = [];
  var myModule = window.angular.module('myModule', []);
  myModule.directive('firstDirective', function() {
    return {
      priority: 1,
      compile: function(element) {
        compilations.push(' rst');
      }
    }; 
  });
  myModule.directive('secondDirective', function() {
    return {
      compile: function(element) {
        compilations.push('second');
      }
    }; 
  });
  var injector = createInjector(['ng', 'myModule']);
  injector.invoke(function($compile) {
    var el = $('<div second-directive first-directive></div>');
    $compile(el);
    expect(compilations).toEqual(['first', 'second']);
  }); 
});
```
这也是需要我们在指令注册时设置的。我们使用定义的优先级或者0：
```js
$provide.factory(name + 'Directive', ['$injector', function($injector) {
  var factories = hasDirectives[name];
  return _.map(factories, function(factory, i) {
    var directive = $injector.invoke(factory);
    directive.restrict = directive.restrict || 'EA';
    directive.priority = directive.priority || 0;
    directive.name = directive.name || name;
    directive.index = i;
    return directive;
  });
}]);
```
