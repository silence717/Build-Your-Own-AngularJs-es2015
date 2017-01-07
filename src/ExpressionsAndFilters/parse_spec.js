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
});
