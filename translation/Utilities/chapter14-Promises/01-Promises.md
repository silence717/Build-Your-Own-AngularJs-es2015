## Promises
Promises 在确定的情况下试图解决这些问题。他们本质上是僵异步调用将来的结果捆绑到对象的一种机制。异步函数不返回值，
但是promises在某些点上会有一个值。一旦它成为可用的，Promise对象将访问该值。

Promises解决业务逻辑的回调方法从常规函数参数分离回调参数。你的函数没有回调，它返回一个需要回调的Promise：
```js
computeBalance(from, to).then(function(balance) {
  // ...
});
```
Promises通过支持链接解决"金字塔毁灭"问题。注册一个Promise回调返回一个新Promise，允许一个链，扁平控制：
```js
computeBalance(a, b)
  .then(storeBalance)
  .then(displayResults);
```
Promises 通过一个明确的API解决临时错误的处理：
```
computeBalance(a, b)
  .then(storeBalance)
  .catch(handleError);
```
错误会扩大Promise链，所以任何一步的错误可以在同一个错误中捕获 - 就像`try..catch`在同步代码中处理发生的任意错误，不管函数调用的深度：
```
computeBalance(a, b)
  .then(storeBalance)
  .then(displayResults)
  .catch(handleError);
```
