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
});
