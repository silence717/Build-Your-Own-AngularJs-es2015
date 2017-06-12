## URL Parameters
我们已经看到了如何使用`$http`去发生信息给服务器有三部分：请求URL，请求headers,和请求body。给HTTP请求添加信息的最后一种方式，我们看一下是URL查询参数。
这个是，键值对将被添加在URL的`?`后面例如：`?a=1&b=2`。

当然，我们当前的实现已经可以使用查询参数，因为你可以添加他们到HTTP的URL字符串。但在序列化参数和记录分隔符有点麻烦，所以你可能要比Angular做的更多。如果你在request
配置里使用`params`属性可以这么做：
```js
it('adds params to URL', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: 42 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info?a=42');
});
```
实现已经非常聪明，如果URL字符本身已经有参数，仅仅只是将`params`拼接到后面：
```js
it('adds additional params to URL', function() {
  $http({
    url: 'http://teropa.info?a=42',
    params: {
      b: 42 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info?a=42&b=42');
});
```
在`$http`里，在我们把请求给到HTTP backend之前，我们现在构建请求的URL使用两个帮助函数叫做`serializeParams`和`buildUrl`。第一个需要一个request参数，并且将他们
序列化到一个字符串，第二个将请求URL与序列化的参数结合：
```js
var url = buildUrl(config.url, serializeParams(config.params));
$httpBackend(
  config.method,
  url,
  reqData,
  done,
  config.headers,
  config.withCredentials
);
```
让我们继续创建这些函数。`serializeParams`遍历所有的参数对象并且为每个参数生成字符串。字符串包含key和value以等号分割。当函数遍历了所有的参数，它将使用`&`符号去组合：
```js
function serializeParams(params) {
  var parts = [];
  _.forEach(params, function(value, key) {
    parts.push(key + '=' + value);
  });
  return parts.join('&');
}
```
`buildUrl`函数将序列化的参数拼接到URL里。它检查是否应该使用`?`或`&`基于URL字符串已经包含的分隔符：
```js
function buildUrl(url, serializedParams) {
  if (serializedParams.length) {
    url += (url.indexOf('?') === -1) ? '?' : '&';
    url += serializedParams;
  }
  return url; 
}
```
一些URL参数他们中包含字符，直接拼接到URL是不安全的。包含像`=`和`&`的字符会让参数分隔符比较困惑。由于这个原因，参数的名称何止在被拼接之前需要转义：
```js
it('escapes url characters in params', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      '==': '&&' 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info?%3D%3D=%26%26');
});
```
我们可以使用JavaScript内置的`encodeURIComponent`函数去做转义：
```js
function serializeParams(params) {
  var parts = [];
  _.forEach(params, function(value, key) {
    parts.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(value));
  });
  return parts.join('&');
}
```
如果有的参数值为`null`或者`undefined`，他们不会出现在结果的URL中：
```js
it('does not attach null or undefined params', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: null,
      b: undefined 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info');
});
```
我们仅仅需要在循环中添加对这两个值的检测，并在其值匹配时候跳过这个参数：
```js
function serializeParams(params) {
  var parts = [];
  _.forEach(params, function(value, key) {
  	if (_.isNull(value) || _.isUndefined(value)) {
      return; 
  	}
    parts.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(value));
  });
  return parts.join('&');
}
```
HTTP支持查询参数中哥顶的参数名有多个值。这是通过重复每个值的名字来完成。Angular也支持一个参数有多个值，当你使用一个数组作为参数值的时候：
```js
it('attaches multiple params from arrays', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: [42, 43] 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info?a=42&a=43');
});
```
在我们遍历每个参数值的内部有一个循环。为了简单起见，我们将对所有参数进行此操作，只需包装不属于数组的任何参数值：
```js
function serializeParams(params) {
  var parts = [];
  _.forEach(params, function(value, key) {
  	if (_.isNull(value) || _.isUndefined(value)) {
      return; 
  	}
  	if (!_.isArray(value)) {
      value = [value];
    }
    _.forEach(value, function(v) {
    parts.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(v));
    });
    parts.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(value));
  });
  return parts.join('&');
}
```
因此当数组被当作参数的值使用时有一个特殊的意义。但是对于Object呢？默认情况下，HTTP不支持"嵌套参数"，所以对于对象只是序列化到JSON（然后URL转义）。因此，它其实
可以在查询参数传递一些JSON，如果服务器准备将它反序列化：
```js
it('serializes objects to json', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: {b: 42} 
    }
  });
  
  expect(requests[0].url).toBe('http://teropa.info?a=%7B%22b%22%3A42%7D');
});
```
在我们的value循环中，我们应该检测如果value是一个对象，那么把它序列化：
```js
_.forEach(value, function(v) {
    if (_.isObject(v)) {
      v = JSON.stringify(v);
    }
    parts.push(url += encodeURIComponent(key) + '=' + encodeURIComponent(v));
});
```
JSON序列化也支持Date,由于JavaScript日期使用`JSON.stringify`将会转为ISO 8601字符表达式。为了确保这一点，我们可以添加下面的测试，应该立即通过：
```js
it('serializes dates to ISO strings', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: new Date(2015, 0, 1, 12, 0, 0)
    }
  });
  $rootScope.$apply();
  expect(/\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}/
    .test(requests[0].url)).toBeTruthy();
});
```
这是默认情况下URL参数序列化的工作方式。但是作为一个应用程序用户，实际上你也可以用自己的方法来代替这个。你可能会添加一个`paramSerializer`key到request配置，
或者预定义`$http`的默认配置。它应该是一个函数，需要一个参数对象，并且返回序列的话参数字符串。它本质上与`serializeParams`函数具有相同的功能:
```js
it('allows substituting param serializer', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: 42,
      b: 43 
    },
    paramSerializer: function(params) {
        return _.map(params, function(v, k) {
          return k + '=' + v + 'lol';
        }).join('&');
      } 
  });
  expect(requests[0].url).toEqual('http://teropa.info?a=42lol&b=43lol');
});  
```
因此，当构建URL的时候，我们使用request配置的`paramSerializer`函数代替直接调用`serializeParams`函数：
```js
var url = buildUrl(config.url,config.paramSerializer(config.params));
$httpBackend(
  config.method,
  url,
  reqData,
  done,
  config.headers,
  config.withCredentials
);
```
在defaults里面，我们设置默认之前实现的`serializeParams`函数。这是如果没有其他设置的时候，我们想要使用的：
```js
var defaults = this.defaults = {
  // ...
  paramSerializer: serializeParams
};
```
当形成每个实际的request配置，我们应该更新默认的参数序列化：
```js
function $http(requestConfig) {
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest,
    transformResponse: defaults.transformResponse,
    paramSerializer: defaults.paramSerializer
  }, requestConfig);
  // ...
}
```
其实这里实际上有多种方式去提高你自己的参数序列化：你可以在依赖注入中创建一个，然后只需要在request配置中引用它的名字。这里有一个使用工厂自定义的序列化：
```js
it('allows substituting param serializer through DI', function() {
  var injector = createInjector(['ng', function($provide) {
    $provide.factory('mySpecialSerializer', function() {
      return function(params) {
        return _.map(params, function(v, k) {
          return k + '=' + v + 'lol';
        }).join('&');
      };
    }); 
  }]);
  injector.invoke(function($http) {
    $http({
      url: 'http://teropa.info',
      params: {
        a: 42,
        b: 43 
      },
      paramSerializer: 'mySpecialSerializer'
    });
    
    expect(requests[0].url).toEqual('http://teropa.info?a=42lol&b=43lol');
  });
});
```
我们在`$http`服务中需要使用`$injector`，因此让我们注入它：
```js
this.$get = ['$httpBackend', '$q', '$rootScope', '$injector',
              function($httpBackend, $q, $rootScope, $injector) {
  // ...
}];
```
在`$http`函数中我们可以使用`$injector`去获取参数序列化函数，如果配置中的 paramSerializer 仅仅是一个字符串：
```js
function $http(requestConfig) {
  var config = _.extend({
    method: 'GET',
    transformRequest: defaults.transformRequest,
    transformResponse: defaults.transformResponse,
    paramSerializer: defaults.paramSerializer
  }, requestConfig);
  config.headers = mergeHeaders(requestconfig);
  if (_.isString(config.paramSerializer)) {
    config.paramSerializer = $injector.get(config.paramSerializer);
  }
  // ...
}
```
事实上，默认的参数序列化本身在依赖注入是有效的，名叫`httpParamSerializer`。这意味着你可以使用他达到其他目的或者装饰它：
```js
it('makes default param serializer available through DI', function() {
  var injector = createInjector(['ng']);
  injector.invoke(function($httpParamSerializer) {
    var result = $httpParamSerializer({a: 42, b: 43});
    expect(result).toEqual('a=42&b=43');
  });
});
```
在`http.js`我们可以改变`serializeParams`以便于它不在是个顶级函数，而是一个新provider的返回值：
```js
function $HttpParamSerializerProvider() {
  this.$get = function() {
    return function serializeParams(params) {
        var parts = [];
        _.forEach(params, function(value, key) {
          if (_.isNull(value) || _.isUndefined(value)) {
            return;
          }
          if (!_.isArray(value)) {
            value = [value];
          }
          _.forEach(value, function(v) {
            if (_.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
          });
    });
    return parts.join('&');
    }; 
  };
}  
```
我们也需要更改`http.js`的export，因为现在不只一个HTTP provider，这个新的provider也需要export：
```js
module.exports = {
  $HttpProvider: $HttpProvider,
  $HttpParamSerializerProvider: $HttpParamSerializerProvider
};
```
然后我们需要在`ng`模块中注册这个provider：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',require('./http').$HttpParamSerializerProvider);
}
```
在`$http`的默认配置，我们现在要引用默认序列化的名字由于我们不在有独立的`serializeParams`函数：
```js
var defaults = this.defaults = {
  // ...
  paramSerializer: '$httpParamSerializer'
};
```
Angular提供了一个可选择的`$httpParamSerializer`：代替默认的，你可以使[jQuery compatible ](http://api.jquery.com/jquery.param/)有效通过使用`$httpParamSerialzerJQLike `序列化。
如果你已经构建了一个现有的后端去consume jQuery序列化标案，或者你仅仅需要发送嵌套的数据而不使用JSON，这个是非常有用的。

我们将看到，它使用一个特殊的方式序列化集合，但是对于原始类型，和默认的序列化完全一致：
```js
describe('JQ-like param serialization', function() {
  it('is possible', function() {
    $http({
      url: 'http://teropa.info',
      params: {
        a: 42,
        b: 43 
      },
      paramSerializer: '$httpParamSerializerJQLike'
    });
    
    expect(requests[0].url).toEqual('http://teropa.info?a=42&b=43');
  });
});
```
这个序列化在`http.js`中的定义另一个provider：
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      var parts = [];
      _.forEach(params, function(value, key) {
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(value));
      });
      return parts.join('&');
    };
  }; 
}
```
这个provider也需要被export:
```js
module.exports = {
  $HttpProvider: $HttpProvider,
  $HttpParamSerializerProvider: $HttpParamSerializerProvider,
  $HttpParamSerializerJQLikeProvider: $HttpParamSerializerJQLikeProvider
};
```
然后这个也需要注册到`ng`模块：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',require('./http').$HttpParamSerializerProvider);
  ngModule.provider('$httpParamSerializerJQLike',require('./http').$HttpParamSerializerJQLikeProvider);
}
```
`null`和`value`值也被这个序列化跳过：
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      var parts = [];
      _.forEach(params, function(value, key) {
        if (_.isNull(value) || _.isUndefined(value)) {
        return; }
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(value));
      });
      return parts.join('&');
    };
  }; 
}
```
这个序列化不同于默认的地方，我们看一下它如何处理数组。它给参数名后边拼接一个方括号`[]`从一个数组的值开始。
```js
it('uses square brackets in arrays', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: [42, 43] 
    },
    paramSerializer: '$httpParamSerializerJQLike'
  });
  
  expect(requests[0].url).toEqual('http://teropa.info?a%5B%5D=42&a%5B%5D=43');
});
```
当URL编码的时候开始方括号会变成`%5B`,结束方括号会变成`%5D`。

