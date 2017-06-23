/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-15
 */
import _ from 'lodash';
import $ from 'jquery';
/**
 * 获取当前DOM节点名称
 * @param element
 * @returns {string}
 */
function nodeName(element) {
	return element.nodeName ? element.nodeName : element[0].nodeName;
}
// 指令前缀正则表达式
const PREFIX_REGEXP = /(x[\:\-_]|data[\:\-_])/i;
/**
 * 指令名字统一化
 * @param name
 * @returns {*}
 */
function directiveNormalize(name) {
	return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}
/**
 * 指令优先级比较函数
 * @param a
 * @param b
 */
function byPriority(a, b) {
	const diff = b.priority - a.priority;
	// 处理优先级不同
	if (diff !== 0) {
		return diff;
	} else {
		// 优先级相同的时候比较名称
		if (a.name !== b.name) {
			return (a.name < b.name ? -1 : 1);
		} else {
			// 如果名称也相同，那么比较注册顺序
			return a.index - b.index;
		}
	}
}

function $CompileProvider($provide) {
	
	// 记录当前已经有的指令
	const hasDirectives = {};
	
	this.directive = function (name, directiveFactory) {
		// 如果是名字，那么去直接判断注册
		if (_.isString(name)) {
			// 去除hasOwnProperty的指令名字
			if (name === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid directive name';
			}
			// 如果当前不存在这个指令，那么将其对应的值清空
			if (!hasDirectives.hasOwnProperty(name)) {
				hasDirectives[name] = [];
				// 使用provider注册一个指令
				$provide.factory(name + 'Directive', ['$injector', function ($injector) {
					let factories = hasDirectives[name];
					return _.map(factories, (factory, i) => {
						const directive = $injector.invoke(factory);
						// 设置restrict属性默认值为EA
						directive.restrict = directive.restrict || 'EA';
						// 设置优先级
						directive.priority = directive.priority || 0;
						// 设置name属性
						directive.name = directive.name || name;
						// 设置注册索引
						directive.index = i;
						return directive;
					});
				}]);
			}
			hasDirectives[name].push(directiveFactory);
		} else {
			// 如果是对象，那么遍历并且递归调用注册函数
			_.forEach(name, _.bind((directiveFactory, name) => {
				this.directive(name, directiveFactory);
			}, this));
		}
	};
	this.$get = ['$injector', function ($injector) {
		/**
		 * 编译
		 * @param $compileNodes
		 * @returns {*}
		 */
		function compile($compileNodes) {
			return compileNodes($compileNodes);
		}
		
		/**
		 * 编译节点
		 * @param $compileNodes
		 */
		function compileNodes($compileNodes) {
			_.forEach($compileNodes, node => {
				// 收集到当前节点上所有的指令
				const directives = collectDirectives(node);
				const terminal = applyDirectivesToNode(directives, node);
				// 如果当前节点有子元素，递归调用，应用指令
				if (!terminal && node.childNodes && node.childNodes.length) {
					compileNodes(node.childNodes);
				}
			});
		}
		
		/**
		 * 查找和应用指令
		 * @param node
		 */
		function collectDirectives(node) {
			const directives = [];
			// 处理针对于元素的情况
			if (node.nodeType === Node.ELEMENT_NODE) {
				// 通过元素名称匹配
				const normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
				addDirective(directives, normalizedNodeName, 'E');
				// 通过属性匹配
				_.forEach(node.attributes, attr => {
					let normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
					// 判断是否以ngAttr开头
					if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
						// 将ngAttr后面的第一个字符抓为小写，并且截取字符串
						normalizedAttrName = normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7);
					}
					addDirective(directives, normalizedAttrName, 'A');
				});
				// 通过class名称匹配
				_.forEach(node.classList, cls => {
					const normalizedClassName = directiveNormalize(cls);
					addDirective(directives, normalizedClassName, 'C');
				});
			} else if (node.nodeType === Node.COMMENT_NODE) {
				// 处理注释的情况
				// 匹配是否以directive开头
				const match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
				if (match) {
					addDirective(directives, directiveNormalize(match[1]), 'M');
				}
			}
			// 排序
			directives.sort(byPriority);
			return directives;
		}
		
		/**
		 * 添加指令
		 * @param directives
		 * @param name
		 */
		function addDirective(directives, name, mode) {
			// 判断当前名称的指令是否存在
			if (hasDirectives.hasOwnProperty(name)) {
				// 获取当前指令
				const foundDirectives = $injector.get(name + 'Directive');
				// 过滤当前指令
				const applicableDirectives = _.filter(foundDirectives, dir => {
					return dir.restrict.indexOf(mode) !== -1;
				});
				directives.push.apply(directives, applicableDirectives);
			}
		}
		
		/**
		 * 为节点应用指令
		 * @param directives
		 * @param compileNode
		 */
		function applyDirectivesToNode(directives, compileNode) {
			const $compileNode = $(compileNode);
			// 设置所有指令的终止为最小
			let terminalPriority = -Number.MAX_VALUE;
			// 是否有终止指令标识
			let terminal = false;
			_.forEach(directives, directive => {
				// 如果当前指令的优先级小于终止优先级，退出循环终止编译
				if (directive.priority < terminalPriority) {
					return false;
				}
				if (directive.compile) {
					directive.compile($compileNode);
				}
				// 如果指令设置了terminal则更新
				if (directive.terminal) {
					terminal = true;
					terminalPriority = directive.priority;
				}
			});
			return terminal;
		}
		
		return compile;
	}];
	
};
$CompileProvider.$inject = ['$provide'];
module.exports = $CompileProvider;
