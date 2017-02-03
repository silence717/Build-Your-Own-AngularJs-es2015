/**
 * @author  https://github.com/silence717
 * @date on 2017/2/1
 */

import _ from 'lodash';
/**
 * 创建断言函数，将表达式中的每个每项和字符串进行严格的等式比较
 * @param expression   filter表达式
 * @returns {predicateFn}
 */
function createPredicateFn(expression) {
	// 比较两个原始类型的值
	function comparator(actual, expected) {
		// 如果数组项的值为undefined，那么直接返回，不进入过滤器
		if (_.isUndefined(actual)) {
			return false;
		}
		// 如果其中一个为null，那么另一个也必须是null
		if (_.isNull(actual) || _.isNull(expected)) {
			return actual === expected;
		}
		// 在转换前将表达式和每项的值都转换为小写
		actual = ('' + actual).toLowerCase();
		expected = ('' + expected).toLowerCase();
		return actual.indexOf(expected) !== -1;
	}
	return function predicateFn(item) {
		return deepCompare(item, expression, comparator);
	};
}
/**
 * 深度比较两个值
 * @param actual
 * @param expected
 * @param comparator
 * @returns {*}
 */
function deepCompare(actual, expected, comparator) {
	// 如果是字符串并且以!开头，再次调用自己，去除字符串的第一个!并且对结果取反
	if (_.isString(expected) && _.startsWith(expected, '!')) {
		return !deepCompare(actual, expected.substring(1), comparator);
	}
	if (_.isObject(actual)) {
		return _.some(actual, value => {
			return deepCompare(value, expected, comparator);
		});
	} else {
		return comparator(actual, expected);
	}
}

function filterFilter() {
	return (array, filterExpr) => {
		let predicateFn;
		// 如果是函数，执行断言函数
		if (_.isFunction(filterExpr)) {
			predicateFn = filterExpr;
		} else if (_.isString(filterExpr) || _.isNumber(filterExpr) || _.isBoolean(filterExpr) || _.isNull(filterExpr)) {
			// 如果是字符串，创建断言函数
			predicateFn = createPredicateFn(filterExpr);
		} else {
			// 如果不能识别，那么直接返回数组
			return array;
		}
		return _.filter(array, predicateFn);
	};
}
module.exports = filterFilter;