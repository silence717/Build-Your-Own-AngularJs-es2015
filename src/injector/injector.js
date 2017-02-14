/**
 * @author  https://github.com/silence717
 * @date on 2017/2/8
 */
import _ from 'lodash';
// 获取函数的参数
const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
// 删除字符串前后空白，以及两边下划线正则
// const FN_ARG = /^\s*(\S+)\s*$/;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
// 匹配单行和多行注释
const STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
// 添加循环依赖标记
const INSTANTIATING = { };

export default function createInjector(modulesToLoad, strictDi) {
	// 缓存所有的provider
	const providerCache = {};
	// 返回一个异常，让用户知道查找的依赖不存在
	const providerInjector = providerCache.$injector = createInternalInjector(providerCache, () => {
		throw 'Unknown provider: ' + path.join(' <- ');
	});
	// 缓存所有的实例化对象
	const instanceCache = {};
	// 返回查找provider并实例化依赖，将其存储到instanceCache的$injector
	const instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, name => {
		// 获取实例化依赖
		const provider = providerInjector.get(name + 'Provider');
		// 在Angular中，一切都是单例，任何不同地方调用相同的依赖，都会指向相同的对象
		return instanceInjector.invoke(provider.$get, provider);
	});
	// 追踪module是否已经被加载
	const loadedModules = {};
	// 存储当前的依赖关系
	const path = [];
	// 在注入是函数的时候，使用严格模式检测
	strictDi = (strictDi === true);

	// 所有注册的组件服务都存放在此
	providerCache.$provide = {
		constant: (key, value) => {
			if (key === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid constant name!';
			}
			// constant是一种特殊情况，可以在任何地方被注入
			providerCache[key] = value;
			instanceCache[key] = value;
		},
		provider: (key, provider) => {
			// 哦按段依赖是否为一二函数，如果是则需要实例化
			if (_.isFunction(provider)) {
				provider = providerInjector.instantiate(provider);
			}
			providerCache[key + 'Provider'] = provider;
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
		} else if (fn.$inject) {
			return fn.$inject;
		} else if (!fn.length) {
			return [];
		} else {
			// 如果是严格模式，抛出异常，不允许用户函数中使用这个
			if (strictDi) {
				throw 'fn is not using explicit annotation and cannot be invoked in strict mode';
			}
			// 使用正则替换函数中的注释部分为空
			const source = fn.toString().replace(STRIP_COMMENTS, '');
			// 通过正则表达式获取函数的参数
			const argDeclaration = source.match(FN_ARGS);
			// 返回之前循环遍历每个参数，去除字符串前后空格
			return _.map(argDeclaration[1].split(','), argName => {
				return argName.match(FN_ARG)[2];
			});
		}
	}

	/**
	 * 处理内部函数的injector
	 * @param cache 用于查找的依赖
	 * @param factoryFn  没有依赖时候使用的构造方法
	 */
	function createInternalInjector(cache, factoryFn) {
		/**
		 * 通过依赖名称获取服务
		 * @param name 依赖名称
		 * @returns {*}
		 */
		function getService(name) {
			// 如果实例化对象中存在该服务直接返回
			if (cache.hasOwnProperty(name)) {
				// 判断当前的依赖是否正在构建，如果是那么存在循环依赖
				if (cache[name] === INSTANTIATING) {
					throw new Error('Circular dependency found: ' + name + ' <- ' + path.join(' <- '));
				}
				return cache[name];
			} else {
				// 将当前依赖名称存入数组
				path.unshift(name);
				// 标记正在这个依赖正在构建
				cache[name] = INSTANTIATING;
				try {
					// 如果不存在，使用factoryFn去创建
					return (cache[name] = factoryFn(name));
				} finally {
					// 实例化结束后从path中删除
					path.shift();
					// 实例化结束以后，把它删除掉
					if (cache[name] === INSTANTIATING) {
						delete cache[name];
					}
				}
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
			// 使用annotate函数代替直接访问fn.$inject
			const args = _.map(annotate(fn), token => {
				if (_.isString(token)) {
					// 查找本地依赖，如果存在再在里面查找，找不到去查找cache中的
					return locals && locals.hasOwnProperty(token) ? locals[token] : getService(token);
				} else {
					throw 'Incorrect injection token! Expected a string, got ' + token;
				}
			});
			// 如果fn是一个数组，使用lodash的last方法取出数组的最后一个值，也就是这个函数
			if (_.isArray(fn)) {
				fn = _.last(fn);
			}
			// 使用给定的上下文执行方法
			return fn.apply(self, args);
		}

		/**
		 * 实例化
		 * @param Type
		 * @returns {{}}
		 */
		function instantiate(Type, locals) {
			// 判断是否为数组，如果是取最后一个
			const UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
			// 使用Object.create创建对象，基于构造函数的原型链设置对象的原型链
			const instance = Object.create(UnwrappedType.prototype);
			invoke(Type, instance, locals);
			return instance;
		}
		return {
			// 判断是否已经注册了某个名称的服务
			has: name => {
				// 先去实例化对象中查找，再去provider缓存中查找
				return cache.hasOwnProperty(name) || providerCache.hasOwnProperty(name + 'Provider');
			},
			get: getService,
			annotate: annotate,
			invoke: invoke,
			instantiate: instantiate
		};
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
				providerCache.$provide[method].apply(providerCache.$provide, args);
			});
		}
	});
	return instanceInjector;
}
