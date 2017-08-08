/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-08-02
 */
import _ from 'lodash';

function $ControllerProvider() {
	
	const controllers = {};
	/**
	 * 注册controller
	 * @param name
	 * @param controller
	 */
	this.register = function (name, controller) {
		if (_.isObject(name)) {
			_.extend(controller, name);
		} else {
			controllers[name] = controller;
		}
	};
	
	this.$get = ['$injector', $injector => {
		return function (ctrl, locals) {
			if (_.isString(ctrl)) {
				ctrl = controllers[ctrl];
			}
			return $injector.instantiate(ctrl, locals);
		};
	}];
}
module.exports = $ControllerProvider;
