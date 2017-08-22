/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-08-02
 */
import _ from 'lodash';

function addToScope(locals, identifier, instance) {
	if (locals && _.isObject(locals.$scope)) {
		locals.$scope[identifier] = instance;
	} else {
		throw 'Cannot export controller as ' + identifier + '! No $scope object provided via locals';
	}
}

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
		return function (ctrl, locals, identifier) {
			if (_.isString(ctrl)) {
				if (controllers.hasOwnProperty(ctrl)) {
					ctrl = controllers[ctrl];
				} else if (globals) {
					ctrl = window[ctrl];
				}
			}
			const instance = $injector.instantiate(ctrl, locals);
			if (identifier) {
				addToScope(locals, identifier, instance);
			}
			return instance;
		};
	}];
}
module.exports = $ControllerProvider;
