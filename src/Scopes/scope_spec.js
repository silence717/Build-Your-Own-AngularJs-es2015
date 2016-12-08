/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
'use strict';
import Scope from './scope';
import _ from 'lodash';

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
		// 放弃持续不稳定的digest,如果两个watcher不断互相调用，这个时候会造成数据一直不稳定
		it('gives up on the watches after 10 iterations', () => {
			scope.counterA = 0;
			scope.counterB = 0;
			scope.$watch(
				scope => scope.counterA,
				(newValue, oldValue, scope) => {
					scope.counterB++;
				}
			);
			scope.$watch(
				scope => scope.counterB,
				(newValue, oldValue, scope) => {
					scope.counterA++;
				}
			);
			expect(() => { scope.$digest(); }).toThrow();
		});
		// 假设在一个digest循环中，有很多的watcher,尽可能的减少他的执行次数是非常有必要的。
		// 我们可以做些什么来减少 watcher 的执行次数呢, 只需要记录最近一次结果是脏的 watcher,
		// 第二次循环的时候, 比较当前执行的 watcher 是否是最后记住的 watcher,
		// 如果是, 说明, 剩余的 watcher 上次的结果都是干净的, 没有必要全部循环完, 直接退出循环就好
		it('ends the digest when the last watch is clean', () => {
			scope.array = _.range(100);
			let watchExecutions = 0;
			_.times(100, i => {
				scope.$watch(
					scope => {
						watchExecutions++;
						return scope.array[i];
					},
					(newValue, oldValue, scope) => {}
				); });
			scope.$digest();
			expect(watchExecutions).toBe(200);
			scope.array[0] = 420;
			scope.$digest();
			expect(watchExecutions).toBe(301);
		});
		// 在listenerFn中添加watch，第二个watch没有执行，
		// 原因是在第二次 digest 循环中, 我们检测到第一个 watcher 作为最后一次记录的脏 watcher,直接跳出循环
		// 修复： 当我们添加一个新的 watcher 时, 重新设置 $$lastDirtyWatch 为 null, 禁用优化.
		it('does not end digest so that new watches are not run', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.$watch(
						scope => scope.aValue,
						(newValue, oldValue, scope) => {
							scope.counter++;
						}
					);
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 基于值的脏检查,基于目前的实现是不可能的，所以angular为$watch提供了第3个参数
		// objectEquality(default:false):Compare for object equality using angular.equals instead of comparing for reference equality.
		// 基于值的脏检查意味着如果新旧值是对象或者数组，我们必须遍历其中包含的所有内容。如果它们之间有任何差异，监听器就脏了。如果该值包含嵌套的对象或者数组，它也会递归地按值比较。
		it('compares based on value if enabled', () => {
			scope.aValue = [1, 2, 3];
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				},
				true
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
			scope.aValue.push(4);
			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 处理NaN的这种情况，因为在js中NaN永远不等于自己本身
		it('correctly handles NaNs', () => {
			// 我们可能不会自己定义NaN，但是watch是一个表达式，它可能会返回这样一个值，这样的话digest很快会达到ttl
			scope.number = 0 / 0;
			scope.counter = 0;
			scope.$watch(
				scope => scope.number,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 定义两个watch, 第一个watchFn中发生异常，我们期望抛出异常，程序继续执行
		it('catches exceptions in watch functions and continues', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			scope.$watch(
				scope => { throw 'Error'; },
				(newValue, oldValue, scope) => { }
			);
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 定义两个watch, 第一个listenerFn中发生异常，抛出异常，程序正常执行
		it('catches exceptions in listener functions and continues', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					throw 'Error';
				}
			);
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 销毁监听器
		it('allows destroying a $watch with a removal function', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			const destroyWatch = scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
			scope.aValue = 'def';
			scope.$digest();
			expect(scope.counter).toBe(2);
			scope.aValue = 'ghi';
			destroyWatch();
			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 删除监听器的时候，我们应该只删除自己，不对其余 $$watcher 产生影响
		it('allows destroying a $watch during digest', () => {
			scope.aValue = 'abc';
			const watchCalls = [];
			scope.$watch(
				scope => {
					watchCalls.push(' rst');
					return scope.aValue;
				}
			);
			const destroyWatch = scope.$watch(
				scope => {
					watchCalls.push('second');
					destroyWatch();
				}
			);
			scope.$watch(
				scope => {
					watchCalls.push('third');
					return scope.aValue;
				}
			);
			scope.$digest();
			expect(watchCalls).toEqual([' rst', 'second', 'third', ' rst', 'third']);
		});
		// 在一个 watcher 中删除另一个 watcher
		// 第一个 watcher 的 watch 被执行, 它是脏的, 被存储在 $$lastDirtyWatch, 它的 listener 被执行, 销毁第二个 watcher, 数组变短, 它成了第二个.
		// 第一个 watcher 又被执行了一遍, 这次它是干净的, 于是跳出循环, 第三个 watcher 始终不执行.
		it('allows a $watch to destroy another during digest', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					destroyWatch();
				}
			);
			const destroyWatch = scope.$watch(
				scope => { },
				(newValue, oldValue, scope) => {}
			);
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 在一个watcher中删除多个watcher
		// 这样我们在循环的时候必须判断当前watcher是否存在，它有可能被别的watcher删除
		it('allows destroying several $watches during digest', () => {
			scope.aValue = 'abc';
			scope.counter = 0;
			const destroyWatch1 = scope.$watch(
				scope => {
					destroyWatch1();
					destroyWatch2();
				}
			);
			const destroyWatch2 = scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(0);
		});
	});
});
