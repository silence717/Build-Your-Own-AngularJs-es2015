/**
 * @author  https://github.com/silence717
 * @date on 2017/2/8
 */
'use strict';
import setupModuleLoader from '../loader/loader';
import createInjector from './injector';
describe('injector', () => {
	beforeEach(() => {
		delete window.angular;
		setupModuleLoader(window);
	});
	it('can be created', () => {
		const injector = createInjector([]);
		expect(injector).toBeDefined();
	});
	it('has a constant that has been registered to a module', () => {
		const module = window.angular.module('myModule', []);
		module.constant('aConstant', 42);
		const injector = createInjector(['myModule']);
		expect(injector.has('aConstant')).toBe(true);
	});
	it('does not have a non-registered constant', () => {
		window.angular.module('myModule', []);
		const injector = createInjector(['myModule']);
		expect(injector.has('aConstant')).toBe(false);
	});
	it('does not allow a constant called hasOwnProperty', () => {
		const module = window.angular.module('myModule', []);
		module.constant('hasOwnProperty', false);
		expect(() => {
			createInjector(['myModule']);
		}).toThrow();
	});
	it('can return a registered constant', () => {
		const module = window.angular.module('myModule', []);
		module.constant('aConstant', 42);
		const injector = createInjector(['myModule']);
		expect(injector.get('aConstant')).toBe(42);
	});
});
