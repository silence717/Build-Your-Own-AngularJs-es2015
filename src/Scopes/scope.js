/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
import _ from 'lodash';

// 引入一个初始化函数
function initWatchVal() {}
// 添加一个类数组的判断方法，数组元素必须有一个length数字的属性
function isArrayLike(obj) {
	if (_.isNull(obj) || _.isUndefined(obj)) {
		return false;
	}
	const length = obj.length;
	return _.isNumber(length);
}

export default class Scope {

	constructor() {
		// 在Angular框架中，双美元符前缀$$表示这个变量被当作私有的来考虑，不应当在外部代码中调用。
		// 存储注册过的所有监听器
		this.$$watchers = [];
		// 最后一个watcher到的脏值
		this.$$lastDirtyWatch = null;
		// 存储$evalAsync列入计划的任务
		this.$$asyncQueue = [];
		// 存储需要异步执行的 $apply 任务
		this.$$applyAsyncQueue = [];
		// 存储需要异步执行的任务标识
		this.$$applyAsyncId = null;
		// 存储现在正在做的信息，阶段
		this.$$phase = null;
		// 在 $digest 执行后需要执行的队列
		this.$$postDigestQueue = [];
		// 存储子scope
		this.$$children = [];
		// 添加一个rootScope的引用
		this.$root = this;
	}

	/**
	 * 使用$watch，可以在Scope上添加一个监听器。当Scope上发生变更时，监听器会收到提示
	 * @param watchFn   一个监控函数，用于指定所关注的那部分数据。可以是一个表达式，也可以为一个函数。
	 * @param listenerFn  一个监听函数，用于在数据变更的时候接受提示。
	 * @param valueEq:  可选参数，true - 基于值的脏检查，false - 基于引用的检查，默认false.不传的时候为undefined,通过两次取反使其为false
	 * 为什么添加一个last？
	 * 比较watch函数返回值和存储last属性的值大部分没有问题。
	 * 只有第一次执行watch的时候，我们并没有设置last的值，值为undefined。
	 * 当watch函数首次返回的置为undefined时候，这样的判断就会失效。
	 * 所以我们添加一个初始化值--空函数，数组也是对象的一直，对象和对象永远不会相等。
	 */
	$watch(watchFn, listenerFn, valueEq) {
		const watcher = {
			watchFn: watchFn,
			listenerFn: listenerFn || function () {},
			valueEq: !!valueEq,
			last: initWatchVal
		};
		// 为了避免删除的时候数组塌陷，对其他的 watcher 造成影响，所以每次新加watcher从头开始添加
		this.$$watchers.unshift(watcher);
		// 新添加 watcher 的时候，无论在哪个 scope 执行scope，都把唯一的 $$lastDirtyWatch 置为 null
		// 修复监听器中添加watcher不执行问题，重新设置 $$lastDirtyWatch 为 null
		this.$root.$$lastDirtyWatch = null;
		// 为了销毁监听器，我们给$watch返回一个可以从 $$watcher 中删除监听器的函数
		return () => {
			const index = this.$$watchers.indexOf(watcher);
			if (index >= 0) {
				this.$$watchers.splice(index, 1);
				// 当我们删除一个watcher的时候，也将最后一次的脏值变为null
				this.$root.$$lastDirtyWatch = null;
			}
		};
	}

