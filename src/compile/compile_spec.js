/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-15
 */
import _ from 'lodash';
import $ from 'jquery';
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

function makeInjectorWithDirectives() {
	const args = arguments;
	return createInjector(['ng', function ($compileProvider) {
		$compileProvider.directive.apply($compileProvider, args);
	}]);
}

describe('$compile', () => {
	
	beforeEach(() => {
		delete window.angular;
		publishExternalAPI();
	});
	
	it('allows creating directives', () => {
		const myModule = window.angular.module('myModule', []);
		myModule.directive('testing', () => { });
		const injector = createInjector(['ng', 'myModule']);
		expect(injector.has('testingDirective')).toBe(true);
	});
	
	it('allows creating many directives with the same name', () => {
		const myModule = window.angular.module('myModule', []);
		myModule.directive('testing', _.constant({d: 'one'}));
		myModule.directive('testing', _.constant({d: 'two'}));
		const injector = createInjector(['ng', 'myModule']);
		
		const result = injector.get('testingDirective');
		expect(result.length).toBe(2);
		expect(result[0].d).toEqual('one');
		expect(result[1].d).toEqual('two');
	});
	
	it('does not allow a directive called hasOwnProperty', () => {
		const myModule = window.angular.module('myModule', []);
		myModule.directive('hasOwnProperty', function () { });
		expect(function () {
			createInjector(['ng', 'myModule']);
		}).toThrow();
	});
	
	it('allows creating directives with object notation', () => {
		const myModule = window.angular.module('myModule', []);
		myModule.directive({
			a: function () { },
			b: function () { },
			c: function () { }
		});
		const injector = createInjector(['ng', 'myModule']);
		
		expect(injector.has('aDirective')).toBe(true);
		expect(injector.has('bDirective')).toBe(true);
		expect(injector.has('cDirective')).toBe(true);
	});
	
	it('compiles element directives from a single element', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<my-directive></my-directive>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles element directives from child elements', () => {
		let idx = 1;
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', idx++);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div><my-directive></my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBeUndefined();
			expect(el.find('> my-directive').data('hasCompiled')).toBe(1);
		});
	});
	
	it('compiles nested directives', () => {
		let idx = 1;
		const injector = makeInjectorWithDirectives('myDir', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', idx++);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<my-dir><my-dir><my-dir></my-dir></my-dir></my-dir>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(1);
			expect(el.find('> my-dir').data('hasCompiled')).toBe(2);
			expect(el.find('> my-dir > my-dir').data('hasCompiled')).toBe(3);
		});
	});
	
	_.forEach(['x', 'data'], prefix => {
		_.forEach([':', '-', '_'], delim => {
			it('compiles element directives with ' + prefix + delim + ' prefix', () => {
				const injector = makeInjectorWithDirectives('myDir', () => {
					return {
						compile: function(element) {
							element.data('hasCompiled', true);
						}
					};
				});
				injector.invoke(function($compile) {
					const el = $('<' + prefix + delim + 'my-dir></' + prefix + delim + 'my-dir>');
					$compile(el);
					expect(el.data('hasCompiled')).toBe(true);
				});
			});
		});
	});
	
	it('compiles attribute directives', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles attribute directives with pre xes', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function($compile) {
			const el = $('<div x:my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles several attribute directives in an element', () => {
		const injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function() {
				return {
					compile: function(element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			const el = $('<div my-directive my-second-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
			expect(el.data('secondCompiled')).toBe(true);
		});
	});
	
	it('compiles both element and attributes directives in an element', () => {
		const injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					compile: function (element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function($compile) {
			const el = $('<my-directive my-second-directive></my-directive>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
			expect(el.data('secondCompiled')).toBe(true);
		});
	});
	
	it('compiles attribute directives with ng-attr pre x', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div ng-attr-my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles attribute directives with data:ng-attr prefix', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div data:ng-attr-my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
});
