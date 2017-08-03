/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-08-02
 */
function $ControllerProvider() {
	this.$get = ['$injector', $injector => {
		return function (ctrl, locals) {
			return $injector.instantiate(ctrl, locals);
		};
	}];
}
module.exports = $ControllerProvider;
