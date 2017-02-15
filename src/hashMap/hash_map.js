/**
 * @author  https://github.com/silence717
 * @date on 2017/2/15
 */
import _ from 'lodash';

export function hashKey(value) {
	const type = typeof value;
	let uid;
	// 判断是函数或者对象
	if (type === 'function' || (type === 'object' && value !== null)) {
		// 先查看对象是否存在$$hashKey属性
		uid = value.$$hashKey;
		// 如果uid是一个函数，那么将它作为方法调用
		if (typeof uid === 'function') {
			uid = value.$$hashKey();
		} else if (uid === undefined) {
			// 如果不存在使用lodash生成唯一的id标识
			uid = value.$$hashKey = _.uniqueId();
		}
	} else {
		// 非对象的话，uid直接是value本身
		uid = value;
	}
	return type + ':' + uid;
}

export class HashMap {

	put(key, value) {
		this[hashKey(key)] = value;
	}

	get(key) {
		return this[hashKey(key)];
	}

	remove(key) {
		key = hashKey(key);
		const value = this[key];
		delete this[key];
		return value;
	}
}
