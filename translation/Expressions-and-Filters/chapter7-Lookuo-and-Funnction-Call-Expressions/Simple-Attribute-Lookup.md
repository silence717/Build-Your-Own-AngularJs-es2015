## 简单的属性查找
最简单的scope属性访问你可以做的是使用名字查找东西：表达式`aKey`从scope对象找到`aKey`属性并返回它：
```js
it('looks up an attribute from the scope', function() {
  var fn = parse('aKey');
  expect(fn({aKey: 42})).toBe(42);
  expect(fn({})).toBeUnde ned();
});
```