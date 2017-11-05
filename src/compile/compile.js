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
// 匹配require前缀
const REQUIRE_PREFIX_REGEXP = /^(\^\^?)?(\?)?(\^\^?)?/;

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
/**
 * 解析隔离scope绑定
 * @param scope
 * @returns {{}}
 */
function parseIsolateBindings(scope) {
	const bindings = {};
	_.forEach(scope, (definition, scopeName) => {
		const match = definition.match(/\s*([@<&]|=(\*?))(\??)\s*(\w*)\s*/);
		bindings[scopeName] = {
			mode: match[1][0],
			collection: match[2] === '*',
			optional: match[3],
			attrName: match[4] || scopeName
		};
	});
	return bindings;
}
/**
 * 解析指令绑定
 * @param directive
 * @returns {{}}
 */
function parseDirectiveBindings(directive) {
	const bindings = {};
	if (_.isObject(directive.scope)) {
		if (directive.bindToController) {
			bindings.bindToController = parseIsolateBindings(directive.scope);
		} else {
			bindings.isolateScope = parseIsolateBindings(directive.scope);
		}
	}
	if (_.isObject(directive.bindToController)) {
		bindings.bindToController = parseIsolateBindings(directive.bindToController);
	}
	return bindings;
}
/**
 * 获取Require的指令
 * @param directive
 * @returns {*}
 */
