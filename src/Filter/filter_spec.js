/**
 * @author  https://github.com/silence717
 * @date on 2017/1/24
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('filter', () => {

	beforeEach(function () {
		publishExternalAPI();
	});

	it('can be registered and obtained', () => {
		const myFilter = () => { };
		const myFilterFactory = () => {
			return myFilter;
		};
		const injector = createInjector(['ng', function ($filterProvider) {
			$filterProvider.register('my', myFilterFactory);
		}]);
		const $filter = injector.get('$filter');
		expect($filter('my')).toBe(myFilter);
	});
	it('allows registering multiple filters with an object', () => {
		const myFilter = () => { };
		const myOtherFilter = () => { };
		const injector = createInjector(['ng', $filterProvider => {
			$filterProvider.register({
				my: () => {
					return myFilter;
				},
				myOther: () => {
					return myOtherFilter;
				}
			});
		}]);
		const $filter = injector.get('$filter');
		expect($filter('my')).toBe(myFilter);
		expect($filter('myOther')).toBe(myOtherFilter);
	});
	it('is available through injector', () => {
		const myFilter = function () { };
		const injector = createInjector(['ng', $filterProvider => {
			$filterProvider.register('my', function () {
				return myFilter;
			});
		}]);
		expect(injector.has('myFilter')).toBe(true);
		expect(injector.get('myFilter')).toBe(myFilter);
	});
	it('may have dependencies in factory', () => {
		const injector = createInjector(['ng', ($provide, $filterProvider) => {
			$provide.constant('suf x', '!');
			$filterProvider.register('my', suffix => {
				return function (v) {
					return suffix + v;
				};
			});
		}]);
		expect(injector.has('myFilter')).toBe(true);
	});
	it('can be registered through module API', () => {
		const myFilter = function () { };
		window.angular.module('myModule', [])
			.filter('my', () => {
				return myFilter;
			});
		const injector = createInjector(['ng', 'myModule']);
		expect(injector.has('myFilter')).toBe(true);
		expect(injector.get('myFilter')).toBe(myFilter);
	});
});
