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
// 布尔属性名称
const BOOLEAN_ATTRS = {
	multiple: true,
	selected: true,
	checked: true,
	disabled: true,
	readOnly: true,
	required: true,
	open: true
};
// 布尔元素名称
const BOOLEAN_ELEMENTS = {
	INPUT: true,
	SELECT: true,
	OPTION: true,
	TEXTAREA: true,
	BUTTON: true,
	FORM: true,
	DETAILS: true
};
/**
 * 是否为布尔属性
 * @param node
 * @param attrName
 * @returns {*}
 */
function isBooleanAttribute(node, attrName) {
	return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
}
/**
 * 指令名字驼峰化
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
				const attrs = {};
				// 收集到当前节点上所有的指令
				const directives = collectDirectives(node, attrs);
				const terminal = applyDirectivesToNode(directives, node, attrs);
				// 如果当前节点有子元素，递归调用，应用指令
				if (!terminal && node.childNodes && node.childNodes.length) {
					compileNodes(node.childNodes);
				}
			});
		}
		
		/**
		 * 判断是否为多元素指令
		 * @param name
		 * @returns {boolean}
		 */
		function directiveIsMultiElement(name) {
			if (hasDirectives.hasOwnProperty(name)) {
				const directives = $injector.get(name + 'Directive');
				return _.some(directives, {multiElement: true});
			}
			return false;
		}
		
		/**
		 * 查找和应用指令
		 * @param node
		 */
		function collectDirectives(node, attrs) {
			const directives = [];
			// 处理针对于元素的情况
			if (node.nodeType === Node.ELEMENT_NODE) {
				// 通过元素名称匹配
				const normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
				addDirective(directives, normalizedNodeName, 'E');
				// 通过属性匹配
				_.forEach(node.attributes, attr => {
					let attrStartName, attrEndName;
					let name = attr.name;
					let normalizedAttrName = directiveNormalize(name.toLowerCase());
					const isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
					// 判断是否以ngAttr开头
					if (isNgAttr) {
						// 将ngAttr后面的第一个字符抓为小写，并且截取字符串
						name = _.kebabCase(normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7));
					}
					const directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
					// 判断是否为多元素指令
					if (directiveIsMultiElement(directiveNName)) {
						// 判断名称中是否有Start后缀
						if (/Start$/.test(normalizedAttrName)) {
							// 开始名字就为当前指令名
							attrStartName = name;
							// 从当前指令名截取掉后5个字符，拼接End就为结束名称
							attrEndName = name.substring(0, name.length - 5) + 'end';
							// 去掉start获取纯粹的指令名
							name = name.substring(0, name.length - 6);
						}
					}
					normalizedAttrName = directiveNormalize(name.toLowerCase());
					addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);
					if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
						attrs[normalizedAttrName] = attr.value.trim();
						// 设置布尔属性
						if (isBooleanAttribute(node, normalizedAttrName)) {
							attrs[normalizedAttrName] = true;
						}
					}
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
		function addDirective(directives, name, mode, attrStartName, attrEndName) {
			// 判断当前名称的指令是否存在
			if (hasDirectives.hasOwnProperty(name)) {
				// 获取当前指令
				const foundDirectives = $injector.get(name + 'Directive');
				// 过滤当前指令
				const applicableDirectives = _.filter(foundDirectives, dir => {
					return dir.restrict.indexOf(mode) !== -1;
				});
				_.forEach(applicableDirectives, directive => {
					// 如果当前指令存在开始名称，那么为它添加$$start和$$end key
					if (attrStartName) {
						directive = _.create(directive, {
							$$start: attrStartName,
							$$end: attrEndName
						});
					}
					directives.push(directive);
				});
			}
		}
		
		/**
		 * 为节点应用指令
		 * @param directives
		 * @param compileNode
		 */
		function applyDirectivesToNode(directives, compileNode, attrs) {
			let $compileNode = $(compileNode);
			// 设置所有指令的终止为最小
			let terminalPriority = -Number.MAX_VALUE;
			// 是否有终止指令标识
			let terminal = false;
			_.forEach(directives, directive => {
				// 如果存在$$start key，说明是多元素匹配节点
				if (directive.$$start) {
					$compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
				}
				// 如果当前指令的优先级小于终止优先级，退出循环终止编译
				if (directive.priority < terminalPriority) {
					return false;
				}
				if (directive.compile) {
					directive.compile($compileNode, attrs);
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
	/**
	 * 组装节点
	 * @param node
	 * @param startAttr
	 * @param endAttr
	 * @returns {*|jQuery|HTMLElement}
	 */
	function groupScan(node, startAttr, endAttr) {
		const nodes = [];
		// 如果初始化节点包含开始属性
		if (startAttr && node && node.hasAttribute(startAttr)) {
			let depth = 0;
			do {
				if (node.nodeType === Node.ELEMENT_NODE) {
					// 遇到start自增
					if (node.hasAttribute(startAttr)) {
						depth++;
					} else if (node.hasAttribute(endAttr)) {
						// 遇到end自减
						depth--;
					}
				}
			} while (depth > 0);
		} else {
			// 如果初始化节点不包含开始属性
			nodes.push(node);
		}
		return $(nodes);
	}
}

$CompileProvider.$inject = ['$provide'];
module.exports = $CompileProvider;