function getDirectiveRequire(directive, name) {
	const require = directive.require || (directive.controller && name);
	if (!_.isArray(require) && _.isObject(require)) {
		_.forEach(require, (value, key) => {
			const prefix = value.match(REQUIRE_PREFIX_REGEXP);
			const name = value.substring(prefix[0].length);
			if (!name) {
				require[key] = prefix[0] + key;
			}
		});
	}
	return require;
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
						// 获取引入的require属性
						directive.require = getDirectiveRequire(directive, name);
						// 设置注册索引
						directive.index = i;
						// 判断当指令有link属性，但是没有compile属性的时候，将link赋值给compile
						if (directive.link && !directive.compile) {
							directive.compile = _.constant(directive.link);
						}
						directive.$$bindings = parseDirectiveBindings(directive);
						if (_.isObject(directive.scope)) {
							directive.$$isolateBindings = parseIsolateBindings(directive.scope);
						}
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
		this.$get = ['$injector', '$parse', '$controller', '$rootScope', '$http', function ($injector, $parse, $controller, $rootScope, $http) {
			
			function Attributes(element) {
				this.$$element = element;
				this.$attr = {};
			}
			
			/**
			 * 给原型设置方法
			 * @param key   设置的属性名
			 * @param value 设置的属性值
			 * @param writeAttr  是否刷新到DOM元素
			 */
			Attributes.prototype.$set = function (key, value, writeAttr, attrName) {
				this[key] = value;
				
				// 如果这个元素是布尔型属性
				if (isBooleanAttribute(this.$$element[0], key)) {
					this.$$element.prop(key, value);
				}
				// 如果没有提供要反统一化的名字，那么使用snake-case
				if (!attrName) {
					// 如果没有提供，首先从$attr中去查找
					if (this.$attr[key]) {
						attrName = this.$attr[key];
					} else {
						attrName = this.$attr[key] = _.kebabCase(key, '-');
					}
				} else {
					this.$attr[key] = attrName;
				}
				
				if (writeAttr !== false) {
					this.$$element.attr(attrName, value);
				}
				// 如果observer存在，循环执行每一个observer函数
				if (this.$$observers) {
					_.forEach(this.$$observers[key], observer => {
						try {
							observer();
						} catch (e) {
							console.log(e);
						}
					});
				}
			};
			/**
			 * 观察者函数
			 * @param key
			 * @param fn
			 */
			Attributes.prototype.$observe = function (key, fn) {
				const self = this;
				this.$$observers = this.$$observers || Object.create(null);
				this.$$observers[key] = this.$$observers[key] || [];
				this.$$observers[key].push(fn);
				$rootScope.$evalAsync(function () {
					fn(self[key]);
				});
				return function () {
					const index = self.$$observers[key].indexOf(fn);
					if (index >= 0) {
						self.$$observers[key].splice(index, 1);
					}
				};
			};
			/**
			 * 添加class
			 * @param classVal
			 */
			Attributes.prototype.$addClass = function (classVal) {
				this.$$element.addClass(classVal);
			};
			/**
			 * 更新class
			 * @param newClassVal
			 * @param oldClassVal
			 */
			Attributes.prototype.$updateClass = function (newClassVal, oldClassVal) {
				const newClasses = newClassVal.split(/\s+/);
				const oldClasses = oldClassVal.split(/\s+/);
				const addedClasses = _.difference(newClasses, oldClasses);
				const removedClasses = _.difference(oldClasses, newClasses);
				if (addedClasses.length) {
					this.$addClass(addedClasses.join(' '));
				}
				if (removedClasses.length) {
					this.$removeClass(removedClasses.join(' '));
				}
			};
			/**
			 * 移除class
			 * @param classVal
			 */
			Attributes.prototype.$removeClass = function (classVal) {
				this.$$element.removeClass(classVal);
			};
			/**
			 * 编译
			 * @param $compileNodes
			 * @returns {*}
			 */
			function compile($compileNodes) {
				const compositeLinkFn = compileNodes($compileNodes);
				return function publicLinkFn(scope) {
					$compileNodes.data('$scope', scope);
					compositeLinkFn(scope, $compileNodes);
				};
			}
			
			/**
			 * 编译节点
			 * @param $compileNodes
			 */
			function compileNodes($compileNodes) {
				const linkFns = [];
				_.forEach($compileNodes, (node, i) => {
					const attrs = new Attributes($(node));
					// 收集到当前节点上所有的指令
					const directives = collectDirectives(node, attrs);
					let nodeLinkFn;
					if (directives.length) {
						nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
					}
					let childLinkFn;
					// 如果当前节点有子元素，递归调用，应用指令
					if ((!nodeLinkFn || !nodeLinkFn.terminal) && node.childNodes && node.childNodes.length) {
						childLinkFn = compileNodes(node.childNodes);
					}
					// 如果节点link存在
					if (nodeLinkFn && nodeLinkFn.scope) {
						attrs.$$element.addClass('ng-scope');
					}
					
					// 如果每个节点的link函数存在，将push到数组中，并且添加索引
					if (nodeLinkFn) {
						linkFns.push({
							nodeLinkFn: nodeLinkFn,
							childLinkFn: childLinkFn,
							idx: i
						});
					}
				});
				// 编译所有的DOM元素，然后返回复合link函数
				function compositeLinkFn(scope, linkNodes) {
					// 存储稳定的节点集合
					const stableNodeList = [];
					_.forEach(linkFns, function (linkFn) {
						const nodeIdx = linkFn.idx;
						stableNodeList[nodeIdx] = linkNodes[nodeIdx];
					});
					
					// 循环调用节点link函数
					_.forEach(linkFns, linkFn => {
						var node = stableNodeList[linkFn.idx];
						if (linkFn.nodeLinkFn) {
							if (linkFn.nodeLinkFn.scope) {
								scope = scope.$new();
								$(node).data('$scope', scope);
							}
							linkFn.nodeLinkFn(
								linkFn.childLinkFn,
								scope,
								stableNodeList[linkFn.idx]
							);
						} else {
							linkFn.childLinkFn(
								scope,
								stableNodeList[linkFn.idx].childNodes
							);
						}
					});
				}
				return compositeLinkFn;
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
				let match;
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
							normalizedAttrName = directiveNormalize(name.toLowerCase());
						}
						attrs.$attr[normalizedAttrName] = name;
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
						// 如果这个class和指令匹配，那么为它添加
						if (addDirective(directives, normalizedClassName, 'C')) {
							attrs[normalizedClassName] = undefined;
						}
					});
					// 判断className是否为不为空的字符串
					let className = node.className;
					if (_.isString(className) && className !== '') {
						while ((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
							const normalizedClassName = directiveNormalize(match[1]);
							if (addDirective(directives, normalizedClassName, 'C')) {
								attrs[normalizedClassName] = match[2] ? match[2].trim() : undefined;
							}
							className = className.substr(match.index + match[0].length);
						}
					}
				} else if (node.nodeType === Node.COMMENT_NODE) {
					// 处理注释的情况
					// 匹配是否以directive开头
					match = /^\s*directive\:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
					if (match) {
						const normalizedName = directiveNormalize(match[1]);
						if (addDirective(directives, normalizedName, 'M')) {
							attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
						}
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
				// 标记是否匹配
				let match;
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
						match = directive;
					});
				}
				return match;
			}
			
			/**
			 * 为节点应用指令
			 * @param directives
			 * @param compileNode
			 */
			function applyDirectivesToNode(directives, compileNode, attrs, previousCompileContext) {
				previousCompileContext = previousCompileContext || {};
				let $compileNode = $(compileNode);
				// 设置所有指令的终止为最小
				let terminalPriority = -Number.MAX_VALUE;
				// 是否有终止指令标识
				let terminal = false;
				// 存储所有的指令link函数
				const preLinkFns = previousCompileContext.preLinkFns || [];
				const postLinkFns = previousCompileContext.postLinkFns || [];
				const controllers = {};
				
				let newScopeDirective;
				let newIsolateScopeDirective = previousCompileContext.newIsolateScopeDirective;
				let templateDirective = previousCompileContext.templateDirective;
				let controllerDirectives = previousCompileContext.controllerDirectives;
				
				function getControllers(require, $element) {
					if (_.isArray(require)) {
						return _.map(require, r => {
							return getControllers(r, $element);
						});
					} else if (_.isObject(require)) {
						return _.mapValues(require, r => {
							return getControllers(r, $element);
						});
					} else {
						let value;
						let match = require.match(REQUIRE_PREFIX_REGEXP);
						const optional = match[2];
						require = require.substring(match[0].length);
						if (match[1] || match[3]) {
							if (match[3] && !match[1]) {
								match[1] = match[3];
							}
							while ($element.length) {
								value = $element.data('$' + require + 'Controller');
								if (value) {
									break;
								} else {
									$element = $element.parent();
								}
							}
						} else {
							if (controllers[require]) {
								value = controllers[require].instance;
							}
						}
						if (!value && !optional) {
							throw 'Controller ' + require + ' required by directive, cannot be found!';
						}
						return value || null;
					}
				}
				
				// 添加节点的link函数
				function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope, require) {
					if (preLinkFn) {
						if (attrStart) {
							preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
						}
						preLinkFn.isolateScope = isolateScope;
						preLinkFn.require = require;
						preLinkFns.push(preLinkFn);
					}
					if (postLinkFn) {
						if (attrStart) {
							postLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
						}
						postLinkFn.isolateScope = isolateScope;
						postLinkFn.require = require;
						postLinkFns.push(postLinkFn);
					}
				}
				
				_.forEach(directives, (directive, i) => {
					// 如果存在$$start key，说明是多元素匹配节点
					if (directive.$$start) {
						$compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
					}
					// 如果当前指令的优先级小于终止优先级，退出循环终止编译
					if (directive.priority < terminalPriority) {
						return false;
					}
					// 如果指令是继承的scope,
					if (directive.scope) {
						// 如果是隔离scope
						if (_.isObject(directive.scope) && !directive.templateUrl) {
							// 如果隔离scope或者继承scope已经存在,抛出异常信息
							if (newIsolateScopeDirective || newScopeDirective) {
								throw 'Multiple directives asking for new/inherited scope';
							}
							newIsolateScopeDirective = directive;
						} else {
							// 如果隔离scope已经存在，抛出异常信息
							if (newIsolateScopeDirective) {
								throw 'Multiple directives asking for new/inherited scope';
							}
							newScopeDirective = newScopeDirective || directive;
						}
					}
					// 如果指令存在templateUrl,终止循环
					if (directive.templateUrl) {
						if (templateDirective) {
							throw 'Multiple directives asking for template';
						}
						templateDirective = directive;
						nodeLinkFn = compileTemplateUrl(
							_.drop(directives, i),
							$compileNode,
							attrs,
							{
								templateDirective: templateDirective,
								newIsolateScopeDirective: newIsolateScopeDirective,
								controllerDirectives: controllerDirectives,
								preLinkFns: preLinkFns,
								postLinkFns: postLinkFns
							}
						);
						return false;
					} else if (directive.compile) {
						const linkFn = directive.compile($compileNode, attrs);
						const isolateScope = (directive === newIsolateScopeDirective);
						const attrStart = directive.$$start;
						const attrEnd = directive.$$end;
						const require = directive.require;
						
						// 如果linkFn是一个函数
						if (_.isFunction(linkFn)) {
							addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope, require);
							postLinkFns.push(linkFn);
						} else if (linkFn) {
							addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd, isolateScope, require);
						}
					}
					// 如果指令设置了terminal则更新
					if (directive.terminal) {
						terminal = true;
						terminalPriority = directive.priority;
					}
					// 收集所有包含Controller的指令
					if (directive.controller) {
						controllerDirectives = controllerDirectives || {};
						controllerDirectives[directive.name] = directive;
					}
					// 如果存在模板，使用模板代替当前元素中的内容
					if (directive.template) {
						if (templateDirective) {
							throw 'Multiple directives asking for template';
						}
						templateDirective = directive;
						$compileNode.html(_.isFunction(directive.template) ? directive.template($compileNode, attrs) : directive.template);
					}
				});
				
				function nodeLinkFn(childLinkFn, scope, linkNode) {
					const $element = $(linkNode);
					
					let isolateScope;
					if (newIsolateScopeDirective) {
						isolateScope = scope.$new(true);
						$element.addClass('ng-isolate-scope');
						$element.data('$isolateScope', isolateScope);
					}
					
					// 如果存在包含controller的指令，循环所有的指令controller，并且将其中的controller实例化
					if (controllerDirectives) {
						_.forEach(controllerDirectives, directive => {
							const locals = {
								$scope: directive === newIsolateScopeDirective ? isolateScope : scope,
								$element: $element,
								$attrs: attrs
							};
							let controllerName = directive.controller;
							if (controllerName === '@') {
								controllerName = attrs[directive.name];
							}
							const controller = $controller(controllerName, locals, true, directive.controllerAs);
							controllers[directive.name] = controller;
							$element.data('$' + directive.name + 'Controller', controller.instance);
						});
					}
					
					// 如果存在隔离Scope,那么使用$new创建一个新的Scope
					if (newIsolateScopeDirective) {
						initializeDirectiveBindings(
							scope,
							attrs,
							isolateScope,
							newIsolateScopeDirective.$$bindings.isolateScope,
							isolateScope
						);
					}
					const scopeDirective = newIsolateScopeDirective || newScopeDirective;
					if (scopeDirective && controllers[scopeDirective.name]) {
						initializeDirectiveBindings(
							scope,
							attrs,
							controllers[scopeDirective.name].instance,
							scopeDirective.$$bindings.bindToController,
							isolateScope
						);
					}
					// 真正调用controller函数
					_.forEach(controllers, controller => {
						controller();
					});
					
					_.forEach(controllerDirectives, (controllerDirective, name) => {
						var require = controllerDirective.require;
						if (_.isObject(require) && !_.isArray(require) && controllerDirective.bindToController) {
							const controller = controllers[controllerDirective.name].instance;
							const requiredControllers = getControllers(require, $element);
							_.assign(controller, requiredControllers);
						}
					});
					
					// 先循环prelink数组
					_.forEach(preLinkFns, linkFn => {
						linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require, $element));
					});
					// 判断子link是否存在
					if (childLinkFn) {
						let scopeToChild = scope;
						// 如果存在隔离scope指令，并且这个指令的模板存在，将改变scope为隔离scope，不再为上下文的scope
						if (newIsolateScopeDirective && (newIsolateScopeDirective.template || newIsolateScopeDirective.templateUrl === null)) {
							scopeToChild = isolateScope;
						}
						childLinkFn(scopeToChild, linkNode.childNodes);
					}
					_.forEachRight(postLinkFns, linkFn => {
						linkFn(linkFn.isolateScope ? isolateScope : scope, $element, attrs, linkFn.require && getControllers(linkFn.require, $element));
					});
					
				}
				nodeLinkFn.terminal = terminal;
				// 设置节点link函数
				nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope;
				return nodeLinkFn;
			}
			
			/**
			 * 初始化指令绑定
			 * @param scope
			 * @param attrs
			 * @param bindings
			 * @param isolateScope
			 */
			function initializeDirectiveBindings(scope, attrs, destination, bindings, newScope) {
				_.forEach(bindings, (definition, scopeName) => {
					const attrName = definition.attrName;
					let parentGet, unwatch;
					switch (definition.mode) {
						case '@':
							attrs.$observe(attrName, function (newAttrValue) {
								destination[scopeName] = newAttrValue;
							});
							// 如果元素上当前属性存在，初始化指令scope的值为元素的属性值
							if (attrs[attrName]) {
								destination[scopeName] = attrs[attrName];
							}
							break;
						case '<':
							if (definition.optional && !attrs[attrName]) {
								break;
							}
							parentGet = $parse(attrs[attrName]);
							destination[scopeName] = parentGet(scope);
							unwatch = scope.$watch(parentGet, newValue => {
								destination[scopeName] = newValue;
							});
							newScope.$on('$destroy', unwatch);
							break;
						case '=':
							if (definition.optional && !attrs[attrName]) {
								break;
							}
							parentGet = $parse(attrs[attrName]);
							let lastValue = destination[scopeName] = parentGet(scope);
							const parentValueWatch = function () {
								let parentValue = parentGet(scope);
								// 如果父scope的值和最后一次digest的值不一样，需要将隔离scope的值更新为父Scope的
								if (parentValue !== lastValue) {
									destination[scopeName] = parentValue;
								} else {
									parentValue = destination[scopeName];
									parentGet.assign(scope, parentValue);
								}
								lastValue = parentValue;
								return lastValue;
							};
							// 判断是否为一个集合
							if (definition.collection) {
								unwatch = scope.$watchCollection(attrs[attrName], parentValueWatch);
							} else {
								unwatch = scope.$watch(parentValueWatch);
							}
							newScope.$on('$destroy', unwatch);
							break;
						case '&':
							const parentExpr = $parse(attrs[attrName]);
							if (parentExpr === _.noop && definition.optional) {
								break;
							}
							destination[scopeName] = function (locals) {
								return parentExpr(scope, locals);
							};
							break;
					}
				});
			}
			
			/**
			 * 编译URL模板
			 * @param directive
			 * @param $compileNode
			 */
			function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
				// 移除带templateUrl的指令
				const origAsyncDirective = directives.shift();
				// 创建一个新对象
				const derivedSyncDirective = _.extend(
					{},
					origAsyncDirective,
					{templateUrl: null}
				);
				// 添加templateUrl
				const templateUrl = _.isFunction(origAsyncDirective.templateUrl) ? origAsyncDirective.templateUrl($compileNode, attrs) : origAsyncDirective.templateUrl;
				let afterTemplateNodeLinkFn;
				let afterTemplateChildLinkFn;
				let linkQueue = [];
				$compileNode.empty();
				$http.get(templateUrl).success(template => {
					// 把新创建的对象重新放入指令数组
					directives.unshift(derivedSyncDirective);
					$compileNode.html(template);
					afterTemplateNodeLinkFn = applyDirectivesToNode(directives, $compileNode, attrs, previousCompileContext);
					afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
					_.forEach(linkQueue, linkCall => {
						afterTemplateNodeLinkFn(afterTemplateChildLinkFn, linkCall.scope, linkCall.linkNode);
					});
					linkQueue = null;
				});
				return function delayedNodeLinkFn(_ignoreChildLinkFn, scope, linkNode) {
					if (linkQueue) {
						linkQueue.push({scope: scope, linkNode: linkNode});
					} else {
						afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode);
					}
				};
			}
			
			return compile;
		}];
	};
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
	// 包装link函数
	function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
		return function (scope, element, attrs, ctrl) {
			const group = groupScan(element[0], attrStart, attrEnd);
			return linkFn(scope, group, attrs, ctrl);
		};
	}
}

$CompileProvider.$inject = ['$provide'];
module.exports = $CompileProvider;
