## Promises in AngularJS
Angular也实现了Promises,在内置的`$q`服务。Angular的paomises是仿照Q库（因此名字是`$q`），可以认为是Q剥离下来的一个版本。

`$q`服务符合 Promises/A+。它和原生的ES6 Promise的使用方法非常相似，正如我们在本章看到的一样。

当和其他 Promise 比较也许最重要的区别就是`$q`集成了脏检查循环。在 Angular 循环中`$q`发生任何变化，你不需要担心调用`scope.$apply`。此外，许多 Promise 库使用
`setTimeout`去让事情异步，`$q`简单的使用`$evalAsync`。