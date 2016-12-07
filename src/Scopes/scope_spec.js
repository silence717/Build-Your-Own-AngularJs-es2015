/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
'use strict';
import Scope from './scope';

describe('Scope', function () {
	// Angular的Scope对象是POJO（简单的JavaScript对象），在它们上面，可以像对其他对象一样添加属性。
	it('can be constructed and used as an object', () => {
		const scope = new Scope();
		scope.aProperty = 1;
		expect(scope.aProperty).toBe(1);
	});

	describe('digest', () => {
		let scope;

		beforeEach(() => {
			scope = new Scope();
		});
		// 测试$digest调用后，监听器函数被调用
		it('calls the listener function of a watch on first $digest', () => {
			const watchFn = () => 'wat';
			const listenerFn = jasmine.createSpy();
			scope.$watch(watchFn, listenerFn);

			scope.$digest();

			expect(listenerFn).toHaveBeenCalled();
		});
		// 在调用监控函数的时候，使用当前作用域作为实参，就是scope作为watchFn的参数
		it('calls the watch function with the scope as the argument', () => {
			const watchFn = jasmine.createSpy();
			const listenerFn = () => { };
			scope.$watch(watchFn, listenerFn);
			scope.$digest();
			expect(watchFn).toHaveBeenCalledWith(scope);
		});
		// 当scope监听的值发生改变的时候再去执行listenerFn
		it('calls the listener function when the watched value changes', () => {
			scope.someValue = 'a';
			scope.counter = 0;
			scope.$watch(
				scope => scope.someValue,
				(newValue, oldValue, scope) => { scope.counter++; }
			);
			expect(scope.counter).toBe(0);
			scope.$digest();
			expect(scope.counter).toBe(1);
			scope.$digest();
			expect(scope.counter).toBe(1);
			scope.someValue = 'b';
			expect(scope.counter).toBe(1);
			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 当watchFn的的值第一次为undefined时候也需要调用listenerFn
		// 当没有初始化last值得时候，此测试不能通过
		it('calls listener when watch value is first undefined', () => {
			scope.counter = 0;
			scope.$watch(
				scope => scope.someValue,
				(newValue, oldValue, scope) => { scope.counter++; }
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 第一次的时候添加判断,旧值为initWatchVal时候，将它替换掉
		it('calls listener with new value as old value the first time', () => {
			scope.someValue = 123;
			let oldValueGiven = '';
			scope.$watch(
				scope => scope.someValue,
				(newValue, oldValue) => { oldValueGiven = oldValue; }
			);
			scope.$digest();
			expect(oldValueGiven).toBe(123);
		});
		// 如果你想在每次Angular的作用域被digest的时候得到通知，可以利用每次digest的时候挨个执行监听器这个事情，
		// 只要注册一个没有监听函数的监听器就可以了。
		// 想要支持这个用例，我们需要在$watch里面检测是否监控函数被省略了，如果是这样，用个空函数来代替它
		it('may have watchers that omit the listener function', () => {
			const watchFn = jasmine.createSpy().and.returnValue('something');
			scope.$watch(watchFn);
			scope.$digest();
			expect(watchFn).toHaveBeenCalled();
		});
		// 当数据脏的时候持续Digest
		it('triggers chained watchers in the same digest', () => {
			scope.name = 'Jane';
			// 第一个watch变量scope.nameUpper，第一次执行的时候scope.nameUpper不存在，所以listenerFn不执行。这个时候就需要持续digest，直到数据稳定
			scope.$watch(
				scope => scope.nameUpper,
				(newValue, oldValue, scope) => {
					if (newValue) {
						scope.initial = newValue.substring(0, 1) + '.';
					}
				});
			// 第二个watch变量scope.name，第一次执行存在，执行listenerFn,给scope.nameUpper赋值
			scope.$watch(
				scope => scope.name,
				(newValue, oldValue, scope) => {
					if (newValue) {
						scope.nameUpper = newValue.toUpperCase();
					}
				});
			scope.$digest();
			expect(scope.initial).toBe('J.');
			scope.name = 'Bob';
			scope.$digest();
			expect(scope.initial).toBe('B.');
		});
	});
});
