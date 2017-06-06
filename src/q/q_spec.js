/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';
import _ from 'lodash';

describe('$q', () => {
	let $q;
	let $$q;
	let $rootScope;
	beforeEach(() => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		$q = injector.get('$q');
		$$q = injector.get('$$q');
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
	
	it('allows chaining handlers', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		d.promise.then(function (result) {
			return result + 1;
		}).then(function (result) {
			return result * 2;
		}).then(fulfilledSpy);
		
		d.resolve(20);
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(42);
	});
	it('does not modify original resolution in chains', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		
		d.promise.then(function (result) {
			return result + 1;
		}).then(function (result) {
			return result * 2;
		});
		d.promise.then(fulfilledSpy);
		d.resolve(20);
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(20);
	});
	
	it('catches rejection on chained handler', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		d.promise.then(_.noop).catch(rejectedSpy);
		
		d.reject('fail');
		$rootScope.$apply();
		
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	
	it('fulfills on chained handler', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		d.promise.catch(_.noop).then(fulfilledSpy);
		
		d.resolve(42);
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(42);
	});
	it('treats catch return value as resolution', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		d.promise
			.catch(function () {
				return 42;
			})
			.then(fulfilledSpy);
		d.reject('fail');
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(42);
	});
	it('rejects chained promise when handler throws', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		d.promise.then(function () {
			throw 'fail';
		}).catch(rejectedSpy);
		d.resolve(42);
		
		$rootScope.$apply();
		
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('does not reject current promise when handler throws', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		d.promise.then(function () {
			throw 'fail';
		});
		
		d.promise.catch(rejectedSpy);
		d.resolve(42);
		
		$rootScope.$apply();
		
		expect(rejectedSpy).not.toHaveBeenCalled();
	});
	it('waits on promise returned from handler', () => {
		const d = $q.defer();
		const fulfilledSpy = jasmine.createSpy();
		
		d.promise.then(v => {
			const d2 = $q.defer();
			d2.resolve(v + 1);
			return d2.promise;
		}).then(v => {
			return v * 2;
		}).then(fulfilledSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(42);
	});
	it('waits on promise given to resolve', () => {
		const d = $q.defer();
		const d2 = $q.defer();
		const fulfilledSpy = jasmine.createSpy();
		
		d.promise.then(fulfilledSpy);
		d2.resolve(42);
		d.resolve(d2.promise);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(42);
	});
	it('rejects when promise returned from handler rejects', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		d.promise.then(function () {
			const d2 = $q.defer();
			d2.reject('fail');
			return d2.promise;
		}).catch(rejectedSpy);
		d.resolve('ok');
		
		$rootScope.$apply();
		
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('allows chaining handlers on finally, with original value', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		d.promise.then(function (result) {
			return result + 1;
		}).finally(function (result) {
			return result * 2;
		}).then(fulfilledSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith(21);
	});
	it('allows chaining handlers on finally, with original rejection', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		d.promise.then(function (result) {
			throw 'fail';
		}).finally(function () {
		
		}).catch(rejectedSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('resolves to orig value when nested promise resolves', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		let resolveNested;
		
		d.promise.then(function (result) {
			return result + 1;
		}).finally(function (result) {
			const d2 = $q.defer();
			resolveNested = function () {
				d2.resolve('abc');
			};
			return d2.promise;
		}).then(fulfilledSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		expect(fulfilledSpy).not.toHaveBeenCalled();
		
		resolveNested();
		$rootScope.$apply();
		expect(fulfilledSpy).toHaveBeenCalledWith(21);
	});
	it('rejects to original value when nested promise resolves', () => {
		const d = $q.defer();
		
		const rejectedSpy = jasmine.createSpy();
		let resolveNested;
		
		d.promise.then(function (result) {
			throw 'fail';
		}).finally(function (result) {
			const d2 = $q.defer();
			resolveNested = function () {
				d2.resolve('abc');
			};
			return d2.promise;
		}).catch(rejectedSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		expect(rejectedSpy).not.toHaveBeenCalled();
		
		resolveNested();
		$rootScope.$apply();
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('rejects when nested promise rejects in finally', () => {
		const d = $q.defer();
		
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		let rejectNested;
		
		d.promise.then(function (result) {
			return result + 1;
		}).finally(function (result) {
			const d2 = $q.defer();
			rejectNested = function () {
				d2.reject('fail');
			};
			return d2.promise;
		}).then(fulfilledSpy, rejectedSpy);
		d.resolve(20);
		
		$rootScope.$apply();
		expect(fulfilledSpy).not.toHaveBeenCalled();
		
		rejectNested();
		$rootScope.$apply();
		expect(fulfilledSpy).not.toHaveBeenCalled();
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('can report progress', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		d.promise.then(null, null, progressSpy);
		
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('working...');
	});
	it('can report progress many times', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		d.promise.then(null, null, progressSpy);
		
		d.notify('40%');
		$rootScope.$apply();
		
		d.notify('80%');
		d.notify('100%');
		$rootScope.$apply();
		
		expect(progressSpy.calls.count()).toBe(3);
	});
	it('does not notify progress after being resolved', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		d.promise.then(null, null, progressSpy);
		
		d.resolve('ok');
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).not.toHaveBeenCalled();
	});
	it('does not notify progress after being rejected', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		d.promise.then(null, null, progressSpy);
		
		d.reject('fail');
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).not.toHaveBeenCalled();
	});
	it('can notify progress through chain', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		
		d.promise
			.then(_.noop)
			.catch(_.noop)
			.then(null, null, progressSpy);
		
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('working...');
	});
	it('transforms progress through handlers', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		
		d.promise
			.then(_.noop)
			.then(null, null, function (progress) {
				return '***' + progress + '***';
			})
			.catch(_.noop)
			.then(null, null, progressSpy);
		
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('***working...***');
	});
	it('recovers from progressback exceptions', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		const fulfilledSpy = jasmine.createSpy();
		
		d.promise.then(null, null, function (progress) {
			throw 'fail';
		});
		d.promise.then(fulfilledSpy, null, progressSpy);
		
		d.notify('working...');
		d.resolve('ok');
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('working...');
		expect(fulfilledSpy).toHaveBeenCalledWith('ok');
	});
	it('can notify progress through promise returned from handler', () => {
		const d = $q.defer();
		
		const progressSpy = jasmine.createSpy();
		d.promise.then(null, null, progressSpy);
		
		const d2 = $q.defer();
		// Resolve original with nested promise
		d.resolve(d2.promise);
		// Notify on the nested promise
		d2.notify('working...');
		
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('working...');
	});
	it('allows attaching progressback in finally', () => {
		const d = $q.defer();
		const progressSpy = jasmine.createSpy();
		d.promise.finally(null, progressSpy);
		
		d.notify('working...');
		$rootScope.$apply();
		
		expect(progressSpy).toHaveBeenCalledWith('working...');
	});
	it('can make an immediately rejected promise', () => {
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		
		const promise = $q.reject('fail');
		promise.then(fulfilledSpy, rejectedSpy);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).not.toHaveBeenCalled();
		expect(rejectedSpy).toHaveBeenCalledWith('fail');
	});
	it('can make an immediately resolved promise', () => {
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		
		const promise = $q.when('ok');
		promise.then(fulfilledSpy, rejectedSpy);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		expect(rejectedSpy).not.toHaveBeenCalled();
	});
	it('can wrap a foreign promise', () => {
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		
		const promise = $q.when({
			then: function (handler) {
				$rootScope.$evalAsync(function () {
					handler('ok');
				});
			}
		});
		promise.then(fulfilledSpy, rejectedSpy);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		expect(rejectedSpy).not.toHaveBeenCalled();
	});
	it('takes callbacks directly when wrapping', () => {
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		const progressSpy = jasmine.createSpy();
		
		const wrapped = $q.defer();
		$q.when(
			wrapped.promise,
			fulfilledSpy,
			rejectedSpy,
			progressSpy
		);
		
		wrapped.notify('working...');
		wrapped.resolve('ok');
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		expect(rejectedSpy).not.toHaveBeenCalled();
		expect(progressSpy).toHaveBeenCalledWith('working...');
	});
	
	it('makes an immediately resolved promise with resolve', () => {
		const fulfilledSpy = jasmine.createSpy();
		const rejectedSpy = jasmine.createSpy();
		
		const promise = $q.resolve('ok');
		promise.then(fulfilledSpy, rejectedSpy);
		
		$rootScope.$apply();
		
		expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		expect(rejectedSpy).not.toHaveBeenCalled();
	});
	
	describe('all', () => {
		
		it('can resolve an array of promises to array of results', () => {
			const promise = $q.all([$q.when(1), $q.when(2), $q.when(3)]);
			const fulfilledSpy = jasmine.createSpy();
			promise.then(fulfilledSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
		});
		
		it('can resolve an object of promises to an object of results', () => {
			const promise = $q.all({a: $q.when(1), b: $q.when(2)});
			const fulfilledSpy = jasmine.createSpy();
			promise.then(fulfilledSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).toHaveBeenCalledWith({a: 1, b: 2});
		});
		
		
		it('resolves an empty array of promises immediately', () => {
			const promise = $q.all([]);
			const fulfilledSpy = jasmine.createSpy();
			promise.then(fulfilledSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).toHaveBeenCalledWith([]);
		});
		
		it('resolves an empty object of promises immediately', () => {
			const promise = $q.all({});
			const fulfilledSpy = jasmine.createSpy();
			promise.then(fulfilledSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).toHaveBeenCalledWith({});
		});
		
		it('rejects when any of the promises rejects', () => {
			const promise = $q.all([$q.when(1), $q.when(2), $q.reject('fail')]);
			const fulfilledSpy = jasmine.createSpy();
			const rejectedSpy = jasmine.createSpy();
			promise.then(fulfilledSpy, rejectedSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).not.toHaveBeenCalled();
			expect(rejectedSpy).toHaveBeenCalledWith('fail');
		});
		
		it('wraps non-promises in the input collection', () => {
			const promise = $q.all([$q.when(1), 2, 3]);
			const fulfilledSpy = jasmine.createSpy();
			promise.then(fulfilledSpy);
			
			$rootScope.$apply();
			
			expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
		});
		
	});
	
	describe('ES2015 style', () => {
		
		it('is a function', () => {
			expect($q instanceof Function).toBe(true);
		});
		
		it('expects a function as an argument', () => {
			expect($q).toThrow();
			$q(_.noop); // Just checking that this doesn't throw
		});
		
		it('returns a promise', () => {
			expect($q(_.noop)).toBeDefined();
			expect($q(_.noop).then).toBeDefined();
		});
		
		it('calls function with a resolve function', () => {
			const fulfilledSpy = jasmine.createSpy();
			$q(function (resolve) {
				resolve('ok');
			}).then(fulfilledSpy);
			$rootScope.$apply();
			expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		});
		
		it('calls function with a reject function', () => {
			const fulfilledSpy = jasmine.createSpy();
			const rejectedSpy = jasmine.createSpy();
			$q(function (resolve, reject) {
				reject('fail');
			}).then(fulfilledSpy, rejectedSpy);
			$rootScope.$apply();
			expect(fulfilledSpy).not.toHaveBeenCalled();
			expect(rejectedSpy).toHaveBeenCalledWith('fail');
		});
		
	});
	
	describe('$$q', () => {
		
		beforeEach(() => {
			jasmine.clock().install();
		});
		afterEach(() => {
			jasmine.clock().uninstall();
		});
		
		it('uses deferreds that do not resolve at digest', () => {
			const d = $$q.defer();
			const fulfilledSpy = jasmine.createSpy();
			
			d.promise.then(fulfilledSpy);
			d.resolve('ok');
			$rootScope.$apply();
			
			expect(fulfilledSpy).not.toHaveBeenCalled();
		});
		
		it('uses deferreds that resolve later', () => {
			const d = $$q.defer();
			const fulfilledSpy = jasmine.createSpy();
			
			d.promise.then(fulfilledSpy);
			d.resolve('ok');
			
			jasmine.clock().tick(1);
			
			expect(fulfilledSpy).toHaveBeenCalledWith('ok');
		});
		
		it('does not invoke digest', () => {
			const d = $$q.defer();
			d.promise.then(_.noop);
			d.resolve('ok');
			
			const watchSpy = jasmine.createSpy();
			$rootScope.$watch(watchSpy);
			
			jasmine.clock().tick(1);
			
			expect(watchSpy).not.toHaveBeenCalled();
		});
		
	});
});
