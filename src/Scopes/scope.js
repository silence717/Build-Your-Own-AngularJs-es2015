/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
import _ from 'lodash';

// 引入一个初始化函数
function initWatchVal() {}

export default class Scope {

	constructor() {
		// 在Angular框架中，双美元符前缀$$表示这个变量被当作私有的来考虑，不应当在外部代码中调用。
		// 存储注册过的所有监听器
		this.$$watchers = [];
		// 最后一个watcher到的脏值
		this.$$lastDirtyWatch = null;
		// 存储$evalAsync列入计划的任务
		this.$$asyncQueue = [];
		// 存储现在正在做的信息，阶段
		this.$$phase = null;
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
		// 修复监听器中添加watcher不执行问题，重新设置 $$lastDirtyWatch 为 null
		this.$$lastDirtyWatch = null;
		// 为了销毁监听器，我们给$watch返回一个可以从 $$watcher 中删除监听器的函数
		return () => {
			const index = this.$$watchers.indexOf(watcher);
			if (index >= 0) {
				this.$$watchers.splice(index, 1);
				// 当我们删除一个watcher的时候，将最后一次的脏值变为null
				this.$$lastDirtyWatch = null;
			}
		};
	}

	/**
	 * 对每个监听器，我们调用监控函数，把作用域自身当作实参传递进去，然后比较这个返回值和上次返回值，如果不同，就调用监听函数
	 * @returns {*} 把所有的监听器运行一次，返回一个布尔值，表示是否还有变更
	 */
	$$digestOnce() {
		let dirty, newValue, oldValue;
		// 防止数组塌陷，循环使用倒叙，这样保证对其余 wather 没有影响
		_.forEachRight(this.$$watchers, watcher => {
			// 添加try、catch捕获异常，使其在执行中发生异常的时候被捕获，不影响其余watcher执行
			try {
				// 对watcher进行操作的时候，必须判断一下watcher是否存在，因为它有可能在别的watcher中被删除
				if (watcher) {
					newValue = watcher.watchFn(this);
					// 取出存取的last为旧值
					oldValue = watcher.last;
					// 不仅仅是新旧值的对比，加入是否基于值检测
					if (!this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
						// 当新旧值不一样的时候，将$$lastDirtyWatch设置为当前的watcher
						this.$$lastDirtyWatch = watcher;
						// 每次新旧值不相同的时候，将新值存为last，用于下次和新值做比较，如果为基于值得脏检查，则使用深拷贝
						watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
						// 第一次的时候添加判断,旧值为initWatchVal时候，将它替换掉
						watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), this);
						// 当新值和旧值不相等的时候我们认为数据是不稳定的，所以为脏
						dirty = true;
					} else if (this.$$lastDirtyWatch === watcher) {
						// 当检测到的结果是一个干净的watcher。lodash 中的 return false 可跳出循环。
						return false;
					}
				}
			} catch (e) {
				console.error(e);
			}
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
		// 循环开始将其设置为null
		this.$$lastDirtyWatch = null;
		// 从外层循环设置阶段属性为 $digest
		this.$beginPhase('$digest');
		do {
			// 从队列中取出每个东西，然后使用$eval来触发所有被延迟执行的函数：
			while (this.$$asyncQueue.length) {
				// 先把需要执行的函数从数组中提取出来
				const asyncTask = this.$$asyncQueue.shift();
				asyncTask.scope.$eval(asyncTask.expression);
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
	 * @returns {*} 返回的是第一个函数的返回值
	 */
	$eval(expr, locals) {
		return expr(this, locals);
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
			// 循环结束后清除
			this.$clearPhase();
			// $digest的调用放置于finally块中，以确保即使函数抛出异常，也会执行digest。
			this.$digest();
		}
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
					this.$digest();
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
}
