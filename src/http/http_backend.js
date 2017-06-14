/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
import _ from 'lodash';

function $HttpBackendProvider() {
	
	this.$get = function () {
		return function (method, url, post, callback, headers, timeout, withCredentials) {
			// 利用原生的 XMLHttpRequest
			const xhr = new window.XMLHttpRequest();
			let timeoutId;
			// 打开一个请求
			xhr.open(method, url, true);
			// 循环headers里面所有的参数
			_.forEach(headers, function (value, key) {
				// 给指定的HTTP请求头赋值
				xhr.setRequestHeader(key, value);
			});
			// 如果标识为真，则可以跨域
			if (withCredentials) {
				xhr.withCredentials = true;
			}
			// 发送请求
			xhr.send(post || null);
			// 监听请求成功事件，触发后执行事件函数
			xhr.onload = function () {
				// 首先需要清除
				if (!_.isUndefined(timeoutId)) {
					clearTimeout(timeoutId);
				}
				const response = ('response' in xhr) ? xhr.response : xhr.responseText;
				
				const statusText = xhr.statusText || '';
				callback(xhr.status, response, xhr.getAllResponseHeaders(), statusText);
			};
			// 监听请求失败事件
			xhr.onerror = function () {
				if (!_.isUndefined(timeoutId)) {
					clearTimeout(timeoutId);
				}
				callback(-1, null, '');
			};
			// 做超时处理，直接取消请求
			if (timeout && timeout.then) {
				timeout.then(function () {
					xhr.abort();
				});
			} else if (timeout > 0) {
				timeoutId = setTimeout(function () {
					xhr.abort();
				}, timeout);
			}
		};
	};
}
module.exports = $HttpBackendProvider;
