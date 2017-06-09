/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
import _ from 'lodash';

function $HttpProvider() {
	// 默认值
	const defaults = this.defaults = {
		headers: {
			common: {
				Accept: 'application/json, text/plain, */*'
			},
			post: {
				'Content-Type': 'application/json;charset=utf-8'
			}, put: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			patch: {
				'Content-Type': 'application/json;charset=utf-8'
			}
		}
	};
	
	this.$get = ['$httpBackend', '$q', '$rootScope', function ($httpBackend, $q, $rootScope) {
		function $http(requestConfig) {
			// create a Deferred
			const deferred = $q.defer();
			// 配置默认值
			const config = _.extend({
				method: 'GET'
			}, requestConfig);
			// 将请求配置参数与headers合并
			config.headers = mergeHeaders(requestConfig);
			
			if (_.isUndefined(config.withCredentials) &&
				!_.isUndefined(defaults.withCredentials)) {
				config.withCredentials = defaults.withCredentials;
			}
			
			// 如果data数据为空，为了不造成误导，那么删除content-type
			if (_.isUndefined(config.data)) {
				_.forEach(config.headers, (v, k) => {
					if (k.toLowerCase() === 'content-type') {
						delete config.headers[k];
					}
				});
			}
			
			// 构造回调
			function done(status, response, headersString, statusText) {
				status = Math.max(status, 0);
				deferred[isSuccess(status) ? 'resolve' : 'reject']({
					status: status,
					data: response,
					statusText: statusText,
					headers: headersGetter(headersString),
					config: config
				});
				// 如果当前没有digest，手动触发
				if (!$rootScope.$$phase) {
					$rootScope.$apply();
				}
			}
			// 调用 $httpBackend
			$httpBackend(
				config.method,
				config.url,
				config.data,
				done,
				config.headers,
				config.withCredentials
			);
			// 返回 Deferred 结果
			return deferred.promise;
		}
		$http.defaults = defaults;
		return $http;
	}];
	/**
	 * judge request success or failure
	 * @param status  code
	 * @returns {boolean}
	 */
	function isSuccess(status) {
		return status >= 200 && status < 300;
	}
	/**
	 * merge headers params
	 * @param config
	 * @returns {any|void}
	 */
	function mergeHeaders(config) {
		const reqHeaders = _.extend(
			{},
			config.headers
		);
		const defHeaders = _.extend(
			{},
			defaults.headers.common,
			defaults.headers[(config.method || 'get').toLowerCase()]
		);
		
		_.forEach(defHeaders, (value, key) => {
			const headerExists = _.some(reqHeaders, (v, k) => {
				return k.toLowerCase() === key.toLowerCase();
			});
			if (!headerExists) {
				reqHeaders[key] = value;
			}
		});
		return executeHeaderFns(reqHeaders, config);
	}
	
	/**
	 * 处理headers中所有为函数的情况
	 * @param headers
	 * @param config
	 * @returns {any|*}
	 */
	function executeHeaderFns(headers, config) {
		return _.transform(headers, (result, v, k) => {
			if (_.isFunction(v)) {
				v = v(config);
				if (_.isNull(v) || _.isUndefined(v)) {
					delete result[k];
				} else {
					result[k] = v;
				}
			}
		}, headers);
	}
	
	/**
	 * get header value
	 * @param headers
	 * @returns {Function}
	 */
	function headersGetter(headers) {
		var headersObj;
		return function (name) {
			headersObj = headersObj || parseHeaders(headers);
			if (name) {
				return headersObj[name.toLowerCase()];
			} else {
				return headersObj;
			}
		};
	}
	
	/**
	 * 解析头
	 * @param headers
	 * @returns {any|*}
	 */
	function parseHeaders(headers) {
		const lines = headers.split('\n');
		return _.transform(lines, (result, line) => {
			const separatorAt = line.indexOf(':');
			const name = _.trim(line.substr(0, separatorAt)).toLowerCase();
			const value = _.trim(line.substr(separatorAt + 1));
			if (name) {
				result[name] = value;
			}
		}, {});
	}
}

module.exports = $HttpProvider;
