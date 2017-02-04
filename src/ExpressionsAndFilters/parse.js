/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
import _ from 'lodash';
import ASTCompiler from './astCompiler';
import AST from './ast';
import Lexer from './lexer';

class Parser {

	constructor(lexer) {
		this.lexer = lexer;
		this.ast = new AST(this.lexer);
		this.astCompile = new ASTCompiler(this.ast);
	}
	parse(text) {
		return this.astCompile.compile(text);
	}
}

function constantWatchDelegate(scope, listenerFn, valueEq, watchFn) {
	const unwatch = scope.$watch(
		() => {
			return watchFn(scope);
		},
		(newValue, oldValue, scope) => {
			if (_.isFunction(listenerFn)) {
				listenerFn.apply(this, arguments);
			}
			unwatch();
		},
		valueEq
	);
	return unwatch;
}

function parse(expr) {
	switch (typeof expr) {
		case 'string':
			const lexer = new Lexer();
			const parser = new Parser(lexer);
			const parseFn = parser.parse(expr);
			if (parseFn.constant) {
				parseFn.$$watchDelegate = constantWatchDelegate;
			}
			return parseFn;
		case 'function':
			return expr;
		default:
			return _.noop;
	}
}
module.exports = parse;
