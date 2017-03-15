/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
function $QProvider() {
	this.$get = function () {
		// Promise构造函数
		function Promise() {
		}
		// Deffered构造函数
		function Deffered() {
			this.promise = new Promise();
		}
		function defer() {
			return new Deffered();
		}
		return {
			defer: defer
		};
	};
}
module.exports = $QProvider;
