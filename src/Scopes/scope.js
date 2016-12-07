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
	}

	/**
	 * 使用$watch，可以在Scope上添加一个监听器。当Scope上发生变更时，监听器会收到提示
	 * @param watchFn   一个监控函数，用于指定所关注的那部分数据。可以是一个表达式，也可以为一个函数。
	 * @param listenerFn  一个监听函数，用于在数据变更的时候接受提示。
	 * @params valueEq:  可选参数，true - 基于值的脏检查，false - 基于引用的检查，默认false.不传的时候为undefined,通过两次取反使其为false
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
		this.$$watchers.push(watcher);
		// 修复监听器中添加watcher不执行问题，重新设置 $$lastDirtyWatch 为 null
		this.$$lastDirtyWatch = null;
	}

	/**
	 * 对每个监听器，我们调用监控函数，把作用域自身当作实参传递进去，然后比较这个返回值和上次返回值，如果不同，就调用监听函数
	 * @returns {*} 把所有的监听器运行一次，返回一个布尔值，表示是否还有变更
	 */
	$$digestOnce() {
		let dirty, newValue, oldValue;
		_.forEach(this.$$watchers, watcher => {
			// 添加try、catch捕获异常，使其在执行中发生异常的时候被捕获，不影响其余watcher执行
			try {
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
		do {
			dirty = this.$$digestOnce();
			if (dirty && !(ttl--)) {
				throw '10 digest iterations reached';
			}
		} while (dirty);
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

}
