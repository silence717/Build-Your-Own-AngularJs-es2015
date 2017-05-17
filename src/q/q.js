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
		Promise.prototype.then = function (onFulfilled) {
			// 支持多个挂起回调
			this.$$state.pending = this.$$state.pending || [];
			this.$$state.pending.push(onFulfilled);
			if (this.$$state.status > 0) {
				scheduleProcessQueue(this.$$state);
			}
		};
		
		// Deferred构造函数
		function Deferred() {
			this.promise = new Promise();
		}
		Deferred.prototype.resolve = function (value) {
			if (this.promise.$$state.status) {
				return;
			}
			this.promise.$$state.value = value;
			this.promise.$$state.status = 1;
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
			const pending = state.pending;
			state.pending = undefined;
			_.forEach(pending, function (onFulfilled) {
				onFulfilled(state.value);
			});
		}
		
		return {
			defer: defer
		};
	}];
}
module.exports = $QProvider;
