/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
import _ from 'lodash';

function $HttpProvider() {
	this.$get = ['$httpBackend', '$q', '$rootScope', function ($httpBackend, $q, $rootScope) {
		return function $http(requestConfig) {
			// create a Deferred
			const deferred = $q.defer();
			// 配置默认值
			const config = _.extend({
				method: 'GET'
			}, requestConfig);
			// 构造回调
			function done(status, response, statusText) {
				status = Math.max(status, 0);
				deferred[isSuccess(status) ? 'resolve' : 'reject']({
					status: status,
					data: response,
					statusText: statusText,
					config: config
				});
				// 如果当前没有digest，手动触发
				if (!$rootScope.$$phase) {
					$rootScope.$apply();
				}
			}
			// 调用 $httpBackend
			$httpBackend(config.method, config.url, config.data, done);
			// 返回 Deferred 结果
			return deferred.promise;
		};
	}];
}
/**
 * judge request success or failure
 * @param status  code
 * @returns {boolean}
 */
function isSuccess(status) {
	return status >= 200 && status < 300;
}
module.exports = $HttpProvider;
