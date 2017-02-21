## Making a Configurable Provider: Digest TTL
现在我们在provider中包裹了`$rootScope`，我们可以给它实现一些可配置的功能。回到第一章我们引入了digest TTL的概念，在不稳定的情况下抛出异常前我们需要做的digest次数。
我们设置TTL为常量10，但是它应该可以被应用开发者配置。这是对provider的使用。

用户可以使用`$rootScopeProvider`的配置方法去设置TTL。我们在`scope_spec.js`总添加一个新测试块给它：
```js
describe('TTL con gurability', function() {
	beforeEach(function() {
		publishExternalAPI();
	});
	it('allows con guring a shorter TTL', function() {
		var injector = createInjector(['ng', function($rootScopeProvider) {
			$rootScopeProvider.digestTtl(5);
		}]);
		var scope = injector.get('$rootScope');
		scope.counterA = 0;
		scope.counterB = 0;
		scope.$watch(
			function(scope) { return scope.counterA; },
			function(newValue, oldValue, scope) {
				if (scope.counterB < 5) {
					scope.counterB++;
				}
			} );
		scope.$watch(
			function(scope) { return scope.counterB; },
			function(newValue, oldValue, scope) {
				scope.counterA++;
			}
		);
		expect(function() { scope.$digest(); }).toThrow();
	});
});
```
这是我们对第一章对TTL测试的改变，我们又有两个相互依赖的watchers，但是当它达到5的时候，我们停止其中一个计数器的增加。使用默认的TTL值10不会出现这个问题。

但是我们没有使用默认的TTL值。代替的是，我们配置`$rootScopeProvider`(在一个函数模块)TTL是5。这应该引起digest抛出一个异常。

在`$rootScopeProvider`我们现在需要引入这个方法。它设置一个本地变量叫做`TTL`,它的默认值是10：
```js
function $RootScopeProvider() {
    var TTL = 10;
    this.digestTtl = function(value) {
      if (_.isNumber(value)) {
        TTL = value;
      }
      return TTL;
    };
    // ...
}
```
注意到方法也可以用于获取当前TTL的值。

在`$digest`我们听过使用TTL的值代替一个hard-code的值是10：
```js
Scope.prototype.$digest = function() {
	var ttl = TTL;
	var dirty;
	this.$root.$$lastDirtyWatch = null;
	this.$beginPhase('$digest');
	if (this.$root.$$applyAsyncId) {
		clearTimeout(this.$$applyAsyncId);
		this.$$ ushApplyAsync();
	}
	do {
		while (this.$$asyncQueue.length) {
			try {
				var asyncTask = this.$$asyncQueue.shift();
				asyncTask.scope.$eval(asyncTask.expression);
			} catch (e) {
				console.error(e);
			}
		}
		dirty = this.$$digestOnce();
		if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
			throw TTL + ' digest iterations reached';
		}
	} while (dirty || this.$$asyncQueue.length);
	this.$clearPhase();
	while (this.$$postDigestQueue.length) {
		try {
			this.$$postDigestQueue.shift()();
		} catch (e) {
			console.error(e);
		}
	}
};
```
现在我们可以更清楚地看到provider抽象化非常有用。作为应用程序开发人员，我们可以配置`$rootscope`没有访问入口的代码，并且不需要再去使用装饰器复写什么。
`$rootscopeprovider`提供了一个API配置`$rootscope`的TTL。如果我们有长链的依赖wathers，我们可以把它设置为高于10的数字。
如果我们想执行较少的digest提高性能的原因,我们也可以设置它的数目低于10。