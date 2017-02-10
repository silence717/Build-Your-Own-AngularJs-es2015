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
	it('loads multiple modules', () => {
		const module1 = window.angular.module('myModule', []);
		const module2 = window.angular.module('myOtherModule', []);
		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);
		const injector = createInjector(['myModule', 'myOtherModule']);

		expect(injector.has('aConstant')).toBe(true);
		expect(injector.has('anotherConstant')).toBe(true);
	});
	it('loads the required modules of a module', () => {
		const module1 = window.angular.module('myModule', []);
		const module2 = window.angular.module('myOtherModule', ['myModule']);

		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);

		const injector = createInjector(['myOtherModule']);

		expect(injector.has('aConstant')).toBe(true);
		expect(injector.has('anotherConstant')).toBe(true);
	});
	it('loads the transitively required modules of a module', () => {
		const module1 = window.angular.module('myModule', []);
		const module2 = window.angular.module('myOtherModule', ['myModule']);
		const module3 = window.angular.module('myThirdModule', ['myOtherModule']);
		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);
		module3.constant('aThirdConstant', 44);
		const injector = createInjector(['myThirdModule']);

		expect(injector.has('aConstant')).toBe(true);
		expect(injector.has('anotherConstant')).toBe(true);
		expect(injector.has('aThirdConstant')).toBe(true);
	});
	it('loads each module only once', () => {
		window.angular.module('myModule', ['myOtherModule']);
		window.angular.module('myOtherModule', ['myModule']);
		createInjector(['myModule']);
	});
});
