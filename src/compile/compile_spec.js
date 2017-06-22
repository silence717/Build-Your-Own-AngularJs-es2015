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
				restrict: 'EACM',
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
				restrict: 'EACM',
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
				restrict: 'EACM',
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
						restrict: 'EACM',
						compile: function (element) {
							element.data('hasCompiled', true);
						}
					};
				});
				injector.invoke(function ($compile) {
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
				restrict: 'EACM',
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
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div x:my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles several attribute directives in an element', () => {
		const injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
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
					restrict: 'EACM',
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			const el = $('<my-directive my-second-directive></my-directive>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
			expect(el.data('secondCompiled')).toBe(true);
		});
	});
	
	it('compiles attribute directives with ng-attr pre x', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				restrict: 'EACM',
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
				restrict: 'EACM',
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
	
	it('compiles class directives', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div class="my-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles several class directives in an element', () => {
		const injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			const el = $('<div class="my-directive my-second-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
			expect(el.data('secondCompiled')).toBe(true);
		});
	});
	
	it('compiles class directives with pre xes', () => {
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div class="x-my-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).toBe(true);
		});
	});
	
	it('compiles comment directives', () => {
		let hasCompiled;
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				restrict: 'EACM',
				compile: function (element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<!-- directive: my-directive -->');
			$compile(el);
			expect(hasCompiled).toBe(true);
		});
	});
	
	_.forEach({
		E: {element: true, attribute: false, class: false, comment: false},
		A: {element: false, attribute: true, class: false, comment: false},
		C: {element: false, attribute: false, class: true, comment: false},
		M: {element: false, attribute: false, class: false, comment: true},
		EA: {element: true, attribute: true, class: false, comment: false},
		AC: {element: false, attribute: true, class: true, comment: false},
		EAM: {element: true, attribute: true, class: false, comment: true},
		EACM: {element: true, attribute: true, class: true, comment: true}
	}, (expected, restrict) => {
		describe('restricted to ' + restrict, function () {
			_.forEach({
				element: '<my-directive></my-directive>',
				attribute: '<div my-directive></div>',
				class: '<div class="my-directive"></div>',
				comment: '<!-- directive: my-directive -->'
			}, (dom, type) => {
				it((expected[type] ? 'matches' : 'does not match') + ' on ' + type, () => {
					let hasCompiled = false;
					const injector = makeInjectorWithDirectives('myDirective', () => {
						return {
							restrict: restrict,
							compile: function (element) {
								hasCompiled = true;
							}
						};
					});
					injector.invoke(function ($compile) {
						const el = $(dom);
						$compile(el);
						expect(hasCompiled).toBe(expected[type]);
					});
				});
			});
		});
	});
	
	it('applies to attributes when no restrict given', () => {
		let hasCompiled = false;
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div my-directive></div>');
			$compile(el);
			expect(hasCompiled).toBe(true);
		});
	});
	
	it('applies to elements when no restrict given', () => {
		let hasCompiled = false;
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<my-directive></my-directive>');
			$compile(el);
			expect(hasCompiled).toBe(true);
		});
	});
	
	it('does not apply to classes when no restrict given', () => {
		let hasCompiled = false;
		const injector = makeInjectorWithDirectives('myDirective', () => {
			return {
				compile: function (element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div class="my-directive"></div>');
			$compile(el);
			expect(hasCompiled).toBe(false);
		});
	});
	
	it('applies in priority order', () => {
		const compilations = [];
		const injector = makeInjectorWithDirectives({
			lowerDirective: function () {
				return {
					priority: 1,
					compile: function (element) {
						compilations.push('lower');
					}
				};
			},
			higherDirective: function () {
				return {
					priority: 2,
					compile: function (element) {
						compilations.push('higher');
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			const el = $('<div lower-directive higher-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['higher', 'lower']);
		});
	});
	
	it('applies in name order when priorities are the same', () => {
		const compilations = [];
		const injector = makeInjectorWithDirectives({
			firstDirective: function () {
				return {
					priority: 1,
					compile: function (element) {
						compilations.push('first');
					}
				};
			},
			secondDirective: function () {
				return {
					priority: 1,
					compile: function (element) {
						compilations.push('second');
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			const el = $('<div second-directive  first-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['first', 'second']);
		});
	});
	
	it('applies in registration order when names are the same', () => {
		const compilations = [];
		const myModule = window.angular.module('myModule', []);
		myModule.directive('aDirective', function () {
			return {
				priority: 1,
				compile: function (element) {
					compilations.push('first');
				}
			};
		});
		myModule.directive('aDirective', function () {
			return {
				priority: 1,
				compile: function (element) {
					compilations.push('second');
				}
			};
		});
		const injector = createInjector(['ng', 'myModule']);
		injector.invoke(function ($compile) {
			const el = $('<div a-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['first', 'second']);
		});
	});
	
	it('uses default priority when one not given', () => {
		const compilations = [];
		const myModule = window.angular.module('myModule', []);
		myModule.directive('firstDirective', function () {
			return {
				priority: 1,
				compile: function (element) {
					compilations.push('first');
				}
			};
		});
		myModule.directive('secondDirective', function () {
			return {
				compile: function (element) {
					compilations.push('second');
				}
			};
		});
		const injector = createInjector(['ng', 'myModule']);
		injector.invoke(function ($compile) {
			const el = $('<div second-directive first-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['first', 'second']);
		});
	});
	
	
});
