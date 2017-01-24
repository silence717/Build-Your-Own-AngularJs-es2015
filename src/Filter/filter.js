/**
 * @author  https://github.com/silence717
 * @date on 2017/1/24
 */
import _ from 'lodash';

const filters = {};
export function register(name, factory) {
	// 判断注册函数的第一个参数是否为对象
	if (_.isObject(name)) {
		// 如果是对象，递归调用注册函数
		return _.map(name, (factory, name) => {
			return register(name, factory);
		});
	} else {
		// 直到第一个参数不是一个对象，说明只是单个过滤器，直接存入filter对象
		const filter = factory();
		// key值为过滤器名字，value为过滤器
		filters[name] = filter;
		return filter;
	}
}
export function filter(name) {
	return filters[name];
}
