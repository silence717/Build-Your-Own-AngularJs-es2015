## Hash Keys And Hash Maps
我们在这里实现的第一个函数叫做`hashKey`。这个函数需要任意的JavaScript作为参数并且返回一个字符串"哈希key"。目的与Java的`Object.hashCode()`和Ruby的`Object#hash`相似，
例如：一个值的hash key是唯一的标识，并且任何类型的值不能有相同的hash key。我们马上在hash map实现使用`hashKey`函数的使用。

hash key和hash map的实现将在一个叫做`src/hash_map`的新文件中实现。相应的测试文件将在`test/hash_map`中。我们开始实现`hashKey`。

一般的，值的hash key有两部分：第一部分支出值的类型，第二部分指定值的字符串表示形式。两部分使用分号分隔。对于`undefined`的值，这两部分都将是`undefined`:
```js
var hashKey = require('../src/hash_map').hashKey;
describe('hash', function () {
	'use strict';
	describe('hashKey', function() {
		it('is undefined:undefined for undefined', function() {
			expect(hashKey(undefined)).toEqual('undefined:undefined');
		});
	});
});
```
对于`null`值，类型是`object`，字符串展现为`null`:
```js
it('is object:null for null', function() {
  expect(hashKey(null)).toEqual('object:null');
});
```
对于布尔值，类型是`boolean`，字符串展现为`true`或者`false`:
```js
it('is boolean:true for true', function() {
  expect(hashKey(true)).toEqual('boolean:true');
});
it('is boolean:false for false', function() {
  expect(hashKey(false)).toEqual('boolean:false');
});
```
对于数字，类型是`number`，字符串展现仅仅是把数字当作字符串：
```js
it('is number:42 for 42', function() {
  expect(hashKey(42)).toEqual('number:42');
});
```
对于字符串，类型是`string`，字符串展现是 - 没有什么特别的 - 就是字符串。这里就是为什么需要将类型编码为hash key。否则对于数字`42`和字符串`42`他们的hash key将是相同的：
```js
it('is string:42 for "42"', function() {
  expect(hashKey('42')).toEqual('string:42');
});
```
目前所有的测试用一个`hashKey`简单的实现就可满足，第一部分使用`typeof`原酸符获取value的类型，并且强迫值的第二部分使用字符串展现：
```js
'use strict';
function hashKey(value) {
  var type = typeof value;
  return type + ':' + value;
}
module.exports = {hashKey: hashKey};
```
当我们开始处理函数和对象（和数组），东西开始变得有趣了。一般的，一个对象的hashKey由字符串`object`第一部分，和唯一的标识符第二部分组成：
```js
it('is object:[unique id] for objects', function() {
  expect(hashKey({})).toMatch(/^object:\S+$/);
});
```
我们应该期望hashKey是稳定的，所以当对相同的对象生成两次值都是一样的：
```js
it('is the same key when asked for the same object many times', function() {
  var obj = {};
  expect(hashKey(obj)).toEqual(hashKey(obj));
});
```
然而有趣的是，即使在两次调用`hashKey`中间对象发生改变，它的hashKey是稳定的：
```js
it('does not change when object value changes', function() {
  var obj = {a: 42};
  var hash1 = hashKey(obj);
  obj.a = 43;
  var hash2 = hashKey(obj);
  expect(hash1).toEqual(hash2);
});
```
这意味着`hashKey`函数不使用语义值生成一个对象的hash key，但它是对象的标识。这也意味着不同的对象有相同的值，但是不会有相同的hash 值：
```js
it('is not the same for different objects even with the same value', function() {
  var obj1 = {a: 42};
  var obj2 = {a: 42};
  expect(hashKey(obj1)).not.toEqual(hashKey(obj2));
});
```
对于函数，在这个章节中我们将它放在hash map中，同样的规则使用。函数的hash key是一个字符串`function`后面跟一个数字标识：
```js
it('is function:[unique id] for functions', function() {
  var fn = function(a) { return a; };
  expect(hashKey(fn)).toMatch(/^function:\S+$/);
});
```
多次访问同一的函数得到的hash key是相同的：
```js
it('is the same key when asked for the same function many times', function() {
  var fn = function() { };
  expect(hashKey(fn)).toEqual(hashKey(fn));
});
```
即使两个函数一模一样，但是他们的hash key是不同的：
```js
it('is not the same for different identical functions', function() {
  var fn1 = function() { return 42; };
  var fn2 = function() { return 42; };
  expect(hashKey(fn1)).not.toEqual(hashKey(fn2));
});
```
所以`hashKey`函数不是严格的一个hash key功能，与Java和Ruby的方法也是一样的。在功能和复合数据结构的情况下，这仅仅是一个基于对象独特的标识而不是值。

