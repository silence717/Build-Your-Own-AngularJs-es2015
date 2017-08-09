/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-08-02
 */
import _ from 'lodash';

function $ControllerProvider() {
	
	const controllers = {};
	let globals = false;
	
	/**
	 * 设置全局controller标识
	 */
	this.allowGlobals = function () {
		globals = true;
	};
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
				if (controllers.hasOwnProperty(ctrl)) {
					ctrl = controllers[ctrl];
				} else if (globals) {
					ctrl = window[ctrl];
				}
			}
			return $injector.instantiate(ctrl, locals);
		};
	}];
}
module.exports = $ControllerProvider;
