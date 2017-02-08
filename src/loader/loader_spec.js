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
	it('exposes the angular module function', () => {
		setupModuleLoader(window);
		expect(window.angular.module).toBeDefined();
	});
	it('exposes the angular module function just once', () => {
		setupModuleLoader(window);
		const module = window.angular.module;
		setupModuleLoader(window);
		expect(window.angular.module).toBe(module);
	});
	describe('modules', () => {

		beforeEach(() => {
			setupModuleLoader(window);
		});

		it('allows registering a module', () => {
			const myModule = window.angular.module('myModule', []);
			expect(myModule).toBeDefined();
			expect(myModule.name).toEqual('myModule');
		});

		it('replaces a module when registered with same name again', () => {
			const myModule = window.angular.module('myModule', []);
			const myNewModule = window.angular.module('myModule', []);
			expect(myNewModule).not.toBe(myModule);
		});

		it('attaches the requires array to the registered module', () => {
			const myModule = window.angular.module('myModule', ['myOtherModule']);
			expect(myModule.requires).toEqual(['myOtherModule']);
		});

		it('allows getting a module', () => {
			const myModule = window.angular.module('myModule', []);
			const gotModule = window.angular.module('myModule');

			expect(gotModule).toBeDefined();
			expect(gotModule).toBe(myModule);
		});

		it('throws when trying to get a nonexistent module', () => {
			expect(() => {
				window.angular.module('myModule');
			}).toThrow();
		});

	});
});

