/**
 * @author  https://github.com/silence717
 * @date on 2017/1/5
 */
import parse from './parse';
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
});
