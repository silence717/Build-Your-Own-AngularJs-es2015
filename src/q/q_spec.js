/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('$q', () => {
	let $q;
	let $rootScope;
	beforeEach(() => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		$q = injector.get('$q');
		$rootScope = injector.get('$rootScope');
	});
	it('can create a deferred', () => {
		const d = $q.defer();
		expect(d).toBeDefined();
	});
	it('has a promise for each Deferred', () => {
		const d = $q.defer();
		expect(d.promise).toBeDefined();
	});
	it('can resolve a promise', done => {
		const deferred = $q.defer();
		const promise = deferred.promise;
		const promiseSpy = jasmine.createSpy();
		promise.then(promiseSpy);
		deferred.resolve('a-ok');
		setTimeout(() => {
			expect(promiseSpy).toHaveBeenCalledWith('a-ok');
			done();
		}, 1);
	});
	it('works when resolved before promise listener', done => {
		const d = $q.defer();
		d.resolve(42);
		
		const promiseSpy = jasmine.createSpy();
		d.promise.then(promiseSpy);
		
		setTimeout(() => {
			expect(promiseSpy).toHaveBeenCalledWith(42);
			done();
		}, 0);
	});
	it('does not resolve promise immediately', () => {
		const d = $q.defer();
		const promiseSpy = jasmine.createSpy();
		
		d.promise.then(promiseSpy);
		
		d.resolve(42);
		expect(promiseSpy).not.toHaveBeenCalled();
	});
	it('resolves promise at next digest', () => {
		const d = $q.defer();
		const promiseSpy = jasmine.createSpy();
		
		d.promise.then(promiseSpy);
		d.resolve(42);
		
		$rootScope.$apply();
		expect(promiseSpy).toHaveBeenCalledWith(42);
	});
	it('may only be resolved once', () => {
		const d = $q.defer();
		
		const promiseSpy = jasmine.createSpy();
		d.promise.then(promiseSpy);
		
		d.resolve(42);
		d.resolve(43);
		$rootScope.$apply();
		
		expect(promiseSpy.calls.count()).toEqual(1);
		expect(promiseSpy).toHaveBeenCalledWith(42);
	});
	it('may only ever be resolved once', () => {
		const d = $q.defer();
		
		const promiseSpy = jasmine.createSpy();
		d.promise.then(promiseSpy);
		
		d.resolve(42);
		$rootScope.$apply();
		expect(promiseSpy).toHaveBeenCalledWith(42);
		
		d.resolve(43);
		$rootScope.$apply();
		expect(promiseSpy.calls.count()).toEqual(1);
	});
	it('resolves a listener added after resolution', () => {
		const d = $q.defer();
		d.resolve(42);
		$rootScope.$apply();
		
		const promiseSpy = jasmine.createSpy();
		d.promise.then(promiseSpy);
		$rootScope.$apply();
		
		expect(promiseSpy).toHaveBeenCalledWith(42);
	});
	it('may have multiple callbacks', () => {
		const d = $q.defer();
		
		const firstSpy = jasmine.createSpy();
		const secondSpy = jasmine.createSpy();
		d.promise.then(firstSpy);
		d.promise.then(secondSpy);
		
		d.resolve(42);
		$rootScope.$apply();
		
		expect(firstSpy).toHaveBeenCalledWith(42);
		expect(secondSpy).toHaveBeenCalledWith(42);
	});
	it('invokes each callback once', () => {
		const d = $q.defer();
		
		const firstSpy = jasmine.createSpy();
		const secondSpy = jasmine.createSpy();
		
		d.promise.then(firstSpy);
		d.resolve(42);
		$rootScope.$apply();
		expect(firstSpy.calls.count()).toBe(1);
		expect(secondSpy.calls.count()).toBe(0);
		
		d.promise.then(secondSpy);
		expect(firstSpy.calls.count()).toBe(1);
		expect(secondSpy.calls.count()).toBe(0);
		
		$rootScope.$apply();
		expect(firstSpy.calls.count()).toBe(1);
		expect(secondSpy.calls.count()).toBe(1);
	});
	
	it('can reject a deferred', () => {
		const d = $q.defer();
		
		const fulfillSpy = jasmine.createSpy();
		const rejectSpy = jasmine.createSpy();
		d.promise.then(fulfillSpy, rejectSpy);
		
		d.reject('fail');
		$rootScope.$apply();
		
		expect(fulfillSpy).not.toHaveBeenCalled();
		expect(rejectSpy).toHaveBeenCalledWith('fail');
	});
	
	it('can reject just once', () => {
		const d = $q.defer();
		
		const rejectSpy = jasmine.createSpy();
		d.promise.then(null, rejectSpy);
		
		d.reject('fail');
		$rootScope.$apply();
		expect(rejectSpy.calls.count()).toBe(1);
		
		d.reject('fail again');
		$rootScope.$apply();
		expect(rejectSpy.calls.count()).toBe(1);
	});
	it('cannot fulfill a promise once rejected', () => {
		const d = $q.defer();
		
		const fulfillSpy = jasmine.createSpy();
		const rejectSpy = jasmine.createSpy();
		d.promise.then(fulfillSpy, rejectSpy);
		
		d.reject('fail');
		$rootScope.$apply();
		
		d.resolve('success');
		$rootScope.$apply();
		
		expect(fulfillSpy).not.toHaveBeenCalled();
	});
	
	it('does not require a failure handler each time', () => {
		const d = $q.defer();
		
		const fulfillSpy = jasmine.createSpy();
		const rejectSpy = jasmine.createSpy();
		d.promise.then(fulfillSpy);
		d.promise.then(null, rejectSpy);
		
		d.reject('fail');
		$rootScope.$apply();
		
		expect(rejectSpy).toHaveBeenCalledWith('fail');
	});
	it('does not require a success handler each time', () => {
		const d = $q.defer();
		
		const fulfillSpy = jasmine.createSpy();
		const rejectSpy = jasmine.createSpy();
		d.promise.then(fulfillSpy);
		d.promise.then(null, rejectSpy);
		
		d.resolve('ok');
		$rootScope.$apply();
		
		expect(fulfillSpy).toHaveBeenCalledWith('ok');
	});
	it('can register rejection handler with catch', () => {
		const d = $q.defer();
		
		const rejectSpy = jasmine.createSpy();
		d.promise.catch(rejectSpy);
		d.reject('fail');
		$rootScope.$apply();
		
		expect(rejectSpy).toHaveBeenCalled();
	});
	
	it('invokes a finally handler when fulfilled', () => {
		const d = $q.defer();
		
		const finallySpy = jasmine.createSpy();
		d.promise.finally(finallySpy);
		d.resolve(42);
		$rootScope.$apply();
		
		expect(finallySpy).toHaveBeenCalledWith();
	});
	
	it('invokes a finally handler when rejected', () => {
		const d = $q.defer();
		
		const finallySpy = jasmine.createSpy();
		d.promise.finally(finallySpy);
		d.reject('fail');
		
		$rootScope.$apply();
		expect(finallySpy).toHaveBeenCalledWith();
	});
	
});