	/**
	 * 对每个监听器，我们调用监控函数，把作用域自身当作实参传递进去，然后比较这个返回值和上次返回值，如果不同，就调用监听函数
	 * @returns {*} 把所有的监听器运行一次，返回一个布尔值，表示是否还有变更
	 */
	$$digestOnce() {
		let dirty;
		let continueLoop = true;
		// 通过调用 $$everyScope 遍历整个当前scope的层级
		this.$$everyScope(scope => {
			let newValue, oldValue;
			// 防止数组塌陷，循环使用倒叙，这样保证对其余 wather 没有影响
			_.forEachRight(scope.$$watchers, watcher => {
				// 添加try、catch捕获异常，使其在执行中发生异常的时候被捕获，不影响其余watcher执行
				try {
					// 对watcher进行操作的时候，必须判断一下watcher是否存在，因为它有可能在别的watcher中被删除
					if (watcher) {
						newValue = watcher.watchFn(this);
						// 取出存取的last为旧值
						oldValue = watcher.last;
						// 不仅仅是新旧值的对比，加入是否基于值检测
						if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
							// 当新旧值不一样的时候，将$$lastDirtyWatch设置为当前的watcher
							scope.$root.$$lastDirtyWatch = watcher;
							// 每次新旧值不相同的时候，将新值存为last，用于下次和新值做比较，如果为基于值得脏检查，则使用深拷贝
							watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
							// 第一次的时候添加判断,旧值为initWatchVal时候，将它替换掉
							// 添加$$everyScope时候，将最后一个参数从this改为scope,目的是为了在循环内部使用也对的scope，确保正确运行
							watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);
							// 当新值和旧值不相等的时候我们认为数据是不稳定的，所以为脏
							dirty = true;
						} else if (scope.$root.$$lastDirtyWatch === watcher) {
							// $$lastDirtyWatch采用的是rootScope的，如果为当前scope设置,就会造成属性覆盖，我们必须保证scope中所有的监听器。
							// 循环内部遍历 Scope 的层级, 直到所有 Scope 被访问或者缩短回路优化生效.
							// 缩短回路优化使用 continueLoop 变量追踪. 如果它是 false, 则跳出 循环和 $$digestOnce 函数.
							continueLoop = false;
							// 当检测到的结果是一个干净的watcher。lodash 中的 return false 可跳出循环。
							return false;
						}
					}
				} catch (e) {
					console.error(e);
				}
			});
			return continueLoop;
		});
		return dirty;
	}

	/**
	 * 调用$$digestOnce,当返回值为true的时候我们认为数据是不稳定的，再次执行$digest，直到数据不再变化为止
	 * 为了防止互相调用，数据持续不稳定，我们需要保持运行在一定的可接受范围内，如果超过此长度，抛出异常，表示此数据为不稳定的。
	 * 最大数值angular默认为10，Time To Live简称为"TTL",数字看起来虽小，但是这个一个性能敏感的地方.
	 * 因为digest经常被执行，每次执行都会调用所有的监听器。用户也不太可能创建10个以上链式调用。
	 * 给$digest外层加一个TTL循环计数器,如果达到这个值，那么抛出异常。
	 * 事实上，Angular里面的TTL是可以调整的。
	 */
	$digest() {
		let dirty;
		let ttl = 10;
		// 循环开始时候将 rootScope 上的$$lastDirtyWatch设置为null
		this.$root.$$lastDirtyWatch = null;
		// 从外层循环设置阶段属性为 $digest
		this.$beginPhase('$digest');
		// 如果当前存在需要异步执行的 $$applyAsyncId, 取消该任务任务，并且通过 $$flushApplyAsync 执行所有的队列中的每个表达式
		// 因为目前已经进入了一轮 digest 循环，由于 $apply 方法最终也会触发 $digest,那么在这里直接执行 $apply，这样既可减少一次不必要的 digest 调用。
		if (this.$root.$$applyAsyncId) {
			clearTimeout(this.$root.$$applyAsyncId);
			this.$$flushApplyAsync();
		}
		do {
			// 从队列中取出每个东西，然后使用$eval来触发所有被延迟执行的函数：
			while (this.$$asyncQueue.length) {
				// 在执行 $$asyncQueue 中捕获异常
				try {
					// 先把需要执行的函数从数组中提取出来
					const asyncTask = this.$$asyncQueue.shift();
					asyncTask.scope.$eval(asyncTask.expression);
				} catch (e) {
					console.error(e);
				}
			}
			dirty = this.$$digestOnce();
			// 由于watcherFn中的 $evalAsync 没有条件限制，会一直执行，这样不断触发while条件执行digest
			// 所以我们需要添加条件判断，是下面测试条件为真，前面的条件为真，且ttl达到上限，则触发抛出异常
			if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
				throw '10 digest iterations reached';
			}
		} while (dirty || this.$$asyncQueue.length); // 结束脏检查的时候，需要判断时候还有需要延迟执行的代码
		// 循环结束后清空
		this.$clearPhase();
		// $digest 循环结束后执行 $$postDigestQueue 数组中存储的任务
		while (this.$$postDigestQueue.length) {
			// 执行 $$postDigestQueue 队列时候捕获异常
			try {
				this.$$postDigestQueue.shift()();
			} catch (e) {
				console.error(e);
			}
		}
	}

	/**
	 * 比较是否相等，angular内置了自己的相等性检测函数，我们采用 lodash 提供的
	 * @param newValue 新值
	 * @param oldValue 旧值
	 * @param valueEq  是否基于值检查
	 * @returns 是否相等
	 */
	$$areEqual(newValue, oldValue, valueEq) {
		if (valueEq) {
			// lodash自己处理过NaN这种情况
			return _.isEqual(newValue, oldValue);
		} else {
			// 因为字符串也不会是一个number,所以我们必须通过 typeof 来判断为数字类型
			return newValue === oldValue ||
				(typeof newValue === 'number' && typeof oldValue === 'number' &&
				isNaN(newValue) && isNaN(oldValue));
		}
	}

	/**
	 * 在作用域的上下文上执行代码
	 * @param expr 用一个函数作为参数，然后立即执行这个参数，并且把作用域自身当作参数传递给它。
	 * @param locals 它所做的仅仅是把这个参数传递给这个函数
	 * @returns {*} 返回这个表达式执行的代码
	 */
	$eval(expr, locals) {
		return expr(this, locals);
	}
	/**
	 * 延迟执行代码
	 * 将所有的延迟执行存储起来，但是我们需要在$digest中去真正的执行它
	 * $evalAsync做的另外一件事情是：如果现在没有其他的$digest在运行的话，把给定的$digest延迟执行。
	 * 这意味着，无论什么时候调用$evalAsync，可以确定要延迟执行的这个函数会“很快”被执行，而不是等到其他什么东西来触发一次digest。
	 * @param expr 延迟执行的code,包装为函数
	 */
	$evalAsync(expr) {
		// 检测作用域上现有的阶段变量，如果没有，也没有已列入计划的异步任务，就把这个digest列入计划
		if (!this.$$phase && !this.$$asyncQueue.length) {
			// js为单线程，执行完push操作才会执行此代码，这个时候$$asyncQueue长度为1，于是触发了$digest循环
			setTimeout(() => {
				if (this.$$asyncQueue.length) {
					// 我们在每个 scope 上存储了 rootScope 的引用
					// 子scope调用 $evalAsync 执行 digest循环的时候，也需要从 rootScope 开始
					this.$root.$digest();
				}
			}, 0);
		}
		// 存入当前的作用域scope, 是为了作用域的继承
		this.$$asyncQueue.push({scope: this, expression: expr});
	}

	/**
	 * 设置 scope.$$phase 为正在做的信息
	 * @param phase
	 */
	$beginPhase(phase) {
		if (this.$$phase) {
			throw this.$$phase + 'already in progress.';
		}
		this.$$phase = phase;
	}

	/**
	 * 清除 scope.$$phase 信息为null
	 */
	$clearPhase() {
		this.$$phase = null;
	}
	/**
	 * $apply使用函数作参数，它用$eval执行这个函数，然后通过$digest触发digest循环
	 * @param expr  函数
	 */
	$apply(expr) {
		try {
			// 设置外层循环阶段为 $apply
			this.$beginPhase('$apply');
			return this.$eval(expr);
		} finally {
			// 因为接下来进入$digest阶段，所以将$$phase清空，否则进入$digest会报错
			this.$clearPhase();
			// $digest的调用放置于finally块中，以确保即使函数抛出异常，也会执行digest。
			// 因为调用的是 this.$eval,所以执行的 expr 是当前Scope上的
			// 我们在 Root Scope 直接调用 $digest 替换 在当前 Scope 上调用 $digest.
			// 因为$apply是集成外部代码的首选方案，而我们并不能知道是在哪个scope上发生的改变，最安全的方式就是执行所有的Scope
			this.$root.$digest();
		}
	}

	/**
	 * 合并 $digest 循环
	 * @param expr 需要执行方法
	 */
	$applyAsync(expr) {
		this.$$applyAsyncQueue.push(() => {
			this.$eval(expr);
		});
		// 我们需要保证当前只有$applyAsync执行，也就是队列中的按插入顺序执行
		if (this.$root.$$applyAsyncId === null) {
			this.$root.$$applyAsyncId = setTimeout(() => {
				// _.bind: Creates a function that invokes func with the this binding of thisArg and partials prepended to the arguments it receives.
				this.$apply(_.bind(this.$$flushApplyAsync, this));
			}, 0);
		}
	}

	/**
	 *  通过 $$flushApplyAsync 执行所有的队列中的每个表达式
	 */
	$$flushApplyAsync() {
		while (this.$$applyAsyncQueue.length) {
			// 在执行 $$applyAsyncQueue 捕获异常
			try {
				// 从 $$applyAsyncQueue 数组中依次拿出前面置入的函数并执行
				this.$$applyAsyncQueue.shift()();
			} catch (e) {
				console.log(e);
			}
		}
		// 将 $$applyAsyncId 置为空表明执行完毕
		this.$root.$$applyAsyncId = null;
	}

	/**
	 * 将需要在 $digest 执行完后执行的方法存入队列
	 * @param fn
	 */
	$$postDigest(fn) {
		this.$$postDigestQueue.push(fn);
	}

	/**
	 * watch 一个数组
	 * @param watchFns 一组 watch expr，只要其中一个发生变化，都会触发 $digest 训话
	 * @param listenerFn 监听函数 每个watcher都应该有自己的新旧值
	 */
	$watchGroup(watchFns, listenerFn) {
		// 根据watchFn的长度，定义新旧值对应的数组
		const newValues = new Array(watchFns.length);
		const oldValues = new Array(watchFns.length);
		let changeReactionScheduled = false;
		// 标记是否为第一次运行
		let firstRun = true;
		// 当watchFn为空的时候，执行一次listenerFn,使返回的newValues,oldValues不是undefined而为空数组[]
		if (watchFns.length === 0) {
			// 同样我们需要处理一下，当 watchFn 为空的时候，是否可以执行listener函数
			let shouldCall = true;
			this.$evalAsync(() => {
				// 由于采用 $evalAsync 延迟执行，这个时候return Fn 已经返回，shouldCall已更改为false，所以listenerFn不会被执行
				if (shouldCall) {
					listenerFn(newValues, newValues, this);
				}
			});
			return () => {
				shouldCall = false;
			};
		}
		// 处理同一时间所有watches都检查完毕，触发多次listenerFn执行
		const watchGroupListener = () => {
			if (firstRun) {
				firstRun = false;
				// 第一次运行的时候，使newValues与oldValues一样
				listenerFn(newValues, newValues, this);
			} else {
				listenerFn(newValues, oldValues, this);
			}
			changeReactionScheduled = false;
		};
		// 由于有的watch注册的时候返回了一个函数，所以我们需要做的就是将它们集合起来，返回一个数组，创建一个注销功能，返回的时候调用它们
		// lodash 的_.map方法：Creates an array of values by running each element in collection through iteratee.
		const destroyFunctions = _.map(watchFns, (watchFn, i) => {
			return this.$watch(watchFn, (newValue, oldValue) => {
				// 将每次执行的listener新旧值与watchFn对应起来
				newValues[i] = newValue;
				oldValues[i] = oldValue;
				if (!changeReactionScheduled) {
					changeReactionScheduled = true;
					// 利用 $evalAsync 在同一个 digest 中延迟一些东西执行
					this.$evalAsync(watchGroupListener);
				}
			});
		});
		// 调用所有创建好的 destroyFunctions， 每一个 destroyFunction 都是一个方法，销毁的时候直接调用
		return () => {
			_.forEach(destroyFunctions, destroyFunction => {
				destroyFunction();
			});
		};
	}

	/**
	 * 新建一个 scope
	 * 关于这一块可以参考创建对象：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
	 * @param isolated  boolean值，判断是否为隔离作用域 true -- 创建子scope为隔离作用域，false就为原型继承
	 * @param parent 指定当前scope的父级
	 * @returns {ChildScope}
	 */
	$new(isolated, parent) {
		let child;
		parent = parent || this;
		if (isolated) {
			child = new Scope();
			// 同样各个延迟执行的队列也是唯一的
			// 不管隔离作用域还是非隔离，我们都希望 $root 是唯一的
			// 非隔离作用域继承原型，自动 copy 了一份
			// 隔离作用域需要我们明确地给他赋值一下
			child.$root = parent.$root;
			child.$$asyncQueue = parent.$$asyncQueue;
			child.$$postDigestQueue = parent.$$postDigestQueue;
			child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
		} else {
			// 首先我们创建一个构造函数，并且存储为局部变量
			const ChildScope = () => {};
			// 将 ChildScope 的原型设置为当前 Scope
			ChildScope.prototype = this;
			// 利用 ChildScope 创建一个 child 对象并返回
			child = new ChildScope();
		}
		// 每次新建一个child的时候都将其存入对应的children数组
		parent.$$children.push(child);
		// 我们为每个子scope添加独立的$$watchers,这样就会做到覆盖属性，子scope执行$digest循环的时候就不会影响到父scope
		child.$$watchers = [];
		// 为子scope也设置children存储
		child.$$children = [];
		// 添加一个$parent属性，指向它的父scope
		child.$parent = parent;
		return child;
	}

	/**
	 * 在当前的Scope上调用一次fn,并且递归调用当前scope的子Scope
	 * @param fn  遍历监听器过程的fn
	 * @returns {boolean}
	 */
	$$everyScope(fn) {
		if (fn(this)) {
			return this.$$children.every(child => {
				return child.$$everyScope(fn);
			});
		} else {
			return false;
		}
	}

	/**
	 * 一个典型的angularJs应用的生命周期，页面元素变化是通过不同的视图和数据呈现给用户，随着越来越多的controller和directive会导致scope层级越来越复杂
	 * 在目前的实现里面，我们可以创建子scope，但是没有删除它的机制。当考虑性能时，一个日益壮大的scope层级是非常不合适的，因此我们需要一种方式销毁scope.
	 * 销毁一个scope意味着，scope上的所有监听器要删除并且把它自己从父scope上的$$children属性删除，该scope不在需要再被任何地方引用，它在某个时间会被javascript垃圾回收器回收。
	 * 在$destroy中，我们需要一个对父scope的引用。我们在$new中添加一个。当子scope被创建时，它的$parent属性直接指向父scope使用。
	 */
	$destroy() {
		// 判断当前scope是否有 $parent 属性，这样可以排除 rootScope
		if (this.$parent) {
			// 获取当前scope父scope的所有子scope
			const siblings = this.$parent.$$children;
			// 获取当前 scope 的index
			const indexOfThis = siblings.indexOf(this);
			// 如果存在，那么从父scope的children中删除
			if (indexOfThis >= 0) {
				siblings.splice(indexOfThis, 1);
			}
		}
		// 将当前scope的watchers全部清空
		this.$$watchers = null;
	}

	/**
	 * 监测array和object
	 * @returns {*}
	 */
	$watchCollection(watchFn, listenerFn) {
		// 在外面设置新旧值，这样 watchFn 和 listenerFn 都可以调用这两个值
		let newValue;
		let oldValue;
		// digest 是否调用listenerFn，通过比较 watchFn 返回值，引入一个整数变量，每次检测到变化自增
		let changeCount = 0;
		const internalWatchFn = scope => {
			newValue = watchFn(scope);
			// 首先判断是否为对象，然后再判断是否为数组，因为数组也是对象
			if (_.isObject(newValue)) {
				// 新值为一个数组，而旧值非数组，这个时候就可以检测到从非数组到数组的变化
				if (isArrayLike(newValue)) {
					// 非数组到数组监测
					if (!_.isArray(oldValue)) {
						changeCount++;
						oldValue = [];
					}
					// 数组新加、删除元素，判断新旧值的长度即可知道
					if (newValue.length !== oldValue.length) {
						changeCount++;
						oldValue.length = newValue.length;
					}
					// 判断数组的值和顺序是否发生改变
					_.forEach(newValue, (newItem, i) => {
						// 判断新旧值都不为NaN
						const bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
						if (!bothNaN && newItem !== oldValue[i]) {
							changeCount++;
							oldValue[i] = newItem;
						}
					});
				}
			} else {
				// 通过判断新旧值是否一样，决定counter是否++
				// 这样使用 $$areEqual 函数判断，可以处理NaN的情况
				if (!this.$$areEqual(newValue, oldValue, false)) {
					changeCount++;
				}
				// check for changes
				oldValue = newValue;
			}
			return changeCount;
		};
		const internalListenerFn = () => {
			listenerFn(newValue, oldValue, this);
		};

		return this.$watch(internalWatchFn, internalListenerFn);
	}
}
