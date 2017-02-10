/**
 * @author  https://github.com/silence717
 * @date on 2017/2/8
 */
import _ from 'lodash';
export default function createInjector(modulesToLoad) {
	const cache = {};
	const $provide = {
		constant: (key, value) => {
			if (key === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid constant name!';
			}
			cache[key] = value;
		}
	};
	// 遍历需要加载的模块名称
	_.forEach(modulesToLoad, moduleName => {
		// 从已注册的module中获取当前module
		const module = window.angular.module(moduleName);
		// 遍历当前module的任务集合
		_.forEach(module._invokeQueue, invokeArgs => {
			const method = invokeArgs[0];
			const args = invokeArgs[1];
			$provide[method].apply($provide, args);
		});
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
