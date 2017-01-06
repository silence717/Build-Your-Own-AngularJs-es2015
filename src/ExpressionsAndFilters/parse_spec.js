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
});
