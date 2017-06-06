/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */

function $HttpBackendProvider() {
	this.$get = function () {
		return function (method, url, post, callback) {
			const xhr = new window.XMLHttpRequest();
			xhr.open(method, url, true);
			xhr.send(post || null);
			// 加载的时候
			xhr.onload = function () {
				const response = ('response' in xhr) ? xhr.response : xhr.responseText;
				
				const statusText = xhr.statusText || '';
				callback(xhr.status, response, statusText);
			};
			// 出错的时候
			xhr.onerror = function () {
				callback(-1, null, '');
			};
		};
	};
}
module.exports = $HttpBackendProvider;
