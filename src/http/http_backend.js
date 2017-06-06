/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */

function $HttpBackendProvider() {
	this.$get = function () {
		return function (method, url, post, callback) {
			// 利用原生的 XMLHttpRequest
			const xhr = new window.XMLHttpRequest();
			// 打开一个请求
			xhr.open(method, url, true);
			// 发送请求
			xhr.send(post || null);
			// 监听请求成功事件，触发后执行事件函数
			xhr.onload = function () {
				const response = ('response' in xhr) ? xhr.response : xhr.responseText;
				
				const statusText = xhr.statusText || '';
				callback(xhr.status, response, statusText);
			};
			// 监听请求失败事件
			xhr.onerror = function () {
				callback(-1, null, '');
			};
		};
	};
}
module.exports = $HttpBackendProvider;
