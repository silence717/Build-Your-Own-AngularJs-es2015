/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-15
 */
import _ from 'lodash';
import $ from 'jquery';
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('$compile', () => {
	
	// 注册指令
	function makeInjectorWithDirectives() {
		const args = arguments;
		return createInjector(['ng', function ($compileProvider) {
			$compileProvider.directive.apply($compileProvider, args);
		}]);
	}
	
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
	
	it('compiles attribute directives with ng-attr prefix', () => {
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
	
	it('stops compiling at a terminal directive', () => {
		const compilations = [];
		const myModule = window.angular.module('myModule', []);
		myModule.directive('firstDirective', function () {
			return {
				priority: 1,
				terminal: true,
				compile: function (element) {
					compilations.push('first');
				}
			};
		});
		myModule.directive('secondDirective', function () {
			return {
				priority: 0,
				compile: function (element) {
					compilations.push('second');
				}
			};
		});
		const injector = createInjector(['ng', 'myModule']);
		injector.invoke(function ($compile) {
			const el = $('<div first-directive second-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['first']);
		});
	});
	
	it('still compiles directives with same priority after terminal', () => {
		const compilations = [];
		const myModule = window.angular.module('myModule', []);
		myModule.directive('firstDirective', function () {
			return {
				priority: 1,
				terminal: true,
				compile: function (element) {
					compilations.push('first');
				}
			};
		});
		myModule.directive('secondDirective', function () {
			return {
				priority: 1,
				compile: function (element) {
					compilations.push('second');
				}
			};
		});
		const injector = createInjector(['ng', 'myModule']);
		injector.invoke(function ($compile) {
			const el = $('<div first-directive second-directive></div>');
			$compile(el);
			expect(compilations).toEqual(['first', 'second']);
		});
	});
	
	it('stops child compilation after a terminal directive', () => {
		const compilations = [];
		const myModule = window.angular.module('myModule', []);
		myModule.directive('parentDirective', function () {
			return {
				terminal: true,
				compile: function (element) {
					compilations.push('parent');
				}
			};
		});
		myModule.directive('childDirective', function () {
			return {
				compile: function (element) {
					compilations.push('child');
				}
			};
		});
		const injector = createInjector(['ng', 'myModule']);
		injector.invoke(function ($compile) {
			const el = $('<div parent-directive><div child-directive></div></div>');
			$compile(el);
			expect(compilations).toEqual(['parent']);
		});
	});
	
	xit('allows applying a directive to multiple elements', () => {
		let compileEl = false;
		const injector = makeInjectorWithDirectives('myDir', function () {
			return {
				multiElement: true,
				compile: function (element) {
					compileEl = element;
				}
			};
		});
		injector.invoke(function ($compile) {
			const el = $('<div my-dir-start></div><span></span><div my-dir-end></div>');
			$compile(el);
			expect(compileEl.length).toBe(3);
		});
	});
	
	
	describe('attributes', () => {
		
		// 注册并编译
		function registerAndCompile(dirName, domString, callback) {
			let givenAttrs;
			const injector = makeInjectorWithDirectives(dirName, function () {
				return {
					restrict: 'EACM',
					compile: function (element, attrs) {
						givenAttrs = attrs;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $(domString);
				$compile(el);
				callback(el, givenAttrs, $rootScope);
			});
		}
		
		it('passes the element attributes to the compile function', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive my-attr="1" my-other-attr="two"></my-directive>',
				function (element, attrs) {
					expect(attrs.myAttr).toEqual('1');
					expect(attrs.myOtherAttr).toEqual('two');
				}
			);
		});
		
		it('trims attribute values', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive my-attr=" val "></my-directive>',
				function (element, attrs) {
					expect(attrs.myAttr).toEqual('val');
				}
			);
		});
		
		it('sets the value of boolean attributes to true', () => {
			registerAndCompile(
				'myDirective',
				'<input my-directive disabled>',
				function (element, attrs) {
					expect(attrs.disabled).toBe(true);
				}
			);
		});
		
		it('does not set the value of custom boolean attributes to true', () => {
			registerAndCompile(
				'myDirective',
				'<input my-directive whatever>',
				function (element, attrs) {
					expect(attrs.whatever).toEqual('');
				}
			);
		});
		
		it('overrides attributes with ng-attr- versions', () => {
			registerAndCompile(
				'myDirective',
				'<input my-directive ng-attr-whatever="42" whatever="41">',
				function (element, attrs) {
					expect(attrs.whatever).toEqual('42');
				}
			);
		});
		
		it('allows setting attributes', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive attr="true"></my-directive>',
				function (element, attrs) {
					attrs.$set('attr', 'false');
					expect(attrs.attr).toEqual('false');
				}
			);
		});
		
		it('sets attributes to DOM', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive attr="true"></my-directive>',
				function (element, attrs) {
					attrs.$set('attr', 'false');
					expect(element.attr('attr')).toEqual('false');
				}
			);
		});
		
		it('does not set attributes to DOM when flag is false', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive attr="true"></my-directive>',
				function (element, attrs) {
					attrs.$set('attr', 'false', false);
					expect(element.attr('attr')).toEqual('true');
				}
			);
		});
		
		it('shares attributes between directives', () => {
			let attrs1, attrs2;
			const injector = makeInjectorWithDirectives({
				myDir: function () {
					return {
						compile: function (element, attrs) {
							attrs1 = attrs;
						}
					};
				},
				myOtherDir: function () {
					return {
						compile: function (element, attrs) {
							attrs2 = attrs;
						}
					};
				}
			});
			injector.invoke(function ($compile) {
				const el = $('<div my-dir my-other-dir></div>');
				$compile(el);
				expect(attrs1).toBe(attrs2);
			});
		});
		
		it('sets prop for boolean attributes', () => {
			registerAndCompile(
				'myDirective',
				'<input my-directive>',
				function (element, attrs) {
					attrs.$set('disabled', true);
					expect(element.prop('disabled')).toBe(true);
				}
			);
		});
		
		it('sets prop for boolean attributes even when not flushing', () => {
			registerAndCompile(
				'myDirective',
				'<input my-directive>',
				function (element, attrs) {
					attrs.$set('disabled', true, false);
					expect(element.prop('disabled')).toBe(true);
				}
			);
		});
		
		it('denormalizes attribute name when explicitly given', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive some-attribute="42"></my-directive>',
				function (element, attrs) {
					attrs.$set('someAttribute', 43, true, 'some-attribute');
					expect(element.attr('some-attribute')).toEqual('43');
				}
			);
		});
		
		it('denormalizes attribute by snake-casing', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive some-attribute="42"></my-directive>',
				function (element, attrs) {
					attrs.$set('someAttribute', 43);
					expect(element.attr('some-attribute')).toEqual('43');
				}
			);
		});
		
		it('denormalizes attribute by using original attribute name', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive x-some-attribute="42"></my-directive>',
				function (element, attrs) {
					attrs.$set('someAttribute', '43');
					expect(element.attr('x-some-attribute')).toEqual('43');
				}
			);
		});
		
		it('does not use ng-attr- pre x in denormalized names', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive ng-attr-some-attribute="42"></my-directive>',
				function (element, attrs) {
					attrs.$set('someAttribute', 43);
					expect(element.attr('some-attribute')).toEqual('43');
				}
			);
		});
		
		it('uses new attribute name after once given', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive x-some-attribute="42"></my-directive>',
				function (element, attrs) {
					attrs.$set('someAttribute', 43, true, 'some-attribute');
					attrs.$set('someAttribute', 44);
					expect(element.attr('some-attribute')).toEqual('44');
					expect(element.attr('x-some-attribute')).toEqual('42');
				}
			);
		});
		
		it('calls observer immediately when attribute is $set', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive some-attribute="42"></my-directive>',
				function (element, attrs) {
					let gotValue;
					attrs.$observe('someAttribute', function (value) {
						gotValue = value;
					});
					attrs.$set('someAttribute', '43');
					
					setTimeout(function () {
						expect(gotValue).toEqual('43');
					}, 0);
				}
			);
		});
		
		it('calls observer on next $digest after registration', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive some-attribute="42"></my-directive>',
				function (element, attrs, $rootScope) {
					let gotValue;
					attrs.$observe('someAttribute', value => {
						gotValue = value;
					});
					$rootScope.$digest();
					expect(gotValue).toEqual('42');
				}
			);
		});
		
		xit('lets observers be deregistered', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive some-attribute="42"></my-directive>',
				function (element, attrs) {
					let gotValue;
					const remove = attrs.$observe('someAttribute', value => {
						gotValue = value;
					});
					
					attrs.$set('someAttribute', '43');
					expect(gotValue).toEqual('43');
					
					remove();
					attrs.$set('someAttribute', '44');
					expect(gotValue).toEqual('44');
				}
			);
		});
		
		it('adds an attribute from a class directive', () => {
			registerAndCompile(
				'myDirective',
				'<div class="my-directive"></div>',
				function (element, attrs) {
					expect(attrs.hasOwnProperty('myDirective')).toBe(true);
				}
			);
		});
		
		it('does not add attribute from class without a directive', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive class="some-class"></my-directive>',
				function (element, attrs) {
					expect(attrs.hasOwnProperty('someClass')).toBe(false);
				}
			);
		});
		
		it('supports values for class directive attributes', () => {
			registerAndCompile(
				'myDirective',
				'<div class="my-directive: my attribute value"></div>',
				function (element, attrs) {
					expect(attrs.myDirective).toEqual('my attribute value');
				}
			);
		});
		
		it('terminates class directive attribute value at semicolon', () => {
			registerAndCompile(
				'myDirective',
				'<div class="my-directive: my attribute value; some-other-class"></div>',
				function (element, attrs) {
					expect(attrs.myDirective).toEqual('my attribute value');
				}
			);
		});
		
		it('allows adding classes', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive></my-directive>',
				function (element, attrs) {
					attrs.$addClass('some-class');
					expect(element.hasClass('some-class')).toBe(true);
				}
			);
		});
		
		it('allows removing classes', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive class="some-class"></my-directive>',
				function (element, attrs) {
					attrs.$removeClass('some-class');
					expect(element.hasClass('some-class')).toBe(false);
				}
			);
		});
		
		it('allows updating classes', () => {
			registerAndCompile(
				'myDirective',
				'<my-directive class="one three four"></my-directive>',
				function (element, attrs) {
					attrs.$updateClass('one two three', 'one three four');
					expect(element.hasClass('one')).toBe(true);
					expect(element.hasClass('two')).toBe(true);
					expect(element.hasClass('three')).toBe(true);
					expect(element.hasClass('four')).toBe(false);
				}
			);
		});
	});
	
	describe('linking', () => {
		
		it('returns a public link function from compile', () => {
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {compile: _.noop};
			});
			injector.invoke(function ($compile) {
				const el = $('<div my-directive></div>');
				const linkFn = $compile(el);
				expect(linkFn).toBeDefined();
				expect(_.isFunction(linkFn)).toBe(true);
			});
		});
		
		it('takes a scope and attaches it to elements', () => {
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {compile: _.noop};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(el.data('$scope')).toBe($rootScope);
			});
		});
		
		it('calls directive link function with scope', () => {
			let givenScope, givenElement, givenAttrs;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					compile: function () {
						return function link(scope, element, attrs) {
							givenScope = scope;
							givenElement = element;
							givenAttrs = attrs;
						};
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope).toBe($rootScope);
				expect(givenElement[0]).toBe(el[0]);
				expect(givenAttrs).toBeDefined();
				expect(givenAttrs.myDirective).toBeDefined();
			});
		});
		
		it('supports link function in directive de nition object', () => {
			let givenScope, givenElement, givenAttrs;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					link: function (scope, element, attrs) {
						givenScope = scope;
						givenElement = element;
						givenAttrs = attrs;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope).toBe($rootScope);
				expect(givenElement[0]).toBe(el[0]);
				expect(givenAttrs).toBeDefined();
				expect(givenAttrs.myDirective).toBeDefined();
			});
		});
		
		xit('links directive on child elements first', () => {
			const givenElements = [];
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					link: function (scope, element, attrs) {
						givenElements.push(element);
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive><div my-directive></div></div>');
				$compile(el)($rootScope);
				expect(givenElements.length).toBe(2);
				expect(givenElements[0][0]).toBe(el[0].firstChild);
				expect(givenElements[1][0]).toBe(el[0]);
			});
		});
		
		xit('links children when parent has no directives', () => {
			const givenElements = [];
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					link: function (scope, element, attrs) {
						givenElements.push(element);
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div><div my-directive></div></div>');
				$compile(el)($rootScope);
				expect(givenElements.length).toBe(1);
				expect(givenElements[0][0]).toBe(el[0].firstChild);
			});
		});
		
		xit('supports link function objects', () => {
			let linked;
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					link: {
						post: function (scope, element, attrs) {
							linked = true;
						}
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div><div my-directive></div></div>');
				$compile(el)($rootScope);
				// setTimeout(function () {
				expect(linked).toBe(true);
				// }, 0);
			});
		});
		
		it('supports prelinking and postlinking', () => {
			const linkings = [];
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					link: {
						pre: function (scope, element) {
							linkings.push(['pre', element[0]]);
						},
						post: function (scope, element) {
							linkings.push(['post', element[0]]);
						}
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive><div my-directive></div></div>');
				$compile(el)($rootScope);
				expect(linkings.length).toBe(4);
				expect(linkings[0]).toEqual(['pre', el[0]]);
				expect(linkings[1]).toEqual(['pre', el[0].firstChild]);
				expect(linkings[2]).toEqual(['post', el[0].firstChild]);
				expect(linkings[3]).toEqual(['post', el[0]]);
			});
		});
		
		it('reverses priority for postlink functions', () => {
			const linkings = [];
			const injector = makeInjectorWithDirectives({
				firstDirective: function () {
					return {
						priority: 2,
						link: {
							pre: function (scope, element) {
								linkings.push('first-pre');
							},
							post: function (scope, element) {
								linkings.push('first-post');
							}
						}
					};
				},
				secondDirective: function () {
					return {
						priority: 1,
						link: {
							pre: function (scope, element) {
								linkings.push('second-pre');
							},
							post: function (scope, element) {
								linkings.push('second-post');
							}
						}
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div first-directive second-directive></div>');
				$compile(el)($rootScope);
				expect(linkings).toEqual([
					'first-pre',
					'second-pre',
					'second-post',
					'first-post'
				]);
			});
		});
		
		xit('stabilizes node list during linking', () => {
			let givenElements = [];
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					link: function (scope, element, attrs) {
						givenElements.push(element[0]);
						element.after('<div></div>');
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div><div my-directive></div><div my-directive></div></div>');
				const el1 = el[0].childNodes[0];
				const el2 = el[0].childNodes[1];
				$compile(el)($rootScope);
				expect(givenElements.length).toBe(2);
				expect(givenElements[0]).toBe(el1);
				expect(givenElements[1]).toBe(el2);
			});
		});
		
		xit('invokes multi-element directive link functions with whole group', () => {
			let givenElements;
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					multiElement: true,
					link: function (scope, element, attrs) {
						givenElements = element;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $(
					'<div my-directive-start></div>' +
					'<p></p>' +
					'<div my-directive-end></div>'
				);
				$compile(el)($rootScope);
				expect(givenElements.length).toBe(3);
			});
		});
		
		it('makes new scope for element when directive asks for it', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: true,
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope.$parent).toBe($rootScope);
			});
		});
		
		it('gives inherited scope to all directives on element', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: true
					};
				},
				myOtherDirective: function () {
					return {
						link: function (scope) {
							givenScope = scope;
						}
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope.$parent).toBe($rootScope);
			});
		});
		
		it('adds scope class and data for element with new scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: true,
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(el.hasClass('ng-scope')).toBe(true);
				expect(el.data('$scope')).toBe(givenScope);
			});
		});
		
		it('creates an isolate scope when requested', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope.$parent).toBe($rootScope);
				expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
			});
		});
		
		it('does not share isolate scope with other directives', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: {}
					};
				},
				myOtherDirective: function () {
					return {
						link: function (scope) {
							givenScope = scope;
						}
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope).toBe($rootScope);
			});
		});
		
		it('does not use isolate scope on child elements', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: {}
					};
				},
				myOtherDirective: function () {
					return {
						link: function (scope) {
							givenScope = scope;
						}
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive><div my-other-directive></div></div>');
				$compile(el)($rootScope);
				expect(givenScope).toBe($rootScope);
			});
		});
		
		it('does not allow two isolate scope directives on an element', () => {
			const injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: {}
					};
				},
				myOtherDirective: function () {
					return {
						scope: {}
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				expect(function () {
					$compile(el);
				}).toThrow();
			});
		});
		
		it('does not allow both isolate and inherited scopes on an element', () => {
			const injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: {}
					};
				},
				myOtherDirective: function () {
					return {
						scope: true
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				expect(function () {
					$compile(el);
				}).toThrow();
			});
		});
		
		it('adds class and data for element with isolated scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					scope: {},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(el.hasClass('ng-isolate-scope')).toBe(true);
				expect(el.hasClass('ng-scope')).toBe(false);
				expect(el.data('$isolateScope')).toBe(givenScope);
			});
		});
		
		xit('allows observing attribute to the isolate scope', () => {
			let givenScope, givenAttrs;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						anAttr: '@'
					},
					link: function (scope, element, attrs) {
						givenScope = scope;
						givenAttrs = attrs;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				givenAttrs.$set('anAttr', '42');
				expect(givenScope.anAttr).toEqual('42');
			});
		});
		
		it('sets initial value of observed attr to the isolate scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						anAttr: '@'
					},
					link: function (scope, element, attrs) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive an-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.anAttr).toEqual('42');
			});
		});
		
		it('allows aliasing observed attribute', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						aScopeAttr: '@anAttr'
					},
					link: function (scope, element, attrs) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive an-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.aScopeAttr).toEqual('42');
			});
		});
		
		it('allows binding expression to isolate scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						anAttr: '<'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive an-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.anAttr).toBe(42);
			});
		});
		
		it('allows aliasing expression attribute on isolate scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '<theAttr'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive the-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.myAttr).toBe(42);
			});
		});
		
		it('watches isolated scope expressions', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '<'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-attr="parentAttr + 1"></div>');
				$compile(el)($rootScope);
				$rootScope.parentAttr = 41;
				$rootScope.$digest();
				expect(givenScope.myAttr).toBe(42);
			});
		});
		
		it('does not watch optional missing isolate scope expressions', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '<?'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect($rootScope.$$watchers.length).toBe(0);
			});
		});
		
		it('allows binding two-way expression to isolate scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						anAttr: '='
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive an-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.anAttr).toBe(42);
			});
		});
		
		it('allows aliasing two-way expression attribute on isolate scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '=theAttr'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive the-attr="42"></div>');
				$compile(el)($rootScope);
				expect(givenScope.myAttr).toBe(42);
			});
		});
		
		it('watches two-way expressions', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '='
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-attr="parentAttr + 1"></div>');
				$compile(el)($rootScope);
				$rootScope.parentAttr = 41;
				$rootScope.$digest();
				expect(givenScope.myAttr).toBe(42);
			});
		});
		
		it('does not watch optional missing two-way expressions', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '=?'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect($rootScope.$$watchers.length).toBe(0);
			});
		});
		
		it('allows assigning to two-way scope expressions', () => {
			let isolateScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '='
					},
					link: function (scope) {
						isolateScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-attr="parentAttr"></div>');
				$compile(el)($rootScope);
				isolateScope.myAttr = 42;
				$rootScope.$digest();
				expect($rootScope.parentAttr).toBe(42);
			});
		});
		
		it('gives parent change precedence when both parent and child change', function () {
			let isolateScope;
			const injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					scope: {
						myAttr: '='
					},
					link: function (scope) {
						isolateScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-attr="parentAttr"></div>');
				$compile(el)($rootScope);
				
				$rootScope.parentAttr = 42;
				isolateScope.myAttr = 43;
				$rootScope.$digest();
				expect($rootScope.parentAttr).toBe(42);
				expect(isolateScope.myAttr).toBe(42);
			});
		});
		
		it('throws when two-way expression returns new arrays', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '='
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				$rootScope.parentFunction = function() {
					return [1, 2, 3];
				};
				const el = $('<div my-directive my-attr="parentFunction()"></div>');
				$compile(el)($rootScope);
				expect(function () {
					$rootScope.$digest();
				}).toThrow();
			});
		});
		
		it('can watch two-way bindings as collections', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myAttr: '=*'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				$rootScope.parentFunction = function () {
					return [1, 2, 3];
				};
				const el = $('<div my-directive my-attr="parentFunction()"></div>');
				$compile(el)($rootScope);
				$rootScope.$digest();
				expect(givenScope.myAttr).toEqual([1, 2, 3]);
			});
		});
		
		it('allows binding an invokable expression on the parent scope', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myExpr: '&'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				$rootScope.parentFunction = function() {
					return 42;
				};
				const el = $('<div my-directive my-expr="parentFunction() + 1"></div>');
				$compile(el)($rootScope);
				expect(givenScope.myExpr()).toBe(43);
			});
		});
		
		it('allows passing arguments to parent scope expression', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myExpr: '&'
					},
					link: function(scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function($compile, $rootScope) {
				let gotArg;
				$rootScope.parentFunction = function(arg) {
					gotArg = arg;
				};
				const el = $('<div my-directive my-expr="parentFunction(argFromChild)"></div>');
				$compile(el)($rootScope);
				givenScope.myExpr({argFromChild: 42});
				expect(gotArg).toBe(42);
			});
		});
		
		it('sets missing optional parent scope expression to undefined', () => {
			let givenScope;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					scope: {
						myExpr: '&?'
					},
					link: function (scope) {
						givenScope = scope;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				let gotArg;
				$rootScope.parentFunction = function (arg) {
					gotArg = arg;
				};
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(givenScope.myExpr).toBeUndefined();
			});
		});
		
	});
});
