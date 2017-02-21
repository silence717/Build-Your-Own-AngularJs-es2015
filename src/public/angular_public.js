/**
 * @author  https://github.com/silence717
 * @date on 2017/2/20
 */
import setupModuleLoader from '../loader/loader';

export default function publishExternalAPI() {
	setupModuleLoader(window);
	// 注册一个ng模块，在angular启动的时候自动放到各个应用
	const ngModule = window.angular.module('ng', []);
	// 使用provider服务注册过滤器服务
	ngModule.provider('$filter', require('../filter/filter'));
	// 使用provider服务注册解析器
	ngModule.provider('$parse', require('../Expressions/parse'));
	// 使用provider服务注册$rootScope
	ngModule.provider('$rootScope', require('../Scopes/scope'));
}
