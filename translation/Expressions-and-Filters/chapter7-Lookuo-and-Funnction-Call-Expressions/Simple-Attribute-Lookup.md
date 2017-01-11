## 简单的属性查找
最简单的scope属性访问你可以做的是使用名字查找东西：表达式`aKey`从scope对象找到`aKey`属性并返回它：
```js
it('looks up an attribute from the scope', function() {
  var fn = parse('aKey');
  expect(fn({aKey: 42})).toBe(42);
  expect(fn({})).toBeUnde ned();
});
```

Notice how the functions returned by parse actually take a JavaScript object as an argument. That object is almost always an instance of Scope, which the expression will access or manipulate. It doesn’t necessarily have to be a Scope though, and in unit tests we can just use plain object liter- als. Since literal expressions don’t do anything with scopes we haven’t used this argument before, but that will change in this chapter. In fact, the first change we should make is to add this argu- ment to the generated, compiled expression function. We’ll call it s:

```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);
  /* jshint -W054 */
return new Function('s', this.state.body.join(''));
  /* jshint +W054 */
};
```