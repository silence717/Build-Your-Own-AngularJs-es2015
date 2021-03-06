/**
 * @author  https://github.com/silence717
 * @date on 2017/1/17
 * @desc [Lexer 获取最原始的字符串表达式，并返回该字符串解析的token数组]
 */
const ESCAPES = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

const OPERATORS = {
	'+': true,
	'!': true,
	'-': true,
	'*': true,
	'/': true,
	'%': true,
	'=': true,
	'==': true,
	'!=': true,
	'===': true,
	'!==': true,
	'<': true,
	'>': true,
	'<=': true,
	'>=': true,
	'&&': true,
	'||': true,
	'|': true
};

export default class Lexer {

	lex(text) {
		// 输入待解析的东西
		this.text = text;
		// 当前索引
		this.index = 0;
		// 当前字符
		this.ch = undefined;
		// 存储标识、令牌
		this.tokens = [];
		// 循环读取每个输入字符
		while (this.index < this.text.length) {
			// 通过当前索引获取当前字符
			this.ch = this.text.charAt(this.index);
			// 当前字符是一个数字，或者当前字符为.,下一个字符是数字，这兼容整数和浮点数两种
			if (this.isNumber(this.ch) || (this.is('.') && this.isNumber(this.peek()))) {
				this.readNumber();
			} else if (this.is('\'"')) {
				// 传入开始的引号，判断字符串结束和开始引号是否相同
				this.readString(this.ch);
			} else if (this.is('[],{}:.()?;')) {
				this.tokens.push({
					text: this.ch
				});
				this.index++;
			} else if (this.isIdent(this.ch)) {
				// 判断为a-z,A-Z,_,$
				this.readIdent();
			} else if (this.isWhitespace(this.ch)) {
				// 空格处理
				this.index++;
			} else {
				// 一元表达式
				const ch = this.ch;
				const ch2 = this.ch + this.peek();
				const ch3 = this.ch + this.peek() + this.peek(2);
				const op = OPERATORS[ch];
				const op2 = OPERATORS[ch2];
				const op3 = OPERATORS[ch3];
				if (op || op2 || op3) {
					const token = op3 ? ch3 : (op2 ? ch2 : ch);
					this.tokens.push({text: token});
					this.index += token.length;
				} else {
					throw 'Unexpected next character: ' + this.ch;
				}
			}
		}
		return this.tokens;
	}

	/**
	 * 判断是否为数字
	 * @param ch
	 */
	isNumber(ch) {
		return ch >= '0' && ch <= '9';
	}

	/**
	 * 读取数字
	 */
	readNumber() {
		let number = '';
		while (this.index < this.text.length) {
			// 为了兼容科学计数法的字符 e 大小写问题，全部转为小写
			let ch = this.text.charAt(this.index).toLowerCase();
			if (ch === '.' || this.isNumber(ch)) {
				number += ch;
			} else {
				// 下一个字符
				const nextCh = this.peek();
				// 上一个字符
				const prevCh = number.charAt(number.length - 1);
				// 兼容科学计数法
				// 如果当前字符为e,下一个字符为运算符
				if (ch === 'e' && this.isExpOperator(nextCh)) {
					number += ch;
				} else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
					// 当前为运算符，前一个字符为e,下一个字符存在且是一个数字
					number += ch;
				} else if (this.isExpOperator(ch) && prevCh === 'e' && (!nextCh || !this.isNumber(nextCh))) {
					throw 'Invalid exponent';
				} else {
					break;
				}
			}
			this.index++;
		}
		this.tokens.push({
			text: number,
			value: Number(number)
		});
	}

	/**
	 * 读取字符串
	 * @param quote 传入引号
	 */
	readString(quote) {
		this.index++;
		let string = '';
		// 存取原始字符串
		let rawString = quote;
		// 转义标识
		let escape = false;
		while (this.index < this.text.length) {
			const ch = this.text.charAt(this.index);
			rawString += ch;
			// 是否需要转义
			if (escape) {
				// 如果为unicode编码
				if (ch === 'u') {
					// 截取出16进制的code
					const hex = this.text.substring(this.index + 1, this.index + 5);
					if (!hex.match(/[\da-f]{4}/i)) {
						throw 'Invalid unicode escape';
					}
					// 将index值提高跳过16值代表的字符
					this.index += 4;
					// 获取16进制code对应的字符
					string += String.fromCharCode(parseInt(hex, 16));
				} else {
					// 如果是字符字符，从常量 ESCAPES 中获取可以替换的值
					const replacement = ESCAPES[ch];
					if (replacement) {
						string += replacement;
					} else {
						string += ch;
					}
				}
				escape = false;
			} else if (ch === quote) {
				// 当前字符为引号
				this.index++;
				this.tokens.push({
					text: rawString,
					value: string
				});
				return;
			} else if (ch === '\\') {
				escape = true;
			} else {
				string += ch;
			}
			this.index++;
		}
		throw 'Unmatched quote';
	}

	/**
	 * 读取标识符
	 */
	readIdent() {
		let text = '';
		while (this.index < this.text.length) {
			const ch = this.text.charAt(this.index);
			if (this.isIdent(ch) || this.isNumber(ch)) {
				text += ch;
			} else {
				break;
			}
			this.index++;
		}
		const token = {
			text: text,
			identifier: true
		};
		this.tokens.push(token);
	}
	/**
	 * 返回下 n 个字符的文本，而不向前移动当前的索引。如果没有第n个字符，`peek`会返回`false`
	 * @returns {*}
	 */
	peek(n) {
		n = n || 1;
		return this.index + n < this.text.length ? this.text.charAt(this.index + n) : false;
	}

	/**
	 * 判断当前字符是否为运算符
	 * @param ch
	 * @returns {boolean|*}
	 */
	isExpOperator(ch) {
		return ch === '-' || ch === '+' || this.isNumber(ch);
	}
	/**
	 * 是否标识符
	 * @param ch
	 */
	isIdent(ch) {
		return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
	}

	/**
	 * 是否为空白符
	 * @param ch
	 */
	isWhitespace(ch) {
		return ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0';
	}

	/**
	 * 检查是否包含当前字符
	 * @param chs
	 * @returns {boolean}
	 */
	is(chs) {
		return chs.indexOf(this.ch) >= 0;
	}
};
