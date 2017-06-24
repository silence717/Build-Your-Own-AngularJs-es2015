## Handling Boolean Attributes
HTML中的一些属性是所谓的布尔属性。一个例子是输入字段的`disabled`属性。布尔属性是特殊的，因为它们没有真正的值。他们仅仅存在于一个元素中就意味着他们应该被解释为“true”。

因为在JavaScript中我们有一个真和假的概念，如果我们能以一种方式只是布尔属性概念那么会变得很方便。事实上，我们可以做到。Angular强制设置布尔属性的值，在属性对象中他们一般为`true`：
```js
it('sets the value of boolean attributes to true', function() {
  registerAndCompile(
    'myDirective',
    '<input my-directive disabled>',
    function(element, attrs) {
      expect(attrs.disabled).toBe(true);
      } 
  );
});
```
但是重要的是，这种强制不会发生在你添加到的元素的旧属性上。它仅仅应用在标准的HTML里面定义的布尔型属性。其他的没有特殊待遇：
```js
it('does not set the value of custom boolean attributes to true', function() {
  registerAndCompile(
    'myDirective',
    '<input my-directive whatever>',
    function(element, attrs) {
      expect(attrs.whatever).toEqual('');
    }
  ); 
});
```
在`collectDirectives`，我们设置属性值到属性对象，如果认为这是一个布尔属性，我们应该仅仅使用值`true`:
```js
attrs[normalizedAttrName] = attr.value.trim();
if (isBooleanAttribute(node, normalizedAttrName)) {
  attrs[normalizedAttrName] = true;
}
```
一个新函数`isBooleanAttribute`检测两个东西：这个属性名称是不是标准布尔属性名称之一，以及元素名称是否使用布尔属性：
```js
function isBooleanAttribute(node, attrName) {
  return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
}
```
`BOOLEAN_ATTRS`常量包含标准化的标准布尔属性名称：
```js
var BOOLEAN_ATTRS = {
  multiple: true,
  selected: true,
  checked: true,
  disabled: true,
  readOnly: true,
  required: true,
  open: true 
};
```
`BOOLEAN_ELEMENTS`常量包含我们想要匹配的元素名称。名称是大写的，因为这是DOM宝盖节点名称的方式。
```js
var BOOLEAN_ELEMENTS = {
  INPUT: true,
  SELECT: true,
  OPTION: true,
  TEXTAREA: true,
  BUTTON: true,
  FORM: true,
  DETAILS: true
};
```