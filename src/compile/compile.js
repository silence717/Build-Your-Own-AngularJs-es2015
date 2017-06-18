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
					return _.map(factories, $injector.invoke);
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
				const directives = collectDirectives(node);
				applyDirectivesToNode(directives, node);
			});
		}
		
		/**
		 * 查找和应用指令
		 * @param node
		 */
		function collectDirectives(node) {
			const directives = [];
			const normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
			addDirective(directives, normalizedNodeName);
			return directives;
		}
		
		/**
		 * 添加指令
		 * @param directives
		 * @param name
		 */
		function addDirective(directives, name) {
			// 判断当前名称的指令是否存在
			if (hasDirectives.hasOwnProperty(name)) {
				directives.push.apply(directives, $injector.get(name + 'Directive'));
			}
		}
		
		/**
		 * 为节点应用指令
		 * @param directives
		 * @param compileNode
		 */
		function applyDirectivesToNode(directives, compileNode) {
			const $compileNode = $(compileNode);
			_.forEach(directives, directive => {
				if (directive.compile) {
					directive.compile($compileNode);
				}
			});
		}
		
		return compile;
	}];
	
};
$CompileProvider.$inject = ['$provide'];
module.exports = $CompileProvider;
