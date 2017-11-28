## Introducing A Test Helper
在我们进一步讨论之前，我们可以做一件事，使单元测试在本章中不再重复。这里的单元测试的一般模式是：
1. 注册一个指令
2. 编译一个DOM片段
3. 收集属性对象
4. 在上面运行一些检测。

我们可以在`describe`里面为属性引入一个帮助函数，让它们的大部分可以工作：
```js
function registerAndCompile(dirName, domString, callback) {
	let givenAttrs;
	const injector = makeInjectorWithDirectives(dirName, function () {
		return {
			restrict: 'EACM',
			compile: function (element, attrs) {
				givenAttrs = attrs;
			}
		};
	});
	injector.invoke(function ($compile) {
		const el = $(domString);
		$compile(el);
		callback(el, givenAttrs);
	});
}
```
这个函数需要三个参数：一个注册指令的名字，一个需要解析和编译的DOM字符串，还有一个当这些完成的回调。这个回调接收元素和属性对象作为参数:
```js
it('passes the element attributes to the compile function', function() {
    registerAndCompile(
      'myDirective',
      '<my-directive my-attr="1" my-other-attr="two"></my-directive>',
      function(element, attrs) {
        expect(attrs.myAttr).toEqual('1');
        expect(attrs.myOtherAttr).toEqual('two');
      }
    );
});
it('trims attribute values', function() {
    registerAndCompile(
      'myDirective',
      '<my-directive my-attr=" val "></my-directive>',
      function(element, attrs) {
        expect(attrs.myAttr).toEqual('val');
      }
    );
});
```