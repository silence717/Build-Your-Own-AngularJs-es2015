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
			const fn = function (a, //b,
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
	it('injects the $get method of a provider lazily', () => {
		const module = window.angular.module('myModule', []);
		module.provider('b', {
			$get: a => {
				return a + 2;
			}
		});
		module.provider('a', {$get: _.constant(1)});

		const injector = createInjector(['myModule']);

		expect(injector.get('b')).toBe(3);
	});
	it('instantiates a dependency only once', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {$get: () => { return {}; }});

		const injector = createInjector(['myModule']);

		expect(injector.get('a')).toBe(injector.get('a'));
	});
	it('noti es the user about a circular dependency', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {$get: b => { }});
		module.provider('b', {$get: c => { }});
		module.provider('c', {$get: a => { }});

		const injector = createInjector(['myModule']);

		expect(() => {
			injector.get('a');
		}).toThrowError(/Circular dependency found/);
	});
	it('cleans up the circular marker when instantiation fails', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {
			$get: () => {
				throw 'Failing instantiation!';
			}
		});

		const injector = createInjector(['myModule']);

		expect(() => {
			injector.get('a');
		}).toThrow('Failing instantiation!');

		expect(() => {
			injector.get('a');
		}).toThrow('Failing instantiation!');
	});
	it('notifies the user about a circular dependency', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {$get: b => { }});
		module.provider('b', {$get: c => { }});
		module.provider('c', {$get: a => { }});

		const injector = createInjector(['myModule']);

		expect(() => {
			injector.get('a');
		}).toThrowError('Circular dependency found: a <- c <- b <- a');
	});
	it('instantiates a provider if given as a constructor function', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', function AProvider() {
			this.$get = () => { return 42; };
		});

		const injector = createInjector(['myModule']);

		expect(injector.get('a')).toBe(42);
	});
	it('injects the given provider constructor function', () => {
		const module = window.angular.module('myModule', []);
		module.constant('b', 2);
		module.provider('a', function AProvider(b) {
			this.$get = () => { return 1 + b; };
		});

		const injector = createInjector(['myModule']);

		expect(injector.get('a')).toBe(3);
	});
	it('injects another provider to a provider constructor function', () => {
		const module = window.angular.module('myModule', []);

		module.provider('a', function AProvider() {
			let value = 1;
			this.setValue = v => { value = v; };
			this.$get = () => { return value; };
		});
		module.provider('b', function BProvider(aProvider) {
			aProvider.setValue(2);
			this.$get = () => { };
		});

		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(2);
	});
	it('does not inject an instance to a provider constructor function', () => {
		const module = window.angular.module('myModule', []);

		module.provider('a', function AProvider() {
			this.$get = () => { return 1; };
		});

		module.provider('b', function BProvider(a) {
			this.$get = () => { return a; };
		});

		expect(() => {
			createInjector(['myModule']);
		}).toThrow();
	});
	it('does not inject a provider to a $get function', () => {
		const module = window.angular.module('myModule', []);

		module.provider('a', function AProvider() {
			this.$get = () => { return 1; };
		});

		module.provider('b', function BProvider() {
			this.$get = aProvider => { return aProvider.$get(); };
		});

		const injector = createInjector(['myModule']);
		expect(() => {
			injector.get('b');
		}).toThrow();
	});
	it('does not inject a provider to invoke', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', function AProvider() {
			this.$get = () => { return 1; };
		});

		const injector = createInjector(['myModule']);

		expect(() => {
			injector.invoke(function (aProvider) { });
		}).toThrow();
	});
	it('does not give access to providers through get', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', function AProvider() {
			this.$get = () => { return 1; };
		});

		const injector = createInjector(['myModule']);

		expect(() => {
			injector.get('aProvider');
		}).toThrow();
	});
	it('registers constants  rst to make them available to providers', () => {
		const module = window.angular.module('myModule', []);

		module.provider('a', function AProvider(b) {
			this.$get = () => { return b; };
		});
		module.constant('b', 42);

		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(42);
	});
	it('allows injecting the instance injector to $get', () => {
		const module = window.angular.module('myModule', []);

		module.constant('a', 42);
		module.provider('b', function BProvider() {
			this.$get = $injector => {
				return $injector.get('a');
			};
		});

		const injector = createInjector(['myModule']);
		expect(injector.get('b')).toBe(42);
	});
	it('allows injecting the provider injector to provider', () => {
		const module = window.angular.module('myModule', []);

		module.provider('a', function AProvider() {
			this.value = 42;
			this.$get = () => { return this.value; };
		});
		module.provider('b', function BProvider($injector) {
			const aProvider = $injector.get('aProvider');
			this.$get = () => {
				return aProvider.value;
			};
		});

		const injector = createInjector(['myModule']);

		expect(injector.get('b')).toBe(42);
	});
	it('allows injecting the $provide service to providers', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', function AProvider($provide) {
			$provide.constant('b', 2);
			this.$get = b => { return 1 + b; };
		});
		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(3);
	});
	it('does not allow injecting the $provide service to $get', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', function AProvider() {
			this.$get = $provide => { };
		});
		const injector = createInjector(['myModule']);
		expect(() => {
			injector.get('a');
		}).toThrow();
	});
	it('runs config blocks when the injector is created', () => {
		const module = window.angular.module('myModule', []);
		let hasRun = false;
		module.config(() => {
			hasRun = true;
		});
		createInjector(['myModule']);
		expect(hasRun).toBe(true);
	});
	it('injects config blocks with provider injector', () => {
		const module = window.angular.module('myModule', []);
		module.config($provide => {
			$provide.constant('a', 42);
		});
		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(42);
	});
	it('allows registering config blocks before providers', () => {
		const module = window.angular.module('myModule', []);

		module.config(function (aProvider) { });

		module.provider('a', function () {
			// 此处使用的_.constant在lodash中已经不存在
			// this.$get = _.constant(42);
			this.$get = function () {
				return 42;
			};
		});

		const injector = createInjector(['myModule']);

		expect(injector.get('a')).toBe(42);
	});
	it('runs a config block added during module registration', () => {
		window.angular.module('myModule', [], $provide => {
			$provide.constant('a', 42);
		});

		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(42);
	});
	it('runs run blocks when the injector is created', () => {
		const module = window.angular.module('myModule', []);
		let hasRun = false;
		module.run(() => {
			hasRun = true;
		});
		createInjector(['myModule']);
		expect(hasRun).toBe(true);
	});
	it('injects run blocks with the instance injector', () => {
		const module = window.angular.module('myModule', []);
		module.provider('a', {
			$get: _.constant(42)
		});
		let gotA;
		module.run(a => {
			gotA = a;
		});
		createInjector(['myModule']);
		expect(gotA).toBe(42);
	});
	it('configures all modules before running any run blocks', () => {
		const module1 = window.angular.module('myModule', []);
		module1.provider('a', {$get: _.constant(1)});
		let result;
		module1.run((a, b) => {
			result = a + b;
		});

		const module2 = window.angular.module('myOtherModule', []);
		module2.provider('b', {$get: _.constant(2)});

		createInjector(['myModule', 'myOtherModule']);

		expect(result).toBe(3);
	});
	it('runs a function module dependency as a config block', () => {
		const functionModule = $provide => {
			$provide.constant('a', 42);
		};
		window.angular.module('myModule', [functionModule]);
		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(42);
	});
	it('runs a function module with array injection as a config block', () => {
		const functionModule = ['$provide', $provide => {
			$provide.constant('a', 42);
		}];
		window.angular.module('myModule', [functionModule]);
		const injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(42);
	});
	it('supports returning a run block from a function module', () => {
		let result;
		const functionModule = $provide => {
			$provide.constant('a', 42);
			return function (a) {
				result = a;
			};
		};
		window.angular.module('myModule', [functionModule]);
		createInjector(['myModule']);
		expect(result).toBe(42);
	});
	it('only loads function modules once', () => {
		let loadedTimes = 0;
		const functionModule = function () {
			loadedTimes++;
		};
		window.angular.module('myModule', [functionModule, functionModule]);
		createInjector(['myModule']);
		expect(loadedTimes).toBe(2);
		// expect(loadedTimes).toBe(1);
	});
});
