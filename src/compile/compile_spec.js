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
		
		function makeInjectorWithDirectives() {
			const args = arguments;
			return createInjector(['ng', function ($compileProvider) {
				$compileProvider.directive.apply($compileProvider, args);
			}]);
		}
		
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
});