为了这种能够实现，给一个对象或者函数，`hashKey`实际上在它上面形成一个特殊的属性`$$hashKey`,持有对象唯一的id(在`hashKey`返回值的冒号后面)。如果你使用了Angular
的某些指令，你可能看到这些key出现在对象上，例如`ngRepeat`。
```js
it('stores the hash key in the $$hashKey attribute', function() {
  var obj = {a: 42};
  var hash = hashKey(obj);
  expect(obj.$$hashKey).toEqual(hash.match(/^object:(\S+)$/)[1]);
});
```
如果给定的对象已经存在`$$hashKey`，它的值将会代替生成的。这就是值如何保持稳定：
```js
it('uses preassigned $$hashKey', function() {
  expect(hashKey({$$hashKey: 42})).toEqual('object:42');
});
```
我们需要对`hashKey`函数使用分支处理对象和非对象的不同情况。在对象（或者函数）情况下，我们将会查找`$$hashKey`属性，如果需要，使用唯一标识符填充它。
我们使用来自LoDash的唯一id生成器函数：
```js
'use strict';
var _ = require('lodash');
function hashKey(value) {
    var type = typeof value;
    var uid;
    if (type === 'function' ||
         (type === 'object' && value !== null)) {
      uid = value.$$hashKey;
      if (uid === undefined) {
        uid = value.$$hashKey = _.uniqueId();
      }
    } else {
      uid = value;
    }
    return type + ':' + uid;
}
```
最后，如果你想在给对象生成hash keys的时候插入自己的行为，你可以预先指定一个函数作为`$$hashKey`属性值。如果Angular在这里看到一个函数，它将会作为一个方法来调用
获取具体的hash key:
```js
it('supports a function $$hashKey', function() {
  expect(hashKey({$$hashKey: _.constant(42)})).toEqual('object:42');
});
it('calls the function $$hashKey as a method with the correct this', function() {
  expect(hashKey({
    myKey: 42,
    $$hashKey: function() {
      return this.myKey;
    }
  })).toEqual('object:42');
});
```
为此我们需要在测试文件引入LoDash:
```js
'use strict';
var _ = require('lodash');
var hashKey = require('../src/hash_map').hashKey;
```
这种实现需要对`$$hashKey`做一个`typeof`检测，并且如果是一个函数的话作为方法调用它：
```js
function hashKey(value) {
  var type = typeof value;
  var uid;
  if (type === 'function' ||
       (type === 'object' && value !== null)) {
    uid = value.$$hashKey;
    if (typeof uid === 'function') {
      uid = value.$$hashKey();
    } else if (uid === undefined) {
          uid = value.$$hashKey = _.uniqueId();
        }
    } else {
    uid = value;
        }
  return type + ':' + uid;
}
```
随着`hashKey`现在考虑完，我们去实现hash map。一个Angular的hash map是使用`HashMap`构造函数创建的一个对象。它实现一个关联的数据结构，并且key值可以是任何类型。
就像它的远亲，`Java HashMap`，它支持`put`和`get`方法：
```js
'use strict';
var _ = require('lodash');
var hashKey = require('../src/hash_map').hashKey;
var HashMap = require('../src/hash_map').HashMap;
describe('hash', function() {
  describe('hashKey', function() {
///
  });
  describe('HashMap', function() {
    it('supports put and get of primitives', function() {
      var map = new HashMap();
      map.put(42, 'fourty two');
      expect(map.get(42)).toEqual('fourty two');
    });
  });
});
```
我们期望`HashMap`的核心语义就像我们刚才定义的`hashKey`。那就是，对象标识不一样，不是值：
```js
it('supports put and get of objects with hashKey semantics', function() {
  var map = new HashMap();
  var obj = {};
  map.put(obj, 'my value');
  expect(map.get(obj)).toEqual('my value');
  expect(map.get({})).toBeUnde ned();
});
```
`put`和`get`的实现非常简单因为我们已经有了`hashKey`。由于通过`hashKey`返回的值都是字符串，实际上使用`HashMap`存储的可以是一个合格的JavaScript对象。
而不是一个单独的的存储对象，我们将使用`HashMap`的实例化本身：
```js
function HashMap() {
}
HashMap.prototype = {
  put: function(key, value) {
    this[hashKey(key)] = value;
  },
  get: function(key) {
    return this[hashKey(key)];
  }
};
module.exports = {
  hashKey: hashKey,
  HashMap: HashMap
};
```
作为这一实现的副产品，注意到你也可以通过属性访问器（`map[‘number:42’]`）直接访问一个hash map的内容,尽管他可能不是一个好主意去依赖应用程序代码。

第三个也是最后一个`HashMap`支持的方法是`remove`。它用于从map中移除掉一个键值对：
```js
it('supports remove', function() {
  var map = new HashMap();
  map.put(42, 'fourty two');
  map.remove(42);
  expect(map.get(42)).toBeUndefined();
});
```
`remove`方法返回刚刚移除掉的键的值，以方便使用：
```js
it('returns value from remove', function() {
  var map = new HashMap();
  map.put(42, 'fourty two');
  expect(map.remove(42)).toEqual('fourty two');
});
```
在`remove`的实现中，我们从给定的key值获取hash key，并且使用`delete`操作符从基础的存储中移除它：
```js
HashMap.prototype = {
  put: function(key, value) {
    this[hashKey(key)] = value;
  },
  get: function(key) {
    return this[hashKey(key)];
  },
    remove: function(key) {
      key = hashKey(key);
      var value = this[key];
      delete this[key];
      return value;
    }
};
```