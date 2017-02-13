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

	/**
	 * 标识函数依赖
	 * @param fn
	 * @returns {Array}
	 */
	function annotate(fn) {
		// 如果是数组，那么返回除数组最后一项的数据
		if (_.isArray(fn)) {
			return fn.slice(0, fn.length - 1);
		} else {
			return fn.$inject;
		}
	}

	/**
	 * 调用函数
	 * @param fn
	 * @param self 给定的上下文
	 * @param locals 显式提供参数
	 * @returns {*}
	 */
	function invoke(fn, self, locals) {
		// 对fn的$inject进行循环，从inject的数组每项去实现，拿到cache中存储这些依赖名称对应的值
		const args = _.map(fn.$inject, token => {
			if (_.isString(token)) {
				// 查找本地依赖，如果存在再在里面查找，找不到去查找cache中的
				return locals && locals.hasOwnProperty(token) ? locals[token] : cache[token];
			} else {
				throw 'Incorrect injection token! Expected a string, got ' + token;
			}
		});
		// 使用给定的上下文执行方法
		return fn.apply(self, args);
	}

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
		},
		annotate: annotate,
		invoke: invoke
	};
}
