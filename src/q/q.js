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
		Promise.prototype.then = function (onFulfilled, onRejected, onProgress) {
			const result = new Deferred();
			// 支持多个挂起回调，所以pending为一个数组
			this.$$state.pending = this.$$state.pending || [];
			this.$$state.pending.push([result, onFulfilled, onRejected, onProgress]);
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
		Promise.prototype.finally = function (callback, progressBack) {
			return this.then(function (value) {
				return handleFinallyCallback(callback, value, true);
			}, function (rejection) {
				return handleFinallyCallback(callback, rejection, false);
			}, progressBack);
		};
		/**
		 * create a promise
		 * @param value
		 * @param resolved
		 * @returns {Promise}
		 */
		function makePromise(value, resolved) {
			const d = new Deferred();
			if (resolved) {
				d.resolve(value);
			} else {
				d.reject(value);
			}
			return d.promise;
		}
		
		/**
		 * 处理
		 * @param callback
		 * @param value
		 * @param resolved
		 * @returns {*}
		 */
		function handleFinallyCallback(callback, value, resolved) {
			const callbackValue = callback();
			if (callbackValue && callbackValue.then) {
				return callbackValue.then(function() {
					return makePromise(value, resolved);
				});
			} else {
				return makePromise(value, resolved);
			}
		}
		
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
			// 判断resolve的值是否为一个promise
			if (value && _.isFunction(value.then)) {
				value.then(
					_.bind(this.resolve, this),
					_.bind(this.reject, this),
					_.bind(this.notify, this)
				);
			} else {
				this.promise.$$state.value = value;
				// 将 Deferred 状态值设置为1
				this.promise.$$state.status = 1;
				scheduleProcessQueue(this.promise.$$state);
			}
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
		/**
		 * 通知
		 * @param progress
		 */
		Deferred.prototype.notify = function (progress) {
			const pending = this.promise.$$state.pending;
			if (pending && pending.length && !this.promise.$$state.status) {
				$rootScope.$evalAsync(function () {
					_.forEach(pending, function (handlers) {
						const deferred = handlers[0];
						const progressBack = handlers[3];
						try {
							deferred.notify(_.isFunction(progressBack) ? progressBack(progress) : progress);
						} catch (e) {
							console.log(e);
						}
					});
				});
			}
		};
		
		function defer() {
			return new Deferred();
		}
		
		/**
		 * 直接reject
		 * @param rejection
		 * @returns {IPromise<T>|Promise}
		 */
		function reject(rejection) {
			var d = defer();
			d.reject(rejection);
			return d.promise;
		}
		
		/**
		 *
		 * @param value
		 * @returns {IPromise<T>|Promise}
		 */
		function when(value, callback, errback, progressback) {
			var d = defer();
			d.resolve(value);
			return d.promise.then(callback, errback, progressback);
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
		
		/**
		 * $q.all method
		 * @param promises  array or object
		 */
		function all(promises) {
			const results = _.isArray(promises) ? [] : {};
			let counter = 0;
			const d = defer();
			_.forEach(promises, function (promise, index) {
				counter++;
				when(promise).then(function (value) {
					results[index] = value;
					counter--;
					if (!counter) {
						d.resolve(results);
					}
				}, function (rejection) {
					d.reject(rejection);
				});
			});
			if (!counter) {
				d.resolve(results);
			}
			return d.promise;
		}
		
		const $Q = function Q(resolver) {
			if (!_.isFunction(resolver)) {
				throw 'Expected function, got ' + resolver;
			}
			const d = defer();
			resolver(
				_.bind(d.resolve, d),
				_.bind(d.reject, d)
			);
			return d.promise;
		};
		
		return _.extend($Q, {
			defer: defer,
			reject: reject,
			when: when,
			resolve: when,
			all: all
		});
	}];
}
module.exports = $QProvider;
