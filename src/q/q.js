/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
import _ from 'lodash';

function $QProvider() {
	this.$get = ['$rootScope', function ($rootScope) {
		// Promise构造函数
		function Promise() {
			this.$$state = {};
		}
		// promise resolved 之后
		Promise.prototype.then = function (onFulfilled, onRejected) {
			const result = new Deferred();
			// 支持多个挂起回调，所以pending为一个数组
			this.$$state.pending = this.$$state.pending || [];
			this.$$state.pending.push([result, onFulfilled, onRejected]);
			// 如果 Deferred 已经被resolve，那么直接安排回调
			if (this.$$state.status > 0) {
				scheduleProcessQueue(this.$$state);
			}
			return result.promise;
		};
		// 捕获错误
		Promise.prototype.catch = function (onRejected) {
			return this.then(null, onRejected);
		};
		// finally callback
		Promise.prototype.finally = function (callback) {
			return this.then(function () {
				callback();
			}, function () {
				callback();
			});
		};
		
		// Deferred构造函数
		function Deferred() {
			this.promise = new Promise();
		}
		// Deferred 被 resolve
		Deferred.prototype.resolve = function (value) {
			// 标识如果 Deferred 被处理了，那么就直接返回，一个 Deferred 只会被处理一次
			if (this.promise.$$state.status) {
				return;
			}
			this.promise.$$state.value = value;
			// 将 Deferred 状态值设置为1
			this.promise.$$state.status = 1;
			scheduleProcessQueue(this.promise.$$state);
		};
		// Deferred 被 rejected
		Deferred.prototype.reject = function (reason) {
			if (this.promise.$$state.status) {
				return;
			}
			this.promise.$$state.value = reason;
			this.promise.$$state.status = 2;
			scheduleProcessQueue(this.promise.$$state);
		};
		
		function defer() {
			return new Deferred();
		}
		
		/**
		 *
		 * @param state
		 */
		function scheduleProcessQueue(state) {
			$rootScope.$evalAsync(() => {
				processQueue(state);
			});
		}
		
		/**
		 *
		 * @param state
		 */
		function processQueue(state) {
			// 确保每个回调只调用一次，所以将其存储取来
			const pending = state.pending;
			// 每次 digest 的实施将所有的 pending 清空
			state.pending = undefined;
			// 可能有多个回调函数，所以在执行的时候需要循环
			_.forEach(pending, function (handlers) {
				const deferred = handlers[0];
				const fn = handlers[state.status];
				try {
					if (_.isFunction(fn)) {
						deferred.resolve(fn(state.value));
					} else if (state.status === 1) {
						deferred.resolve(state.value);
					} else {
						deferred.reject(state.value);
					}
				} catch (e) {
					deferred.reject(e);
				}
			});
		}
		
		return {
			defer: defer
		};
	}];
}
module.exports = $QProvider;
