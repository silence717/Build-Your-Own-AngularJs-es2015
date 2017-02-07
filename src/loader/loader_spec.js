/**
 * @author  https://github.com/silence717
 * @date on 2017/2/7
 */

import setupModuleLoader from './loader';

describe('setupModuleLoader', () => {
	it('exposes angular on the window', () => {
		setupModuleLoader(window);
		expect(window.angular).toBeDefined();
	});
});
