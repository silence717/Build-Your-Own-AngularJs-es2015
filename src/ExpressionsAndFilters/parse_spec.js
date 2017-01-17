/**
 * @author  https://github.com/silence717
 * @date on 2017/1/5
 */
import parse from './parse';
import _ from 'lodash';
describe('parse', () => {
	// 可以解析整数
	it('can parse an integer', () => {
		const fn = parse('42');
		expect(fn).toBeDefined();
		expect(fn()).toBe(42);
	});
	// 可以解析浮点数
	it('can parse a floating point number', () => {
		const fn = parse('4.2');
		expect(fn()).toBe(4.2);
	});
	// 可以解析浮点数，整数部分为0
	it('can parse a floating point number without an integer part', () => {
		const fn = parse('.42');
		expect(fn()).toBe(0.42);
	});
	// 可以解析科学计数法
	it('can parse a number in scientific notation', () => {
		const fn = parse('42e3');
		expect(fn()).toBe(42000);
	});
	// 科学计数法系数是浮点数
	it('can parse scientific notation with a float coefficient', () => {
		const fn = parse('.42e2');
		expect(fn()).toBe(42);
	});
	// 科学计数法指数为负数
	it('can parse scientific notation with negative exponents', () => {
		const fn = parse('4200e-2');
		expect(fn()).toBe(42);
	});
	// 科学计数法指数为通过加号标记为是正数
	it('can parse scientific notation with the + sign', () => {
		const fn = parse('.42e+2');
		expect(fn()).toBe(42);
	});
	// 科学计数法e可以为大写E
	it('can parse upper case scientific notation', () => {
		const fn = parse('.42E2');
		expect(fn()).toBe(42);
	});
	// 不解析无效的科学技术
	it('will not parse invalid scientific notation', () => {
		expect(() => { parse('42e-'); }).toThrow();
		expect(() => { parse('42e-a'); }).toThrow();
	});
	// 可以解析单引号字符串
	it('can parse a string in single quotes', () => {
		const fn = parse("'abc'");
		expect(fn()).toEqual('abc');
	});
	// 可以解析双引号字符串
	it('can parse a string in double quotes', () => {
		const fn = parse('"abc"');
		expect(fn()).toEqual('abc');
	});
	// 字符串开始和结束的引号应该保持一致，不同则抛出异常
	it('will not parse a string with mismatching quotes', () => {
		expect(() => { parse('"abc\''); }).toThrow();
	});
	// 可以解析里面含单引号的字符串
	it('can parse a string with single quotes inside', () => {
		const fn = parse("'a\\\'b'");
		expect(fn()).toEqual('a\'b');
	});
	// 可以解析里面含双引号的字符串
	it('can parse a string with double quotes inside', () => {
		const fn = parse('"a\\\"b"');
		expect(fn()).toEqual('a\"b');
	});
	// unicode本身为输入表达式
	it('will parse a string with unicode escapes', () => {
		const fn = parse('"\\u00A0"');
		expect(fn()).toEqual('\u00A0');
	});
	// u后面不是一个正确的unicode编码，需要抛出一个异常
	it('will not parse a string with invalid unicode escapes', () => {
		expect(() => { parse('"\\u00T0"'); }).toThrow();
	});
	// 可以解析null
	it('will parse null', () => {
		const fn = parse('null');
		expect(fn()).toBe(null);
	});
	// 可以解析true
	it('will parse true', () => {
		const fn = parse('true');
		expect(fn()).toBe(true);
	});
	// 可以解析false
	it('will parse false', () => {
		const fn = parse('false');
		expect(fn()).toBe(false);
	});
	// 忽略空格
	it('ignores whitespace', () => {
		const fn = parse(' \n42 ');
		expect(fn()).toEqual(42);
	});
	// 解析空数组
	it('will parse an empty array', () => {
		const fn = parse('[]');
		expect(fn()).toEqual([]);
	});
	// 解析非空数组
	it('will parse a non-empty array', () => {
		const fn = parse('[1, "two", [3], true]');
		expect(fn()).toEqual([1, 'two', [3], true]);
	});
	// 解析空对象
	it('will parse an empty object', () => {
		const fn = parse('{}');
		expect(fn()).toEqual({});
	});
	// 解析不为空的对象，key值为字符串
	it('will parse a non-empty object', () => {
		const fn = parse('{"a key": 1, \'another-key\': 2}');
		expect(fn()).toEqual({'a key': 1, 'another-key': 2});
	});
	// 可以解析一个对象，
	it('will parse an object with identifier keys', () => {
		const fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
		expect(fn()).toEqual({a: 1, b: [2, 3], c: {d: 4}});
	});
	// 查找scope的属性
	it('looks up an attribute from the scope', () => {
		const fn = parse('aKey');
		expect(fn({aKey: 42})).toBe(42);
		expect(fn({})).toBeUndefined();
	});
	// 从undefined里面查找属性返回undefined
	it('returns undefined when looking up attribute from undefined', () => {
		const fn = parse('aKey');
		expect(fn()).toBeUndefined();
	});
	// 解析this
	it('will parse this', () => {
		const fn = parse('this');
		const scope = {};
		expect(fn(scope)).toBe(scope);
		expect(fn()).toBeUndefined();
	});
	// 在scope中查找一个两层的identifier
	it('looks up a 2-part identifier path from the scope', () => {
		const fn = parse('aKey.anotherKey');
		expect(fn({aKey: {anotherKey: 42}})).toBe(42);
		expect(fn({aKey: {}})).toBeUndefined();
		expect(fn({})).toBeUndefined();
	});
	// 查找对象的一个成员
	it('looks up a member from an object', () => {
		const fn = parse('{aKey: 42}.aKey');
		expect(fn()).toBe(42);
	});
	// 在scope中查找一个4层的identifier
	it('looks up a 4-part identifier path from the scope', () => {
		const fn = parse('aKey.secondKey.thirdKey.fourthKey');
		expect(fn({aKey: {secondKey: {thirdKey: {fourthKey: 42}}}})).toBe(42);
		expect(fn({aKey: {secondKey: {thirdKey: {}}}})).toBeUndefined();
		expect(fn({aKey: {}})).toBeUndefined();
		expect(fn()).toBeUndefined();
	});
	// 匹配到key值的时候使用本地替代scope
	it('uses locals instead of scope when there is a matching key', () => {
		const fn = parse('aKey');
		const scope = {aKey: 42};
		const locals = {aKey: 43};
		expect(fn(scope, locals)).toBe(43);
	});
	// 匹配不到key值的时候不使用本地替代scope
	it('does not use locals instead of scope when no matching key', () => {
		const fn = parse('aKey');
		const scope = {aKey: 42};
		const locals = {otherKey: 43};
		expect(fn(scope, locals)).toBe(42);
	});
	it('uses locals instead of scope when the first part matches', () => {
		const fn = parse('aKey.anotherKey');
		const scope = {aKey: {anotherKey: 42}};
		const locals = {aKey: {}};
		expect(fn(scope, locals)).toBeUndefined();
	});
	it('will parse $locals', () => {
		let fn = parse('$locals');
		let scope = {};
		let locals = {};
		expect(fn(scope, locals)).toBe(locals);
		expect(fn(scope)).toBeUndefined();
		fn = parse('$locals.aKey');
		scope = {aKey: 42};
		locals = {aKey: 43};
		expect(fn(scope, locals)).toBe(43);
	});
	it('parses a simple computed property access', () => {
		const fn = parse('aKey["anotherKey"]');
		expect(fn({aKey: {anotherKey: 42}})).toBe(42);
	});
	it('parses a computed numeric array access', () => {
		const fn = parse('anArray[1]');
		expect(fn({anArray: [1, 2, 3]})).toBe(2);
	});
	it('parses a computed access with another key as property', () => {
		const fn = parse('lock[key]');
		expect(fn({key: 'theKey', lock: {theKey: 42}})).toBe(42);
	});
	it('parses computed access with another access as property', () => {
		const fn = parse('lock[keys["aKey"]]');
		expect(fn({keys: {aKey: 'theKey'}, lock: {theKey: 42}})).toBe(42);
	});
	it('parses a function call', () => {
		const fn = parse('aFunction()');
		expect(fn({aFunction: () => { return 42; }})).toBe(42);
	});
	it('parses a function call with a single number argument', () => {
		const fn = parse('aFunction(42)');
		expect(fn({aFunction: n => { return n; }})).toBe(42);
	});
	it('parses a function call with a single identifier argument', () => {
		const fn = parse('aFunction(n)');
		expect(fn({n: 42, aFunction: arg => { return arg; }})).toBe(42);
	});
	it('parses a function call with a single function call argument', () => {
		const fn = parse('aFunction(argFn())');
		expect(fn({
			argFn: _.constant(42),
			aFunction: arg => { return arg; }
		})).toBe(42);
	});
	it('parses a function call with multiple arguments', () => {
		const fn = parse('aFunction(37, n, argFn())');
		expect(fn({
			n: 3,
			argFn: _.constant(2),
			aFunction: (a1, a2, a3) => { return a1 + a2 + a3; }
		})).toBe(42);
	});
	it('calls methods accessed as computed properties', () => {
		const scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return this.aMember;
				}
			}
		};
		const fn = parse('anObject["aFunction"]()');
		expect(fn(scope)).toBe(42);
	});
	it('calls methods accessed as non-computed properties', () => {
		const scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return this.aMember;
				}
			}
		};
		const fn = parse('anObject.aFunction()');
		expect(fn(scope)).toBe(42);
	});
	it('binds bare functions to the scope', () => {
		const scope = {
			aFunction: function () {
				return this;
			}
		};
		const fn = parse('aFunction()');
		expect(fn(scope)).toBe(scope);
	});
	it('binds bare functions on locals to the locals', () => {
		const scope = {};
		const locals = {
			aFunction: function () {
				return this;
			}
		};
		const fn = parse('aFunction()');
		expect(fn(scope, locals)).toBe(locals);
	});
	it('parses a simple attribute assignment', () => {
		const fn = parse('anAttribute = 42');
		const scope = {};
		fn(scope);
		expect(scope.anAttribute).toBe(42);
	});
	it('can assign any primary expression', () => {
		const fn = parse('anAttribute = aFunction()');
		const scope = {aFunction: _.constant(42)};
		fn(scope);
		expect(scope.anAttribute).toBe(42);
	});
	it('can assign a computed object property', () => {
		const fn = parse('anObject["anAttribute"] = 42');
		const scope = {anObject: {}};
		fn(scope);
		expect(scope.anObject.anAttribute).toBe(42);
	});
	it('can assign a non-computed object property', () => {
		const fn = parse('anObject.anAttribute = 42');
		var scope = {anObject: {}};
		fn(scope);
		expect(scope.anObject.anAttribute).toBe(42);
	});
	it('can assign a nested object property', () => {
		const fn = parse('anArray[0].anAttribute = 42');
		const scope = {anArray: [{}]};
		fn(scope);
		expect(scope.anArray[0].anAttribute).toBe(42);
	});
	it('creates the objects in the assignment path that do not exist', () => {
		const fn = parse('some["nested"].property.path = 42');
		const scope = {};
		fn(scope);
		expect(scope.some.nested.property.path).toBe(42);
	});
});
