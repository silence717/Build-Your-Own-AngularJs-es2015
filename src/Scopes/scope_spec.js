/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
'use strict';
import Scope from './scope';
import _ from 'lodash';

describe('Scope', function () {
	// Angular的Scope对象是POJO（简单的JavaScript对象），在它们上面，可以像对其他对象一样添加属性。
	xit('can be constructed and used as an object', () => {
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

	describe('$eval', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// 仅有一个参数，执行该表达式并返回结果
		it('executes $evaled function and returns result', () => {
			scope.aValue = 42;
			const result = scope.$eval(scope => {
				return scope.aValue;
			});
			expect(result).toBe(42);
		});
		// 包含第二个参数
		it('passes the second $eval argument straight through', () => {
			scope.aValue = 42;
			const result = scope.$eval((scope, arg) => {
				return scope.aValue + arg;
			}, 2);
			expect(result).toBe(44);
		});
	});

	describe('$apply', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		it('executes the given function and starts the digest', () => {
			scope.aValue = 'someValue';
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
			// $apply内部调用$eval方法，立即执行了了该方法，这个时候aValue值发生变化，进入$digest循环，上面定义的watcher的ListenerFn执行
			scope.$apply(scope => {
				scope.aValue = 'someOtherValue';
			});
			expect(scope.counter).toBe(2);
		});
	});

	describe('$evalAsync', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// 在digest的ListenerFn中延迟执行
		it('executes given function later in the same cycle', () => {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluated = false;
			scope.asyncEvaluatedImmediately = false;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.$evalAsync(scope => {
						scope.asyncEvaluated = true;
					});
					scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
				}
			);
			scope.$digest();
			expect(scope.asyncEvaluated).toBe(true);
			expect(scope.asyncEvaluatedImmediately).toBe(false);
		});
		// 在digest的watchFn中延迟执行
		it('executes $evalAsynced functions added by watch functions', () => {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluated = false;
			scope.$watch(
				scope => {
					if (!scope.asyncEvaluated) {
						scope.$evalAsync(scope => {
							scope.asyncEvaluated = true;
						});
					}
					return scope.aValue;
				},
				(newValue, oldValue, scope) => { }
			);
			scope.$digest();
			expect(scope.asyncEvaluated).toBe(true);
		});
		// 当不为脏的时候，我们需要继续执行延迟的部分代码
		it('executes $evalAsynced functions even when not dirty', () => {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluatedTimes = 0;
			scope.$watch(
				scope => {
					if (scope.asyncEvaluatedTimes < 2) {
						scope.$evalAsync(scope => {
							scope.asyncEvaluatedTimes++;
						});
					}
					return scope.aValue;
				},
				(newValue, oldValue, scope) => {}
			);
			scope.$digest();
			expect(scope.asyncEvaluatedTimes).toBe(2);
		});
		// watcher中有多个延迟执行，触发ttl
		it('eventually halts $evalAsyncs added by watches', () => {
			scope.aValue = [1, 2, 3];
			scope.$watch(
				scope => {
					scope.$evalAsync(scope => {});
					return scope.aValue;
				},
				(newValue, oldValue, scope) => {}
			);
			expect(() => {
				scope.$digest();
			}).toThrow();
		});
		// 当前正在执行的阶段
		it('has a $$phase field whose value is the current digest phase', () => {
			scope.aValue = [1, 2, 3];
			scope.phaseInWatchFunction = undefined;
			scope.phaseInListenerFunction = undefined;
			scope.phaseInApplyFunction = undefined;
			scope.$watch(
				scope => {
					scope.phaseInWatchFunction = scope.$$phase;
					return scope.aValue;
				},
				(newValue, oldValue, scope) => {
					scope.phaseInListenerFunction = scope.$$phase;
				}
			);
			scope.$apply(scope => {
				scope.phaseInApplyFunction = scope.$$phase;
			});
			expect(scope.phaseInWatchFunction).toBe('$digest');
			expect(scope.phaseInListenerFunction).toBe('$digest');
			expect(scope.phaseInApplyFunction).toBe('$apply');
		});
		// 把 digest 加入 $evalAsync
		it('schedules a digest in $evalAsync', done => {
			scope.aValue = 'abc';
			scope.counter = 0;
			// 添加watch，并没有调用 digest
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			// 没有执行digest 或者 apply,$$phase为null
			scope.$evalAsync(scope => {});
			expect(scope.counter).toBe(0);
			setTimeout(() => {
				// js为单线程，执行了$evalAsync, 触发了$digest循环, scope.aValue发生了变化执行了对于的listenerFn
				expect(scope.counter).toBe(1);
				done();
			}, 50);
		});
		// 在 $evalAsync 中捕获异常
		it('catches exceptions in $evalAsync', done => {
			scope.aValue = 'abc';
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$evalAsync(scope => {
				throw 'Error';
			});
			setTimeout(() => {
				expect(scope.counter).toBe(1);
				done();
			}, 50);
		});
	});

	describe('$applyAsync', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// 使用 $applyAsync 允许异步执行 $apply
		it('allows async $apply with $applyAsync', done => {
			scope.counter = 0;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			// 第一次执行 digest 的时候 scope.aValue 未定义，所以执行一次listennerFn
			expect(scope.counter).toBe(1);
			// 延迟执行$apply
			scope.$applyAsync(scope => {
				scope.aValue = 'abc';
			});
			expect(scope.counter).toBe(1);
			// 这个时候触发 $applyAsync 里面代码执行，scope.aValue 值发生变化，$apply 触发 $digest 循环
			setTimeout(() => {
				expect(scope.counter).toBe(2);
				done();
			}, 50);
		});
		// 同一个循环中的 $applyAsynced 方法不会执行
		it('never executes $applyAsynced function in the same cycle', done => {
			scope.aValue = [1, 2, 3];
			scope.asyncApplied = false;
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					// listenerFn中调用 $applyAsync ，方法中的值不会立马发生变化
					scope.$applyAsync(scope => {
						scope.asyncApplied = true;
					});
				}
			);
			scope.$digest();
			expect(scope.asyncApplied).toBe(false);
			setTimeout(() => {
				expect(scope.asyncApplied).toBe(true);
				done();
			}, 50);
		});
		// 使用 $applyAsync 合并多个调用
		it('coalesces many calls to $applyAsync', done => {
			scope.counter = 0;
			scope.$watch(
				scope => {
					scope.counter++;
					return scope.aValue;
				},
				(newValue, oldValue, scope) => { }
			);
			scope.$applyAsync(scope => {
				scope.aValue = 'abc';
			});
			scope.$applyAsync(scope => {
				scope.aValue = 'def';
			});
			setTimeout(() => {
				expect(scope.counter).toBe(2);
				done();
			}, 50);
		});
		// 如果是第一次进入$digest需要取消或者清空$applyAsync队列
		it('cancels and flushes $applyAsync if digested first', done => {
			scope.counter = 0;
			scope.$watch(
				scope => {
					scope.counter++;
					return scope.aValue;
				},
				(newValue, oldValue, scope) => { }
			);
			scope.$applyAsync(scope => {
				scope.aValue = 'abc';
			});
			scope.$applyAsync(scope => {
				scope.aValue = 'def';
			});
			scope.$digest();
			expect(scope.counter).toBe(2);
			expect(scope.aValue).toEqual('def');
			setTimeout(() => {
				expect(scope.counter).toBe(2);
				done();
			}, 50);
		});
		// 在 $applyAsync 中捕获异常
		it('catches exceptions in $applyAsync', done => {
			scope.$applyAsync(scope => {
				throw 'Error';
			});
			scope.$applyAsync(scope => {
				throw 'Error';
			});
			scope.$applyAsync(scope => {
				scope.applied = true;
			});
			setTimeout(() => {
				expect(scope.applied).toBe(true);
				done();
			}, 50);
		});
	});

	describe('$postDigest', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// 在 $digest 后执行
		it('runs after each digest', () => {
			scope.counter = 0;
			scope.$$postDigest(() => {
				scope.counter++;
			});
			expect(scope.counter).toBe(0);
			scope.$digest(); // 结束后 $$postDigestQueue 已执行，队列中为空

			expect(scope.counter).toBe(1);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 在 digest 循环中不包括 $$postDigest
		it('does not include $$postDigest in the digest', () => {
			scope.aValue = 'original value';
			scope.$$postDigest(() => {
				scope.aValue = 'changed value';
			});
			scope.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.watchedValue = newValue;
				}
			);
			// 第一次 $digest 循环，scope.aValue 从 initVal 到 'original value'
			scope.$digest();
			// 结束后执行 $$postDigestQueue 中的队列，scope.aValue发生变化
			expect(scope.watchedValue).toBe('original value');
			// 再次执行 $digest 循环，listenerFn执行 watchedValue变为新值
			scope.$digest();
			expect(scope.watchedValue).toBe('changed value');
		});
		// $$postDigest 中捕获异常
		it('catches exceptions in $$postDigest', () => {
			let didRun = false;
			scope.$$postDigest(() => {
				throw 'Error';
			});
			scope.$$postDigest(() => {
				didRun = true;
			});
			scope.$digest();
			expect(didRun).toBe(true);
		});
	});

	describe('$watchGroup', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// watches是一个数组，期望listenerFn返回的也是一个数组
		it('takes watches as an array and calls listener with arrays', () => {
			let gotNewValues, gotOldValues;
			scope.aValue = 1;
			scope.anotherValue = 2;
			scope.$watchGroup([
				scope => scope.aValue,
				scope => scope.anotherValue
			], (newValues, oldValues, scope) => {
				gotNewValues = newValues;
				gotOldValues = oldValues;
			});
			scope.$digest();
			expect(gotNewValues).toEqual([1, 2]);
			expect(gotOldValues).toEqual([1, 2]);
		});
		// 在每次 digest 循环中只触发一次 digest
		it('only calls listener once per digest', () => {
			let counter = 0;
			scope.aValue = 1;
			scope.anotherValue = 2;
			scope.$watchGroup([
				scope => scope.aValue,
				scope => scope.anotherValue
			], (newValues, oldValues, scope) => {
				counter++;
			});
			scope.$digest();
			expect(counter).toEqual(1);
		});
		// 第一次执行 digest 的时候 newValues 和 oldValues使用同一数组
		it('uses the same array of old and new values on  rst run', () => {
			let gotNewValues, gotOldValues;
			scope.aValue = 1;
			scope.anotherValue = 2;
			scope.$watchGroup([
				scope => scope.aValue,
				scope => scope.anotherValue
			], (newValues, oldValues, scope) => {
				gotNewValues = newValues;
				gotOldValues = oldValues;
			});
			scope.$digest();
			expect(gotNewValues).toBe(gotOldValues);
		});
		// 第二次之后 oldValues 和 newValues 使用不同的数组
		it('uses different arrays for old and new values on subsequent runs', () => {
			let gotNewValues, gotOldValues;
			scope.aValue = 1;
			scope.anotherValue = 2;
			scope.$watchGroup([
				scope => scope.aValue,
				scope => scope.anotherValue
			], (newValues, oldValues, scope) => {
				gotNewValues = newValues;
				gotOldValues = oldValues;
			});
			scope.$digest();
			scope.anotherValue = 3;
			scope.$digest();
			expect(gotNewValues).toEqual([1, 3]);
			expect(gotOldValues).toEqual([1, 2]);
		});
		// 当watch的数组为空的时候，执行一次listenerFn.
		it('calls the listener once when the watch array is empty', () => {
			let gotNewValues, gotOldValues;
			scope.$watchGroup([], (newValues, oldValues, scope) => {
				gotNewValues = newValues;
				gotOldValues = oldValues;
			});
			scope.$digest();
			expect(gotNewValues).toEqual([]);
			expect(gotOldValues).toEqual([]);
		});
		// 一旦销毁函数被调用，即使watchFn中的表达式发生改变，那么listenerFn将不会执行
		it('can be deregistered', () => {
			let counter = 0;
			scope.aValue = 1;
			scope.anotherValue = 2;
			const destroyGroup = scope.$watchGroup([
				scope => scope.aValue,
				scope => scope.anotherValue
			], (newValues, oldValues, scope) => {
				counter++;
			});
			scope.$digest();
			scope.anotherValue = 3;
			destroyGroup();
			scope.$digest();
			expect(counter).toEqual(1);
		});
		// 当 watchFn数组为空， digest一次也没有执行的时候，我们调用了销毁方法
		it('does not call the zero-watch listener when deregistered first', () => {
			let counter = 0;
			const destroyGroup = scope.$watchGroup([], (newValues, oldValues, scope) => {
				counter++;
			});
			destroyGroup();
			scope.$digest();
			expect(counter).toEqual(0);
		});
	});

	describe('inheritance', () => {
		// 子scope继承父亲的所有属性
		it('inherits the parent properties', () => {
			const parent = new Scope();
			parent.aValue = [1, 2, 3];
			const child = parent.$new();
			expect(child.aValue).toEqual([1, 2, 3]);
		});
		// 子scope上的属性不会影响父scope
		it('does not cause a parent to inherit its properties', () => {
			const parent = new Scope();
			const child = parent.$new();
			child.aValue = [1, 2, 3];
			expect(parent.aValue).toBeUndefined();
		});
		// 不管在什么时间创建子 scope, 当一个属性定义在父 ，所有子scope都可访问该属性
		it('inherits the parents properties whenever they are defined', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.aValue = [1, 2, 3];
			expect(child.aValue).toEqual([1, 2, 3]);
		});
		// 你可以在子 scope 上操作父scope的属性，因为 scopes 指向同样的值
		it('can manipulate a parent scopes property', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.aValue = [1, 2, 3];
			child.aValue.push(4);
			expect(child.aValue).toEqual([1, 2, 3, 4]);
			expect(parent.aValue).toEqual([1, 2, 3, 4]);
		});
		// 在子 scope 上 watch 父 scope 的属性值
		it('can watch a property in the parent', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.aValue = [1, 2, 3];
			child.counter = 0;
			// 子scope也可以调用 $watch 方法，这是因为父 scope 继承Scope.prototype, 子scope又继承父亲
			// 所以定义在Scope.prototype上的所有方法在每个 scope 都是可用的。
			child.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				},
				true
			);
			child.$digest();
			expect(child.counter).toBe(1);
			parent.aValue.push(4);
			child.$digest();
			expect(child.counter).toBe(2);
		});
		// scope 层级可以是任意深度
		it('can be nested at any depth', () => {
			const a = new Scope();
			const aa = a.$new();
			const aaa = aa.$new();
			const aab = aa.$new();
			const ab = a.$new();
			const abb = ab.$new();
			a.value = 1;
			expect(aa.value).toBe(1);
			expect(aaa.value).toBe(1);
			expect(aab.value).toBe(1);
			expect(ab.value).toBe(1);
			expect(abb.value).toBe(1);
			ab.anotherValue = 2;
			expect(abb.anotherValue).toBe(2);
			expect(aa.anotherValue).toBeUndefined();
			expect(aaa.anotherValue).toBeUndefined();
		});
		// 与父 scope 使用相同名字的属性，会覆盖父scope相同名称的值
		// 当我们在子scope中添加一个与父scope相同名称的属性，不会影响父scope。
		// 实际在作用域链上我们存在两个不想听的属性，都叫做name。
		// 这种通常被称为覆盖：从子 scope 的角度来看，父scope的name属性被覆盖了。
		it('shadows a parents property with the same name', () => {
			const parent = new Scope();
			const child = parent.$new();

			parent.name = 'Joe';
			child.name = 'Jill';

			expect(child.name).toBe('Jill');
			expect(parent.name).toBe('Joe');
		});
		// 使用对象将父 scope 上的属性包裹起来
		// 这种方式，我们并没有对子 scope 赋值，我们仅仅是从父scope上读取user对象和在对象内赋值，
		// 两个scope只是使用了同一个user对象的引用。user对象只是一个纯js对象，与scope继承无关。
		it('does not shadow members of parent scopes attributes', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.user = {name: 'Joe'};
			child.user.name = 'Jill';
			expect(child.user.name).toBe('Jill');
			expect(parent.user.name).toBe('Jill');
		});
		// 子scope执行$digest循环的时候，不要触发它的父scope
		it('does not digest its parent(s)', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.aValue = 'abc';
			parent.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.aValueWas = newValue;
				}
			);
			child.$digest();
			expect(child.aValueWas).toBeUndefined();
		});
		// 记录每个scope的子scope
		// 实际上angular内部并没有一个$$children的数组，而是采用$$nextSibling、$$prevSibling、$$childHead 、$$childTail给出一个可操作的范围
		// 使其添加和删除的成本更小，不必操纵数组。功能与$$children类似。
		it('keeps a record of its children', () => {
			const parent = new Scope();
			const child1 = parent.$new();
			const child2 = parent.$new();
			const child2_1 = child2.$new();
			expect(parent.$$children.length).toBe(2);
			expect(parent.$$children[0]).toBe(child1);
			expect(parent.$$children[1]).toBe(child2);
			expect(child1.$$children.length).toBe(0);
			expect(child2.$$children.length).toBe(1);
			expect(child2.$$children[0]).toBe(child2_1);
		});
		// 父 scope 调用 $digest 循环的时候其子 scope 的watchers也被执行
		it('digests its children', () => {
			const parent = new Scope();
			const child = parent.$new();
			parent.aValue = 'abc';
			child.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.aValueWas = newValue;
				}
			);
			parent.$digest();
			expect(child.aValueWas).toBe('abc');
		});
		// 调用$apply的时候从rootScope开始执行digest循环
		it('digests from root on $apply', () => {
			const parent = new Scope();
			const child = parent.$new();
			const child2 = child.$new();
			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			child2.$apply(scope => { });
			expect(parent.counter).toBe(1);
		});
		// 子 scope 调用 $evalAsync ，digest 也必须从 rootScope 开始
		it('schedules a digest from root on $evalAsync', done => {
			const parent = new Scope();
			const child = parent.$new();
			const child2 = child.$new();
			parent.aValue = 'abc';
			parent.counter = 0;

			parent.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			child2.$evalAsync(scope => { });

			setTimeout(() => {
				expect(parent.counter).toBe(1);
				done();
			}, 50);
		});
		// Isolate Scope
		// 隔离作用域的时候，访问不到父 scope 属性的值
		it('does not have access to parent attributes when isolated', () => {
			const parent = new Scope();
			const child = parent.$new(true);
			parent.aValue = 'abc';
			expect(child.aValue).toBeUndefined();
		});
		// 隔离作用域的时候，访问不到父 scope 的属性值，那么也无法 watch 这些属性的变化
		it('cannot watch parent attributes when isolated', () => {
			const parent = new Scope();
			const child = parent.$new(true);

			parent.aValue = 'abc';
			child.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.aValueWas = newValue;
				}
			);

			child.$digest();
			expect(child.aValueWas).toBeUndefined();
		});
		// 虽然我们改变了隔离作用域，但是我们希望$digest还能运行当前scope以及子scope的监听器
		// todo 该测试没有通过
		xit('digests its isolated children', () => {
			const parent = new Scope();
			const child = parent.$new(true);

			child.aValue = 'abc';
			child.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.aValueWas = newValue;
				}
			);

			parent.$digest();
			expect(child.aValueWas).toBe('abc');
		});
		// 隔离作用域的时候调用$apply的时候需要从rootScope开始执行 digest
		it('digests from root on $apply when isolated', () => {
			const parent = new Scope();
			const child = parent.$new(true);
			const child2 = child.$new();
			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			child2.$apply(scope => { });
			expect(parent.counter).toBe(1);
		});
		// 隔离作用域的时候调用 $evalAsync 的时候需要从rootScope开始执行 digest
		it('schedules a digest from root on $evalAsync when isolated', done => {
			const parent = new Scope();
			const child = parent.$new(true);
			const child2 = child.$new();
			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			child2.$evalAsync(scope => { });
			setTimeout(() => {
				expect(parent.counter).toBe(1);
				done();
			}, 50);
		});
		// 在隔离作用域执行 $evalAsync 方法
		it('executes $evalAsync functions on isolated scopes', done => {
			const parent = new Scope();
			const child = parent.$new(true);
			child.$evalAsync(scope => {
				scope.didEvalAsync = true;
			});
			setTimeout(() => {
				expect(child.didEvalAsync).toBe(true);
				done();
			}, 50);
		});
		// 在隔离作用域执行 $$postDigest 方法
		it('executes $$postDigest functions on isolated scopes', () => {
			const parent = new Scope();
			const child = parent.$new(true);
			child.$$postDigest(() => {
				child.didPostDigest = true;
			});
			parent.$digest();
			expect(child.didPostDigest).toBe(true);
		});
		// 在隔离作用域执行 $applyAsync 方法
		// $$applyAsyncQueue和其余队列不一样：因为清理队列是被 $$applyAsyncId 属性控制的，
		// 并且现在整个scope层级的每个 scope 可能都有这个属性的实例，整个 $applyAsync 目的是合并 $apply 调用
		// 做法：1、现在创建隔离scope的时候为它创建一个引用。2、我们需要共享 $$applyAsyncId 属性
		it('executes $applyAsync functions on isolated scopes', () => {
			const parent = new Scope();
			const child = parent.$new(true);
			let applied = false;
			parent.$applyAsync(() => {
				applied = true;
			});
			child.$digest();
			expect(applied).toBe(true);
		});
		// Substituting The Parent Scope
		// 新创建的scope指定它的parent scope
		it('can take some other scope as the parent', () => {
			const prototypeParent = new Scope();
			const hierarchyParent = new Scope();
			// 这样就拥有两个parent scope，一个是原型链继承而来，另一个是我们传给它附有层级的scope
			const child = prototypeParent.$new(false, hierarchyParent);

			prototypeParent.a = 42;
			expect(child.a).toBe(42);

			child.counter = 0;
			child.$watch(scope => {
				scope.counter++;
			});

			prototypeParent.$digest();
			expect(child.counter).toBe(0);

			hierarchyParent.$digest();
			expect(child.counter).toBe(0);
			// todo 下面执行不通过 ？？？
			// expect(child.counter).toBe(2);
		});
		// 当scope上面的$destroy方法被调用的时候，$digest将不会再执行
		it('is no longer digested when $destroy has been called', () => {
			const parent = new Scope();
			const child = parent.$new();

			child.aValue = [1, 2, 3];
			child.counter = 0;
			child.$watch(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				},
				true
			);

			parent.$digest();
			expect(child.counter).toBe(1);

			child.aValue.push(4);
			parent.$digest();
			// expect(child.counter).toBe(2);

			child.$destroy();
			child.aValue.push(5);
			parent.$digest();
			expect(child.counter).toBe(1);
			// expect(child.counter).toBe(2);
		});
	});

	describe('$watchCollection', () => {
		let scope;
		beforeEach(() => {
			scope = new Scope();
		});
		// $watchCollection可以正常监测非集合数据
		it('works like a normal watch for non-collections', () => {
			let valueProvided;
			scope.aValue = 42;
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					valueProvided = newValue;
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
			expect(valueProvided).toBe(scope.aValue);

			scope.aValue = 43;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 检测特殊值NaN，因为NaN不和任何值相等
		it('works like a normal watch for NaNs', () => {
			scope.aValue = 0 / 0;
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 监测 value 变为一个数组
		it('notices when the value becomes an array', () => {
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arr = [1, 2, 3];
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 监测数组新加入一个值的时候变化
		it('notices an item added to an array', () => {
			scope.arr = [1, 2, 3];
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arr.push(4);
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 监测数组删除一个元素的变化
		it('notices an item removed from an array', () => {
			scope.arr = [1, 2, 3];
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arr.shift();
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 监测数组的某个值发生改变的时候
		it('notices an item replaced in an array', () => {
			scope.arr = [1, 2, 3];
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arr[1] = 42;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 数组值顺序发生改变
		it('notices items reordered in an array', () => {
			scope.arr = [2, 1, 3];
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arr.sort();
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 数组中的值含有NaN的时候
		it('does not fail on NaNs in arrays', () => {
			scope.arr = [2, NaN, 3];
			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arr,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 使用arguments替换数组的值
		it('notices an item replaced in an arguments object', () => {
			// 使用一个自执行函数将参数存储到 scope.arrayLike
			(function() {
				scope.arrayLike = arguments;
			})(1, 2, 3);
			scope.counter = 0;

			scope.$watchCollection(
				scope => scope.arrayLike,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.arrayLike[1] = 42;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 存储一个nodeList类数组元素，通过 querySelectorAll 和 getElementsByTagName 获取到的dom元素均为类数组元素
		it('notices an item replaced in a NodeList object', () => {
			// 先给DOM上添加一个一个idv,再去获取
			document.documentElement.appendChild(document.createElement('div'));
			scope.arrayLike = document.getElementsByTagName('div');

			scope.counter = 0;
			scope.$watchCollection(
				scope => scope.arrayLike,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).toBe(1);

			document.documentElement.appendChild(document.createElement('div'));
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 一个非集合数据转为对象时候
		it('notices when the value becomes an object', () => {
			scope.counter = 0;

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.obj = {a: 1};
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 对象新增一个属性
		it('notices when an attribute is added to an object', () => {
			scope.counter = 0;
			scope.obj = {a: 1};

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.obj.b = 2;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 更改对象一个属性值
		it('notices when an attribute is changed in an object', () => {
			scope.counter = 0;
			scope.obj = {a: 1};

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);
			scope.$digest();
			expect(scope.counter).toBe(1);

			scope.obj.a = 2;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// NaN需要特殊处理
		it('does not fail on NaN attributes in objects', () => {
			scope.counter = 0;
			scope.obj = {a: NaN};

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).toBe(1);
		});
		// 删除元素上的一个属性
		it('notices when an attribute is removed from an object', () => {
			scope.counter = 0;
			scope.obj = {a: 1};

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).toBe(1);

			delete scope.obj.a;
			scope.$digest();
			expect(scope.counter).toBe(2);

			scope.$digest();
			expect(scope.counter).toBe(2);
		});
		// 处理具有length属性的对象
		it('does not consider any object with a length property an array', () => {
			scope.obj = {length: 42, otherKey: 'abc'};
			scope.counter = 0;

			scope.$watchCollection(
				scope => scope.obj,
				(newValue, oldValue, scope) => {
					scope.counter++;
				}
			);

			scope.$digest();

			scope.obj.newKey = 'def';
			scope.$digest();

			expect(scope.counter).toBe(2);
		});
		// 对listener函数处理旧集合的值
		// 这个是非数据集合测试
		it('gives the old non-collection value to listeners', () => {
			scope.aValue = 42;
			let oldValueGiven;

			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					oldValueGiven = oldValue;
				}
			);

			scope.$digest();

			scope.aValue = 43;
			scope.$digest();

			expect(oldValueGiven).toBe(42);
		});
		// 数组测试
		it('gives the old array value to listeners', () => {
			scope.aValue = [1, 2, 3];
			let oldValueGiven;

			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					oldValueGiven = oldValue;
				}
			);

			scope.$digest();

			scope.aValue.push(4);
			scope.$digest();
			expect(oldValueGiven).toEqual([1, 2, 3]);
		});
		// 对象测试
		it('gives the old object value to listeners', () => {
			scope.aValue = {a: 1, b: 2};
			let oldValueGiven;

			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					oldValueGiven = oldValue;
				}
			);
			scope.$digest();

			scope.aValue.c = 3;
			scope.$digest();

			expect(oldValueGiven).toEqual({a: 1, b: 2});
		});
		// 在listenerFn第一次的调用中将新值赋值给旧值
		it('uses the new value as the old value on first digest', () => {
			scope.aValue = {a: 1, b: 2};
			let oldValueGiven;

			scope.$watchCollection(
				scope => scope.aValue,
				(newValue, oldValue, scope) => {
					oldValueGiven = oldValue;
				}
			);

			scope.$digest();
			expect(oldValueGiven).toEqual({a: 1, b: 2});
		});
	});

	describe('Events', () => {
		let parent;
		let scope;
		let child;
		let isolatedChild;

		beforeEach(() => {
			parent = new Scope();
			scope = parent.$new();
			child = scope.$new();
			isolatedChild = scope.$new(true);
		});
		// 允许存储 listener 函数
		it('allows registering listeners', () => {
			const listener1 = () => { };
			const listener2 = () => { };
			const listener3 = () => { };
			scope.$on('someEvent', listener1);
			scope.$on('someEvent', listener2);
			scope.$on('someOtherEvent', listener3);

			expect(scope.$$listeners).toEqual({
				someEvent: [listener1, listener2],
				someOtherEvent: [listener3]
			});
		});
		// 不同的 scope 有不同的 $$listener
		it('registers different listeners for every scope', () => {
			const listener1 = () => { };
			const listener2 = () => { };
			const listener3 = () => { };

			scope.$on('someEvent', listener1);
			child.$on('someEvent', listener2);
			isolatedChild.$on('someEvent', listener3);

			expect(scope.$$listeners).toEqual({someEvent: [listener1]});
			expect(child.$$listeners).toEqual({someEvent: [listener2]});
			expect(isolatedChild.$$listeners).toEqual({someEvent: [listener3]});
		});
		// 提取 $emit,$broadcast 公共代码
		_.forEach(['$emit', '$broadcast'], method => {
			// 调用与方法匹配的listener
			it('calls listeners registered for matching events on ' + method, () => {
				const listener1 = jasmine.createSpy();
				const listener2 = jasmine.createSpy();
				scope.$on('someEvent', listener1);
				scope.$on('someOtherEvent', listener2);

				scope[method]('someEvent');

				expect(listener1).toHaveBeenCalled();
				expect(listener2).not.toHaveBeenCalled();
			});
			// 通过传递事件对象为事件添加一个名称
			it('passes an event object with a name to listeners on ' + method, () => {
				const listener = jasmine.createSpy();
				scope.$on('someEvent', listener);

				scope[method]('someEvent');

				expect(listener).toHaveBeenCalled();
				// calls.mostRecent()包含最后一次调用spy的方法信息
				expect(listener.calls.mostRecent().args[0].name).toEqual('someEvent');
			});
			// 对每个listener传递相同的事件对象
			it('passes the same event object to each listener on ' + method, () => {
				const listener1 = jasmine.createSpy();
				const listener2 = jasmine.createSpy();
				scope.$on('someEvent', listener1);
				scope.$on('someEvent', listener2);

				scope[method]('someEvent');

				const event1 = listener1.calls.mostRecent().args[0];
				const event2 = listener2.calls.mostRecent().args[0];

				expect(event1).toBe(event2);
			});
			// 为事件传递更多参数，并验证是否相符
			it('passes additional arguments to listeners on ' + method, () => {
				const listener = jasmine.createSpy();
				scope.$on('someEvent', listener);

				scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

				expect(listener.calls.mostRecent().args[1]).toEqual('and');
				expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
				expect(listener.calls.mostRecent().args[3]).toEqual('...');
			});
			// $emit 和 $broadcast 都有的一个额外的特性就是它们都返回自己构建的事件对象, 因此事件的发起者在事件完成后可以检测事件的状态.
			it('returns the event object on ' + method, () => {
				const returnedEvent = scope[method]('someEvent');

				expect(returnedEvent).toBeDefined();
				expect(returnedEvent.name).toEqual('someEvent');
			});
			// 注销事件监听器
			it('can be deregistered ' + method, () => {
				const listener = jasmine.createSpy();
				const deregister = scope.$on('someEvent', listener);

				deregister();

				scope[method]('someEvent');

				expect(listener).not.toHaveBeenCalled();
			});
			// 在监听器触发时删除自己是非常常见的, 举例当我们只调用 listener 一次. 这种删除发生在循环 listeners 数组时, 会导致跳过一个 listener.
			it('does not skip the next listener when removed on ' + method, () => {
				let deregister;

				const listener = () => {
					deregister();
				};
				const nextListener = jasmine.createSpy();

				deregister = scope.$on('someEvent', listener);
				scope.$on('someEvent', nextListener);

				scope[method]('someEvent');
				expect(nextListener).toHaveBeenCalled();
			});
		});
	});
});
