/**
 * @author  https://github.com/silence717
 * @date on 2017/2/7
 */

import setupModuleLoader from './loader';

describe('setupModuleLoader', () => {

	beforeEach(() => {
		// 为每个单元测试提供干净的基础，不受任何全局angular的干扰
		delete window.angular;
	});
	it('exposes angular on the window', () => {
		setupModuleLoader(window);
		expect(window.angular).toBeDefined();
	});
	it('creates angular just once', () => {
		setupModuleLoader(window);
		const ng = window.angular;
		setupModuleLoader(window);
		expect(window.angular).toBe(ng);
	});
});
