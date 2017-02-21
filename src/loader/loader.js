/**
 * @author  https://github.com/silence717
 * @date on 2017/2/7
 */
export default function setupModuleLoader(window) {
	/**
	 * 为对象添加一个属性，仅仅当这个对象上的属性不存在的时候
	 * @param obj  对象
	 * @param name  属性
	 * @param factory  工厂方法
	 * @returns {*}
	 */
	const ensure = (obj, name, factory) => {
		return obj[name] || (obj[name] = factory());
	};
	// 创建一个全局的angular对象
	const angular = ensure(window, 'angular', Object);
	/**
	 * 创建一个module对象
	 * @param name  module名称
	 * @param requires  依赖的其他模块
	 * @param modules
	 * @param configFn 配置函数
	 * @returns {{name: *}}
	 */
	const createModule = (name, requires, modules, configFn) => {
		// module名称不能使用hasOwnProperty，因为获取module使用它去做检测
		if (name === 'hasOwnProperty') {
			throw 'hasOwnProperty is not a valid module name';
		}
		// 存储任务集合
		const invokeQueue = [];
		// 配置项集合
		const configBlocks = [];
		/**
		 * 抽取注册constant和provider服务
		 * @param method
		 * @param arrayMethod
		 * @returns {Function}
		 */
		const invokeLater = function (service, method, arrayMethod, queue) {
			return function () {
				queue = queue || invokeQueue;
				queue[arrayMethod || 'push']([service, method, arguments]);
				return moduleInstance;
			};
		};

		// module实例的属性
		const moduleInstance = {
			name: name,
			requires: requires,
			// 由于 constant 不会依赖任何其它东西，所以当 constant 被注册在一个模块上时,
			// 模块加载器总是将它们添加 invokeQueue 的前面。
			constant: invokeLater('$provide', 'constant', 'unshift'),
			provider: invokeLater('$provide', 'provider'),
			factory: invokeLater('$provide', 'factory'),
			value: invokeLater('$provide', 'value'),
			service: invokeLater('$provide', 'service'),
			decorator: invokeLater('$provide', 'decorator'),
			filter: invokeLater('$filterProvider', 'register'),
			// 配置模块有一个默认的配置块集合
			config: invokeLater('$injector', 'invoke', 'push', configBlocks),
			run: fn => {
				moduleInstance._runBlocks.push(fn);
				return moduleInstance;
			},
			_invokeQueue: invokeQueue,
			_configBlocks: configBlocks,
			_runBlocks: []
		};
		// 判断如果创建模块存在第三个参数，那么就配置
		if (configFn) {
			moduleInstance.config(configFn);
		}

		// 创建modules的时候将其存入到之前的私有modules
		modules[name] = moduleInstance;
		return moduleInstance;
	};
	/**
	 * 从当前已存在modules对象获取查找的module
	 * @param name  需要获取的module名称
	 * @param modules
	 * @returns {*}
	 */
	const getModule = (name, modules) => {
		// 使用hasOwnProperty（只是检测自身的属性，不包含继承）先去检测是否存在这个module，不存在的话抛出异常，当前查找module不可用
		if (modules.hasOwnProperty(name)) {
			return modules[name];
		} else {
			throw 'Module' + name + 'is not available!';
		}
	};
	// 为angular添加一个module方法
	ensure(angular, 'module', () => {
		// 存储所有module
		const modules = {};
		return (name, requires, configFn) => {
			// 通过requires是否存在，来判断是新建module，还是获取module
			if (requires) {
				return createModule(name, requires, modules, configFn);
			} else {
				return getModule(name, modules);
			}
		};
	});
}
