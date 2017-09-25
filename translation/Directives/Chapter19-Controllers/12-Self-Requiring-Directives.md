## Self-Requiring Directives
当一个指令定义了自己的controller，但是没有引入其他指令的controller，它接收自己的controller对象作为第四个参数到它的link函数。这就好像指令引入自己 - 一个方便的小功能：
```js
it('requires itself if there is no explicit require', function() {
    function MyController() { }
    var gotMyController;
    var injector = createInjector(['ng', function($compileProvider) {
        $compileProvider.directive('myDirective', function() {
            return {
                scope: {},
                controller: MyController,
                link: function(scope, element, attrs, myController) {
                    gotMyController = myController;
                }
            };
        });
    }]);
    injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(gotMyController).toBeDefined();
        expect(gotMyController instanceof MyController).toBe(true);
    });
});
```
"requiring itself"指令实际上发生了什么。指令定义一旦注册，如果它没有一个`require`属性，但是有一个`controller`属性，`require`属性的值设置为指令本身的名称。这使得指令自己的controller被查找，通过我们的测试用例：
```js
function getDirectiveRequire(directive, name) {
	const require = directive.require || (directive.controller && name);
	if (!_.isArray(require) && _.isObject(require)) {
		_.forEach(require, (value, key) => {
			if (!value.length) {
				require[key] = key;
			}
		});
	}
	return require;
}
```
现在当调用`getDirectiveRequire`我们仅仅只需要传递指令名称：
```js
directive.require = getDirectiveRequire(directive, name);
```