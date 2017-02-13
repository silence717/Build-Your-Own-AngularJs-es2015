/**
 * @author  https://github.com/silence717
 * @date on 2017/2/8
 */
'use strict';
import setupModuleLoader from '../loader/loader';
import createInjector from './injector';
import _ from 'lodash';
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
	it('invokes an annotated function with dependency injection', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		const fn = (one, two) => { return one + two; };
		fn.$inject = ['a', 'b'];
		expect(injector.invoke(fn)).toBe(3);
	});
	it('does not accept non-strings as injection tokens', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		const injector = createInjector(['myModule']);

		const fn = (one, two) => { return one + two; };
		fn.$inject = ['a', 2];

		expect(() => {
			injector.invoke(fn);
		}).toThrow();
	});
	xit('invokes a function with the given this context', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		const injector = createInjector(['myModule']);

		const obj = {
			two: 2,
			fn: one => { return one + this.two; }
		};

		obj.fn.$inject = ['a'];
		expect(injector.invoke(obj.fn, obj)).toBe(3);
	});
	it('overrides dependencies with locals when invoking', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		const fn = (one, two) => { return one + two; };
		fn.$inject = ['a', 'b'];

		expect(injector.invoke(fn, undefined, {b: 3})).toBe(4);
	});

	describe('annotate', () => {
		it('returns the $inject annotation of a function when it has one', () => {
			const injector = createInjector([]);
			const fn = () => { };
			fn.$inject = ['a', 'b'];
			expect(injector.annotate(fn)).toEqual(['a', 'b']);
		});
		it('returns the array-style annotations of a function', () => {
			const injector = createInjector([]);
			const fn = ['a', 'b', () => { }];
			expect(injector.annotate(fn)).toEqual(['a', 'b']);
		});
		it('returns an empty array for a non-annotated 0-arg function', () => {
			const injector = createInjector([]);
			const fn = () => { };
			expect(injector.annotate(fn)).toEqual([]);
		});
		it('returns annotations parsed from function args when not annotated', () => {
			const injector = createInjector([]);
			const fn = (a, b) => { };
			expect(injector.annotate(fn)).toEqual(['a', 'b']);
		});
		it('strips comments from argument lists when parsing', () => {
			const injector = createInjector([]);
			const fn = (a, /*b,*/ c) => { };
			expect(injector.annotate(fn)).toEqual(['a', 'c']);
		});
		it('strips // comments from argument lists when parsing', () => {
			const injector = createInjector([]);
			const fn = function(a, //b,
							  c) { };
			expect(injector.annotate(fn)).toEqual(['a', 'c']);
		});
		it('strips surrounding underscores from argument names when parsing', () => {
			const injector = createInjector([]);
			const fn = (a, _b_, c_, _d, an_argument) => { };
			expect(injector.annotate(fn)).toEqual(['a', 'b', 'c_', '_d', 'an_argument']);
		});
		it('throws when using a non-annotated fn in strict mode', () => {
			const injector = createInjector([], true);
			const fn = (a, b, c) => { };
			expect(() => {
				injector.annotate(fn);
			}).toThrow();
		});
	});
	it('invokes an array-annotated function with dependency injection', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);
		const fn = ['a', 'b', (one, two) => { return one + two; }];
		expect(injector.invoke(fn)).toBe(3);
	});
	it('invokes a non-annotated function with dependency injection', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);
		const fn = (a, b) => { return a + b; };
		expect(injector.invoke(fn)).toBe(3);
	});
	it('instantiates an annotated constructor function', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		function Type(one, two) {
			this.result = one + two;
		}

		Type.$inject = ['a', 'b'];
		const instance = injector.instantiate(Type);
		expect(instance.result).toBe(3);
	});
	it('instantiates an array-annotated constructor function', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		function Type(one, two) {
			this.result = one + two;
		}

		const instance = injector.instantiate(['a', 'b', Type]);
		expect(instance.result).toBe(3);
	});
	it('instantiates a non-annotated constructor function', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		function Type(a, b) {
			this.result = a + b;
		}

		const instance = injector.instantiate(Type);
		expect(instance.result).toBe(3);
	});
	it('uses the prototype of the constructor when instantiating', () => {
		function BaseType() { }
		BaseType.prototype.getValue = _.constant(42);

		function Type() {
			this.v = this.getValue();
		}
		Type.prototype = BaseType.prototype;

		window.angular.module('myModule', []);
		const injector = createInjector(['myModule']);

		const instance = injector.instantiate(Type);
		expect(instance.v).toBe(42);
	});
	it('supports locals when instantiating', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		const injector = createInjector(['myModule']);

		function Type(a, b) {
			this.result = a + b;
		}

		const instance = injector.instantiate(Type, {b: 3});
		expect(instance.result).toBe(4);
	});
	it('allows registering a provider and uses its $get', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {
			$get: () => {
				return 42;
			}
		});

		const injector = createInjector(['myModule']);

		expect(injector.has('a')).toBe(true);
		expect(injector.get('a')).toBe(42);
	});
	it('injects the $get method of a provider', () => {
		const module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.provider('b', {
			$get: a => {
				return a + 2;
			}
		});

		const injector = createInjector(['myModule']);
		expect(injector.get('b')).toBe(3);
	});
});
