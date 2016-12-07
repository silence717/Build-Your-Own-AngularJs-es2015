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
	}

	/**
	 * 使用$watch，可以在Scope上添加一个监听器。当Scope上发生变更时，监听器会收到提示
	 * @param watchFn   一个监控函数，用于指定所关注的那部分数据。可以是一个表达式，也可以为一个函数。
	 * @param listenerFn  一个监听函数，用于在数据变更的时候接受提示。
	 *
	 * 为什么添加一个last？
	 * 比较watch函数返回值和存储last属性的值大部分没有问题。
	 * 只有第一次执行watch的时候，我们并没有设置last的值，值为undefined。
	 * 当watch函数首次返回的置为undefined时候，这样的判断就会失效。
	 * 所以我们添加一个初始化值--空函数，数组也是对象的一直，对象和对象永远不会相等。
	 */
	$watch(watchFn, listenerFn) {
		const watcher = {
			watchFn: watchFn,
			listenerFn: listenerFn || function () {},
			last: initWatchVal
		};
		this.$$watchers.push(watcher);
	}

	/**
	 * 对每个监听器，我们调用监控函数，把作用域自身当作实参传递进去，然后比较这个返回值和上次返回值，如果不同，就调用监听函数
	 * @returns {*} 把所有的监听器运行一次，返回一个布尔值，表示是否还有变更
	 */
	$$digestOnce() {
		let dirty;
		_.forEach(this.$$watchers, watcher => {
			const newValue = watcher.watchFn(this);
			// 取出存取的last为旧值
			const oldValue = watcher.last;
			if (newValue !== oldValue) {
				// 第一次的时候添加判断,旧值为initWatchVal时候，将它替换掉
				watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), this);
				// 当新值和旧值不相等的时候我们认为数据是不稳定的，所以为脏
				dirty = true;
			}
			// 每次新旧值不相同的时候，将新值存为last，用于下次和新值做比较
			watcher.last = newValue;
		});
		return dirty;
	}

	/**
	 * 调用$$digestOnce,当返回值为true的时候我们认为数据是不稳定的，再次执行$digest，直到数据不再变化为止
	 */
	$digest() {
		let dirty;
		do {
			dirty = this.$$digestOnce();
		} while (dirty);
	}

}
