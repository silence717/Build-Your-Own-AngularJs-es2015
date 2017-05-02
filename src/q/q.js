/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */

function $QProvider() {
	this.$get = ['$rootScope', function ($rootScope) {
		// Promise构造函数
		function Promise() {
			this.$$state = {};
		}
		Promise.prototype.then = function (onFulfilled) {
			this.$$state.pending = onFulfilled;
		};
		
		// Deffered构造函数
		function Deffered() {
			this.promise = new Promise();
		}
		Deffered.prototype.resolve = function (value) {
			this.promise.$$state.value = value;
			scheduleProcessQueue(this.promise.$$state);
		};
		
		function defer() {
			return new Deffered();
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
			state.pending(state.value);
		}
		
		return {
			defer: defer
		};
	}];
}
module.exports = $QProvider;