下面是如何处理数组的情况：
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      var parts = [];
      _.forEach(params, function(value, key) {
        if (_.isNull(value) || _.isUndefined(value)) {
          return; 
        }
        if (_.isArray(value)) {
          _.forEach(value, function(v) {
        parts.push(
              encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v));
          });
        } else {
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
      });
      return parts.join('&');
    };
  }; 
}
```
序列化对象时，方括号也用到了。与数组不同的是，这里对象中使用的key放在方括号中间：
```js
it('uses square brackets in objects', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: {b: 42, c: 43}
    },
    paramSerializer: '$httpParamSerializerJQLike'
  });
  
  expect(requests[0].url).toEqual('http://teropa.info?a%5Bb%5D=42&a%5Bc%5D=43');
});
```
我们在对象自己的`else if`分支中处理对象。虽然日期也是对象，从序列化的角度来看，我们把它们当做原始类型来处理。出于这个原因，我们为它们添加一个特殊的检测：
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      var parts = [];
      _.forEach(params, function(value, key) {
        if (_.isNull(value) || _.isUndefined(value)) {
          return; 
        }
        if (_.isArray(value)) {
          _.forEach(value, function(v) {
        parts.push(
              encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v));
          });
        } else if (_.isObject(value) && !_.isDate(value)) {
            _.forEach(value, function(v, k) {
              parts.push(
                encodeURIComponent(key + '[' + k + ']') + '=' +
                encodeURIComponent(v));
            });
        } else {
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
      });
      return parts.join('&');
    };
  }; 
}
```
这些方括号前缀也递归工作，所以当你有嵌套对象，方括号会为每个重复，因此`{a: {b: {c: 42}}}`会变成`a[b][c]=42`：
```js
it('supports nesting in objects', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: {b: {c: 42}}
    },
    paramSerializer: '$httpParamSerializerJQLike'
  });
  
  expect(requests[0].url).toEqual('http://teropa.info?a%5Bb%5D%5Bc%5D=42');
});
```
我们需要让我们的实现递归，这样我们可以支持任意层级的嵌套。让我们重构我们的实现，因此使用一个内部`serialize`函数，它需要一个拼接到key的前缀，并且递归地调用它自己
去拼接更多信息到前缀。没有东西添加到`parts`数组直到叶子水平的值（例如不再是数组或者对象）:
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
        var parts = [];
        function serialize(value, prefix) {
          if (_.isNull(value) || _.isUndefined(value)) {
            return; 
          }
          if (_.isArray(value)) {
            _.forEach(value, function(v) {
              serialize(v, prefix + '[]');
            });
          } else if (_.isObject(value) && !_.isDate(value)) {
            _.forEach(value, function(v, k) {
              serialize(v, prefix + '[' + k + ']');
            });
          } else {
            parts.push(
              encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
          }
        }
        _.forEach(params, function(value, key) {
          if (_.isNull(value) || _.isUndefined(value)) {
        return; }
          if (_.isArray(value)) {
            _.forEach(value, function(v) {
        serialize(v, key + '[]');
          });
        } else if (_.isObject(value) && !_.isDate(value)) {
          _.forEach(value, function(v, k) {
        serialize(v, key + '[' + k + ']');
        });
        } else {
                  parts.push(
                    encodeURIComponent(key) + '=' +
                    encodeURIComponent(value));
        } });
              return parts.join('&');
            };
        }; 
}
```
这样非常好，但是我们现在有很多重复的代码。我们对于一级参数对象和嵌套值有着相同的逻辑。这两种情况唯一不同的就是方括号语法不用于一级对象。

如果我们引入一个`topLevel`标识到`serialize`，我们可以摆脱重复。我们仅仅通过传递一级参数对象到`serialize`并设置标识为`true`。当这个标识为`true`，
我们不拼接方括号到对象的key中的：
```js
function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      var parts = [];
        function serialize(value, prefix, topLevel) {
        if (_.isNull(value) || _.isUndefined(value)) {
        return; }
        if (_.isArray(value)) {
          _.forEach(value, function(v) {
            serialize(v, prefix + '[]');
          });
        } else if (_.isObject(value) && !_.isDate(value)) {
          _.forEach(value, function(v, k) {
             serialize(v, prefix +
                     (topLevel ? '' : '[') +
                     k+
                    (topLevel ? '' : ']'));
        });
        } else {
            parts.push(
              encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
        } }
        serialize(params, '', true);
        return parts.join('&');
    };
  }; 
}
```
最后，如果数组中的项本身是对象（或者嵌套数组），我们在方括号中间标识数组的索引，因此`{a: [{b: 42}]}`不是`a[][b]=42`但是`a[0][b]=42`:
```js
it('appends array indexes when items are objects', function() {
  $http({
    url: 'http://teropa.info',
    params: {
      a: [{b: 42}]
    },
    paramSerializer: '$httpParamSerializerJQLike'
  });
  
  expect(requests[0].url).toEqual('http://teropa.info?a%5B0%5D%5Bb%5D=42');
});   
```
在这种情况下我们可以使用循环的下标放在方括号里：
```js
function $HttpParamSerializerJQLikeProvider() {
	this.$get = function() {
		return function(params) {
			const parts = [];
			function serialize(value, prefix, topLevel) {
				if (_.isNull(value) || _.isUndefined(value)) {
					return;
				}
				if (_.isArray(value)) {
					_.forEach(value, function (v, i) {
						serialize(v, prefix + '[' + (_.isObject(v) ? i : '') + ']');
					});
				} else if (_.isObject(value)) {
					_.forEach(value, function (v, k) {
						serialize(v, prefix + (topLevel ? '' : '[') + k + (topLevel ? '' : ']'));
					});
				} else {
					parts.push(encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
				}
			}
			serialize(params, '', true);
			return parts.join('&');
		};
	};
}
```
