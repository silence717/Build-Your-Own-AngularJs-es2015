/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
function $QProvider() {
	this.$get = function () {
		function Deffered() {

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
