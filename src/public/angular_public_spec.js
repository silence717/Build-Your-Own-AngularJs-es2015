/**
 * @author  https://github.com/silence717
 * @date on 2017/2/20
 */
import publishExternalAPI from './angular_public';
import createInjector from '../injector/injector';

describe('angularPublic', () => {
	it('sets up the angular object and the module loader', () => {
		publishExternalAPI();
		expect(window.angular).toBeDefined();
		expect(window.angular.module).toBeDefined();
	});
	it('sets up the ng module', () => {
		publishExternalAPI();
		expect(createInjector(['ng'])).toBeDefined();
	});
	it('sets up the $filter service', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$filter')).toBe(true);
	});
	it('sets up the $parse service', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$parse')).toBe(true);
	});
	it('sets up the $rootScope', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$rootScope')).toBe(true);
	});
	it('sets up $q', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$q')).toBe(true);
	});
	it('sets up $http and $httpBackend', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$http')).toBe(true);
		expect(injector.has('$httpBackend')).toBe(true);
	});
	it('sets up $compile', () => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		expect(injector.has('$compile')).toBe(true);
	});
});
