## Promise Implementations
Promise 作为一个概念从1970年有了，目前他们在 JavaScript 的lib中也好几年了。最著名的实现是`jQuery的Deffereds`和`Kris Kowal的Q库`。今天在JavaScript中也有几十个类似promise的库可用。

既然有这么多可供选择的库实现，他们也不断的魅力让这些之间库之间互通使用。这些努力的目标是让人们混合使用不同 Promise 实现的时候变得简单。最重要的是，
一个社区标准叫做`Promise/A+`定义一个规范和一个测试套件去观察 Promise `then`方法的行为是什么样。许多 Promise 库实现了这个标准。例如，Q是符合的，jQuery Deferred
从jQuery 3.0开始。

这里有一个 Promise 实现[built right into the JavaScript language](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)。
它是在es2015提案中定义，并且几个浏览器已经实现。一些较新的DOM API例如`Service Workers`支持原生的Promise。在写的时候，仍然会看到原生的 ES6 Promise 将会如何影响
已经存在的多个 Promise 库。