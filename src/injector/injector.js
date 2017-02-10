/**
 * @author  https://github.com/silence717
 * @date on 2017/2/8
 */
import _ from 'lodash';
export default function createInjector(modulesToLoad) {
	// 缓存组件
	const cache = {};
	// 追踪module是否已经被加载
	const loadedModules = {};
	// 所有注册的组件服务都存放在此
	const $provide = {
		constant: (key, value) => {
			if (key === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid constant name!';
			}
			cache[key] = value;
		}
	};
	// 遍历需要加载的模块名称
	_.forEach(modulesToLoad, function loadModule(moduleName) {
		// 判断当前module是否已经被加载，为了避免各个模块互相依赖
		if (!loadedModules.hasOwnProperty(moduleName)) {
			// 标记当前模块已加载
			loadedModules[moduleName] = true;
			// 从已注册的module中获取当前module
			const module = window.angular.module(moduleName);
			// 递归遍历所有依赖的模块
			_.forEach(module.requires, loadModule);
			// 遍历当前module的任务集合
			_.forEach(module._invokeQueue, invokeArgs => {
				const method = invokeArgs[0];
				const args = invokeArgs[1];
				$provide[method].apply($provide, args);
			});
		}
	});
	return {
		// 判断是否已经注册了constant
		has: key => {
			return cache.hasOwnProperty(key);
		},
		// 获取组件本身
		get: key => {
			return cache[key];
		}
	};
}
