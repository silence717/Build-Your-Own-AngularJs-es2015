/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
function $HttpProvider() {
	this.$get = ['$httpBackend', '$q', '$rootScope', function ($httpBackend, $q, $rootScope) {
		return function $http(config) {
			const deferred = $q.defer();
			function done(status, response, statusText) {
				status = Math.max(status, 0);
				deferred[isSuccess(status) ? 'resolve' : 'reject']({
					status: status,
					data: response,
					statusText: statusText,
					config: config
				});
				if (!$rootScope.$$phase) {
					$rootScope.$apply();
				}
			}
			$httpBackend(config.method, config.url, config.data, done);
			return deferred.promise;
		};
	}];
}
function isSuccess(status) {
	return status >= 200 && status < 300;
}
module.exports = $HttpProvider;
