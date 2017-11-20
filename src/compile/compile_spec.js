/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-15
 */
import _ from 'lodash';
import $ from 'jquery';
import sinon from 'sinon';
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
		myModule.directive('testing', () => {
		});
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
		myModule.directive('hasOwnProperty', function () {
		});
		expect(function () {
			createInjector(['ng', 'myModule']);
		}).toThrow();
	});
	
	it('allows creating directives with object notation', () => {
		const myModule = window.angular.module('myModule', []);
		myModule.directive({
			a: function () {
			},
			b: function () {
			},
			c: function () {
			}
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
				$rootScope.parentFunction = function () {
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
				$rootScope.parentFunction = function () {
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
	
	describe('controllers', () => {
		
		it('can be attached to directives as functions', () => {
			let controllerInvoked;
			const injector = makeInjectorWithDirectives('myDirective', () => {
				return {
					controller: function MyController() {
						controllerInvoked = true;
					}
				};
			});
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(controllerInvoked).toBe(true);
			});
		});
		
		it('can be attached to directives as string references', () => {
			let controllerInvoked;
			
			function MyController() {
				controllerInvoked = true;
			}
			
			const injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$compileProvider.directive('myDirective', function () {
						return {controller: 'MyController'};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(controllerInvoked).toBe(true);
			});
		});
		
		it('can be applied in the same element independent of each other', () => {
			let controllerInvoked;
			let otherControllerInvoked;
			
			function MyController() {
				controllerInvoked = true;
			}
			
			function MyOtherController() {
				otherControllerInvoked = true;
			}
			
			const injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$controllerProvider.register('MyOtherController', MyOtherController);
					$compileProvider.directive('myDirective', function () {
						return {controller: 'MyController'};
					});
					$compileProvider.directive('myOtherDirective', function () {
						return {controller: 'MyOtherController'};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(controllerInvoked).toBe(true);
				expect(otherControllerInvoked).toBe(true);
			});
		});
		
		it('can be applied to different directives, as different instances', () => {
			let invocations = 0;
			
			function MyController() {
				invocations++;
			}
			
			const injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$compileProvider.directive('myDirective', function () {
						return {controller: 'MyController'};
					});
					$compileProvider.directive('myOtherDirective', function () {
						return {controller: 'MyController'};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(invocations).toBe(2);
			});
		});
		
		it('can be aliased with @ when given in directive attribute', () => {
			let controllerInvoked;
			
			function MyController() {
				controllerInvoked = true;
			}
			
			const injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$compileProvider.directive('myDirective', function () {
						return {controller: '@'};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive="MyController"></div>');
				$compile(el)($rootScope);
				expect(controllerInvoked).toBe(true);
			});
		});
		
		it('gets scope, element, and attrs through DI', function () {
			let gotScope, gotElement, gotAttrs;
			
			function MyController($element, $scope, $attrs) {
				gotElement = $element;
				gotScope = $scope;
				gotAttrs = $attrs;
			}
			
			const injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
				$controllerProvider.register('MyController', MyController);
				$compileProvider.directive('myDirective', function () {
					return {controller: 'MyController'};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive an-attr="abc"></div>');
				$compile(el)($rootScope);
				expect(gotElement[0]).toBe(el[0]);
				expect(gotScope).toBe($rootScope);
				expect(gotAttrs).toBeDefined();
				expect(gotAttrs.anAttr).toEqual('abc');
			});
		});
		
		it('can be attached on the scope', function () {
			function MyController() {
			}
			
			const injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
				$controllerProvider.register('MyController', MyController);
				$compileProvider.directive('myDirective', function () {
					return {
						controller: 'MyController',
						controllerAs: 'myCtrl'
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect($rootScope.myCtrl).toBeDefined();
				expect($rootScope.myCtrl instanceof MyController).toBe(true);
			});
		});
		
		it('gets isolate scope as injected $scope', function () {
			let gotScope;
			
			function MyController($scope) {
				gotScope = $scope;
			}
			
			const injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$compileProvider.directive('myDirective', function () {
						return {
							scope: {},
							controller: 'MyController'
						};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				const el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(gotScope).not.toBe($rootScope);
			});
		});
		
		it('has isolate scope bindings available during construction', function () {
			var gotMyAttr;
			
			function MyController($scope) {
				gotMyAttr = $scope.myAttr;
			}
			
			var injector = createInjector(['ng',
				function ($controllerProvider, $compileProvider) {
					$controllerProvider.register('MyController', MyController);
					$compileProvider.directive('myDirective', function () {
						return {
							scope: {
								myAttr: '@myDirective'
							},
							controller: 'MyController'
						};
					});
				}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive="abc"></div>');
				$compile(el)($rootScope);
				expect(gotMyAttr).toEqual('abc');
			});
		});
		
		it('can bind isolate scope bindings directly to self', function () {
			var gotMyAttr;
			
			function MyController() {
				gotMyAttr = this.myAttr;
			}
			
			var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
				$controllerProvider.register('MyController', MyController);
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {
							myAttr: '@myDirective'
						},
						controller: 'MyController',
						bindToController: true
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive="abc"></div>');
				$compile(el)($rootScope);
				expect(gotMyAttr).toEqual('abc');
			});
		});
		
		it('can return a semi-constructed controller', function () {
			var injector = createInjector(['ng']);
			var $controller = injector.get('$controller');
			
			function MyController() {
				this.constructed = true;
				this.myAttrWhenConstructed = this.myAttr;
			}
			
			var controller = $controller(MyController, null, true);
			
			expect(controller.constructed).toBeUndefined();
			expect(controller.instance).toBeDefined();
			
			controller.instance.myAttr = 42;
			var actualController = controller();
			
			expect(actualController.constructed).toBeDefined();
			expect(actualController.myAttrWhenConstructed).toBe(42);
		});
		
		it('can return a semi-constructed ctrl when using array injection', function () {
			var injector = createInjector(['ng', function ($provide) {
				$provide.constant('aDep', 42);
			}]);
			
			var $controller = injector.get('$controller');
			
			function MyController(aDep) {
				this.aDep = aDep;
				this.constructed = true;
			}
			
			var controller = $controller(['aDep', MyController], null, true);
			expect(controller.constructed).toBeUndefined();
			var actualController = controller();
			expect(actualController.constructed).toBeDefined();
			expect(actualController.aDep).toBe(42);
		});
		
		it('can bind semi-constructed controller to scope', function () {
			var injector = createInjector(['ng']);
			var $controller = injector.get('$controller');
			
			function MyController() {
			}
			
			var scope = {};
			var controller = $controller(MyController, {$scope: scope}, true, 'myCtrl');
			expect(scope.myCtrl).toBe(controller.instance);
		});
		
		it('can bind iso scope bindings through bindToController', function () {
			var gotMyAttr;
			
			function MyController() {
				gotMyAttr = this.myAttr;
			}
			
			var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
				$controllerProvider.register('MyController', MyController);
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: 'MyController',
						bindToController: {
							myAttr: '@myDirective'
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive="abc"></div>');
				$compile(el)($rootScope);
				expect(gotMyAttr).toEqual('abc');
			});
		});
		
		it('can bind through bindToController without iso scope', function () {
			var gotMyAttr;
			
			function MyController() {
				gotMyAttr = this.myAttr;
			}
			
			var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
				$controllerProvider.register('MyController', MyController);
				$compileProvider.directive('myDirective', function () {
					return {
						scope: true,
						controller: 'MyController',
						bindToController: {
							myAttr: '@myDirective'
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive="abc"></div>');
				$compile(el)($rootScope);
				expect(gotMyAttr).toEqual('abc');
			});
		});
		
		it('can be required from a sibling directive', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: 'myDirective',
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		it('can be required from multiple sibling directives', function () {
			function MyController() {
			}
			
			function MyOtherController() {
			}
			
			var gotControllers;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: true,
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						scope: true,
						controller: MyOtherController
					};
				});
				$compileProvider.directive('myThirdDirective', function () {
					return {
						require: ['myDirective', 'myOtherDirective'],
						link: function (scope, element, attrs, controllers) {
							gotControllers = controllers;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive my-third-directive></div>');
				$compile(el)($rootScope);
				expect(gotControllers).toBeDefined();
				expect(gotControllers.length).toBe(2);
				expect(gotControllers[0] instanceof MyController).toBe(true);
				expect(gotControllers[1] instanceof MyOtherController).toBe(true);
			});
		});
		
		it('can be required as an object', function () {
			function MyController() {
			}
			
			function MyOtherController() {
			}
			
			var gotControllers;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: true,
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						scope: true,
						controller: MyOtherController
					};
				});
				$compileProvider.directive('myThirdDirective', function () {
					return {
						require: {
							myDirective: 'myDirective',
							myOtherDirective: 'myOtherDirective'
						},
						link: function (scope, element, attrs, controllers) {
							gotControllers = controllers;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive my-third-directive></div>');
				$compile(el)($rootScope);
				expect(gotControllers).toBeDefined();
				expect(gotControllers.myDirective instanceof MyController).toBe(true);
				expect(gotControllers.myOtherDirective instanceof MyOtherController).toBe(true);
			});
		});
		
		it('can be required as an object with values omitted', function () {
			function MyController() {
			}
			
			var gotControllers;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: true,
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: {
							myDirective: ''
						},
						link: function (scope, element, attrs, controllers) {
							gotControllers = controllers;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive my-third-directive></div>');
				$compile(el)($rootScope);
				expect(gotControllers).toBeDefined();
				expect(gotControllers.myDirective instanceof MyController).toBe(true);
			});
		});
		
		it('requires itself if there is no explicit require', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController,
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		xit('is passed through grouped link wrapper', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						multiElement: true,
						scope: {},
						controller: MyController,
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive-start></div><div my-directive-end></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		it('can be required from a parent directive', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: '^myDirective',
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive><div my-other-directive></div></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		it(' nds from sibling directive when requiring with parent pre x', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: '^myDirective',
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		it('can be required from a parent directive with ^^', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: '^^myDirective',
						link: function (scope, element, attrs, myController) {
							gotMyController = myController;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive><div my-other-directive></div></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		xit('does not find from sibling directive when requiring with ^^', function () {
			function MyController() {
			}
			
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: '^^myDirective',
						link: function (scope, element, attrs, myController) {
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				expect(function () {
					$compile(el)($rootScope);
				}).toThrow();
			});
		});
		
		it('can be required from parent in object form', function () {
			function MyController() {
			}
			
			var gotControllers;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: {
							myDirective: '^'
						},
						link: function (scope, element, attrs, controllers) {
							gotControllers = controllers;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive><div my-other-directive></div></div>');
				$compile(el)($rootScope);
				expect(gotControllers.myDirective instanceof MyController).toBe(true);
			});
		});
		
		it('does not throw on required missing controller when optional', function () {
			var gotCtrl;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						require: '?noSuchDirective',
						link: function (scope, element, attrs, ctrl) {
							gotCtrl = ctrl;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(gotCtrl).toBe(null);
			});
		});
		
		it('allows optional marker after parent marker', function () {
			var gotCtrl;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						require: '^?noSuchDirective',
						link: function (scope, element, attrs, ctrl) {
							gotCtrl = ctrl;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el)($rootScope);
				expect(gotCtrl).toBe(null);
			});
		});
		
		it('allows optional marker before parent marker', function () {
			function MyController() {
			}
			
			var gotMyController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: '?^myDirective',
						link: function (scope, element, attrs, ctrl) {
							gotMyController = ctrl;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				expect(gotMyController).toBeDefined();
				expect(gotMyController instanceof MyController).toBe(true);
			});
		});
		
		it('attaches required controllers on controller when using object', function () {
			function MyController() {
			}
			
			var instantiatedController;
			var injector = createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive('myDirective', function () {
					return {
						scope: {},
						controller: MyController
					};
				});
				$compileProvider.directive('myOtherDirective', function () {
					return {
						require: {
							myDirective: '^'
						},
						bindToController: true,
						controller: function () {
							instantiatedController = this;
						}
					};
				});
			}]);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive><div my-other-directive></div></div>');
				$compile(el)($rootScope);
				expect(instantiatedController.myDirective instanceof MyController).toBe(true);
			});
		});
		
		it('allows looking up controller from surrounding scope', function () {
			var gotScope;
			
			function MyController($scope) {
				gotScope = $scope;
			}
			
			var injector = createInjector(['ng']);
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div ng-controller="MyCtrlOnScope as myCtrl"></div>');
				$rootScope.MyCtrlOnScope = MyController;
				$compile(el)($rootScope);
				expect(gotScope.myCtrl).toBeDefined();
				expect(gotScope.myCtrl instanceof MyController).toBe(true);
			});
		});
		
	});
	
	describe('template', function () {
		
		it('populates an element during compilation', function () {
			var injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					template: '<div class="from-template"></div>'
				};
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive></div>');
				$compile(el);
				expect(el.find('> .from-template').length).toBe(1);
			});
		});
		
		it('replaces any existing children', function () {
			var injector = makeInjectorWithDirectives('myDirective', function () {
				return {
					template: '<div class="from-template"></div>'
				};
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive><div class="existing"></div></div>');
				$compile(el);
				expect(el.find('> .existing').length).toBe(0);
			});
		});
		
		it('compiles template contents also', function () {
			var compileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						template: '<div my-other-directive></div>'
					};
				},
				myOtherDirective: function () {
					return {
						compile: compileSpy
					};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive></div>');
				$compile(el);
				expect(compileSpy).toHaveBeenCalled();
			});
		});
		
		it('does not allow two directives with templates', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {template: '<div></div>'};
				},
				myOtherDirective: function () {
					return {template: '<div></div>'};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive my-other-directive></div>');
				expect(function () {
					$compile(el);
				}).toThrow();
			});
		});
		
		it('supports functions as template values', function () {
			var templateSpy = jasmine.createSpy().and.returnValue('<div class="from-template"></div>');
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						template: templateSpy
					};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive></div>');
				$compile(el);
				expect(el.find('> .from-template').length).toBe(1);
				// Check that template function was called with element and attrs
				expect(templateSpy.calls.first().args[0][0]).toBe(el[0]);
				expect(templateSpy.calls.first().args[1].myDirective).toBeDefined();
			});
		});
		
		it('uses isolate scope for template contents', function () {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						scope: {
							isoValue: '=myDirective'
						},
						template: '<div my-other-directive></div>'
					};
				},
				myOtherDirective: function () {
					return {link: linkSpy};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive="42"></div>');
				$compile(el)($rootScope);
				expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
				expect(linkSpy.calls.first().args[0].isoValue).toBe(42);
			});
		});
		
		
	});
	
	describe('templateUrl', function () {
		
		let xhr, requests;
		beforeEach(() => {
			xhr = sinon.useFakeXMLHttpRequest();
			requests = [];
			xhr.onCreate = function (req) {
				requests.push(req);
			};
		});
		
		afterEach(() => {
			xhr.restore();
		});
		
		it('defers remaining directive compilation', function () {
			var otherCompileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				},
				myOtherDirective: function () {
					return {compile: otherCompileSpy};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el);
				expect(otherCompileSpy).not.toHaveBeenCalled();
			});
		});
		
		it('defers current directive compilation', function () {
			var compileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						templateUrl: '/my_directive.html',
						compile: compileSpy
					};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive></div>');
				$compile(el);
				expect(compileSpy).not.toHaveBeenCalled();
			});
		});
		
		it('immediately empties out the element', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive>Hello</div>');
				$compile(el);
				expect(el.is(':empty')).toBe(true);
			});
		});
		
		it('fetches the template', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el);
				$rootScope.$apply();
				expect(requests.length).toBe(1);
				expect(requests[0].method).toBe('GET');
				expect(requests[0].url).toBe('/my_directive.html');
			});
		});
		
		it('populates element with template', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div class="from-template"></div>');
				expect(el.find('> .from-template').length).toBe(1);
			});
		});
		
		it('compiles current directive when template received', function () {
			var compileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						templateUrl: '/my_directive.html',
						compile: compileSpy
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div class="from-template"></div>');
				expect(compileSpy).toHaveBeenCalled();
			});
		});
		
		it('resumes compilation when template received', function () {
			var otherCompileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				},
				myOtherDirective: function () {
					return {compile: otherCompileSpy};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div class="from-template"></div>');
				expect(otherCompileSpy).toHaveBeenCalled();
			});
		});
		
		it('resumes child compilation after template received', function () {
			var otherCompileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				},
				myOtherDirective: function () {
					return {compile: otherCompileSpy};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div my-other-directive></div>');
				expect(otherCompileSpy).toHaveBeenCalled();
			});
		});
		
		it('supports functions as values', function () {
			var templateUrlSpy = jasmine.createSpy().and.returnValue('/my_directive.html');
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						templateUrl: templateUrlSpy
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				$compile(el);
				$rootScope.$apply();
				expect(requests[0].url).toBe('/my_directive.html');
				expect(templateUrlSpy.calls.first().args[0][0]).toBe(el[0]);
				expect(templateUrlSpy.calls.first().args[1].myDirective).toBeDefined();
			});
		});
		
		it('does not allow templateUrl directive after template directive', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {template: '<div></div>'};
				},
				myOtherDirective: function () {
					return {templateUrl: '/my_other_directive.html'};
				}
			});
			injector.invoke(function ($compile) {
				var el = $('<div my-directive my-other-directive></div>');
				expect(function () {
					$compile(el);
				}).toThrow();
			});
		});
		
		it('does not allow template directive after templateUrl directive', function () {
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				},
				myOtherDirective: function () {
					return {template: '<div></div>'};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div class="replacement"></div>');
				expect(el.find('> .replacement').length).toBe(1);
			});
		});
		
		it('links the directive when public link function is invoked', function () {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						templateUrl: '/my_directive.html',
						link: linkSpy
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				var linkFunction = $compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div></div>');
				linkFunction($rootScope);
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.first().args[0]).toBe($rootScope);
				expect(linkSpy.calls.first().args[1][0]).toBe(el[0]);
				expect(linkSpy.calls.first().args[2].myDirective).toBeDefined();
			});
		});
		
		it('links child elements when public link function is invoked', function () {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {templateUrl: '/my_directive.html'};
				},
				myOtherDirective: function () {
					return {link: linkSpy};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				var linkFunction = $compile(el);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div my-other-directive></div>');
				linkFunction($rootScope);
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.first().args[0]).toBe($rootScope);
				expect(linkSpy.calls.first().args[1][0]).toBe(el[0].firstChild);
				expect(linkSpy.calls.first().args[2].myOtherDirective).toBeDefined();
			});
		});
		
		it('links when template arrives if node link fn was called', function () {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function () {
					return {
						templateUrl: '/my_directive.html',
						link: linkSpy
					};
				}
			});
			injector.invoke(function ($compile, $rootScope) {
				var el = $('<div my-directive></div>');
				var linkFunction = $compile(el)($rootScope); // link  first
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div></div>'); // then receive template
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
				expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
				expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
			});
		});

		it('links directives that were compiled earlier', function() {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function() {
					return {link: linkSpy};
				},
				myOtherDirective: function() {
					return {templateUrl: '/my_other_directive.html'};
				}
			});
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				var linkFunction = $compile(el);
				$rootScope.$apply();
				linkFunction($rootScope);
				requests[0].respond(200, {}, '<div></div>');
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
				expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
				expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
			});
		});

		it('retains isolate scope directives from earlier', function() {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function() {
					return {
						scope: {val: '=myDirective'},
						link: linkSpy
					};
				},
				myOtherDirective: function() {
					return {templateUrl: '/my_other_directive.html'};
				}
			});
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-directive="42" my-other-directive></div>');
				var linkFunction = $compile(el);
				$rootScope.$apply();
				linkFunction($rootScope);
				requests[0].respond(200, {}, '<div></div>');
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.first().args[0]).toBeDefined();
				expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
				expect(linkSpy.calls.first().args[0].val).toBe(42);
			});
		});

		it('supports isolate scope directives with templateUrls', function() {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function() {
					return {
						scope: {val: '=myDirective'},
						link: linkSpy,
						templateUrl: '/my_other_directive.html'
					}; }
			});
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-directive="42"></div>');
				var linkFunction = $compile(el)($rootScope);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div></div>');
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
				expect(linkSpy.calls.first().args[0].val).toBe(42);
			});
		});

		it('links children of isolate scope directives with templateUrls', function() {
			var linkSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myDirective: function() {
					return {
						scope: {val: '=myDirective'},
						templateUrl: '/my_other_directive.html'
					};
				},
				myChildDirective: function() {
					return {
						link: linkSpy
					};
				} });
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-directive="42"></div>');
				var linkFunction = $compile(el)($rootScope);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div my-child-directive></div>');
				expect(linkSpy).toHaveBeenCalled();
				expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
				expect(linkSpy.calls.first().args[0].val).toBe(42);
			});
		});

		it('sets up controllers for all controller directives', function() {
			var myDirectiveControllerInstantiated, myOtherDirectiveControllerInstantiated;
			var injector = makeInjectorWithDirectives({
				myDirective: function() {
					return {
						controller: function MyDirectiveController() {
							myDirectiveControllerInstantiated = true;
						}
					};
				},
				myOtherDirective: function() {
					return {
						templateUrl: '/my_other_directive.html',
						controller: function MyOtherDirectiveController() {
							myOtherDirectiveControllerInstantiated = true;
						}
					};
				}
			});
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-directive my-other-directive></div>');
				$compile(el)($rootScope);
				$rootScope.$apply();
				requests[0].respond(200, {}, '<div></div>');
				expect(myDirectiveControllerInstantiated).toBe(true);
				expect(myOtherDirectiveControllerInstantiated).toBe(true);
			});
		});

	});

	describe('transclude', function() {

		it('removes the children of the element from the DOM', function () {
			var injector = makeInjectorWithDirectives({
				myTranscluder: function() {
					return {transclude: true};
				}
			});
			injector.invoke(function($compile) {
				var el = $('<div my-transcluder><div>Must go</div></div>');
				$compile(el);
				expect(el.is(':empty')).toBe(true);
			});
		});

		it('compiles child elements', function () {
			var insideCompileSpy = jasmine.createSpy();
			var injector = makeInjectorWithDirectives({
				myTranscluder: function() {
					return {transclude: true};
				},
				insideTranscluder: function() {
					return {compile: insideCompileSpy};
				}
			});
			injector.invoke(function($compile) {
				var el = $('<div my-transcluder><div inside-transcluder></div></div>');
				$compile(el);
				expect(insideCompileSpy).toHaveBeenCalled();
			});
		});

		it('makes contents available to directive link function', function() {
			var injector = makeInjectorWithDirectives({
				myTranscluder: function() {
					return {
						transclude: true,
						template: '<div in-template></div>',
						link: function(scope, element, attrs, ctrl, transclude) {
							element.find('[in-template]').append(transclude());
						}
					};
				}
			});
			injector.invoke(function($compile, $rootScope) {
				var el = $('<div my-transcluder><div in-transcluder></div></div>');
				$compile(el)($rootScope);
				expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1);
			});
		});

		it('is only allowed once per element', function() {
			var injector = makeInjectorWithDirectives({
				myTranscluder: function() {
					return {transclude: true};
				},
				mySecondTranscluder: function() {
					return {transclude: true};
				}
			});
			injector.invoke(function($compile) {
				var el = $('<div my-transcluder my-second-transcluder></div>');
				expect(function() {
					$compile(el);
				}).toThrow();
			});
		});

	});

});
