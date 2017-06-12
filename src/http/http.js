/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
import _ from 'lodash';
/**
 * 判断对象类型
 * @param object
 * @returns {boolean}
 */
function isBlob(object) {
	return object.toString() === '[object Blob]';
}
function isFile(object) {
	return object.toString() === '[object File]';
}
function isFormData(object) {
	return object.toString() === '[object FormData]';
}
function isJsonLike(data) {
	if (data.match(/^\{(?!\{)/)) {
		return data.match(/\}$/);
	} else if (data.match(/^\[/)) {
		return data.match(/\]$/);
	}
}
/**
 * 默认response数据转换
 * @param data
 * @param headers
 */
function defaultHttpResponseTransform(data, headers) {
	if (_.isString(data)) {
		const contentType = headers('Content-Type');
		if (contentType && contentType.indexOf('application/json') === 0 || isJsonLike(data)) {
			return JSON.parse(data);
		}
	}
	return data;
}
/**
 *参数序列化
 */
function $HttpParamSerializerProvider() {
	this.$get = function () {
		return function serializeParams(params) {
			const parts = [];
			_.forEach(params, (value, key) => {
				// 如果值是null、undefined将跳过不做拼接
				if (_.isNull(value) || _.isUndefined(value)) {
					return;
				}
				// 如果不是数组做正常处理
				if (!_.isArray(value)) {
					value = [value];
				}
				// 循环每个value
				_.forEach(value, v => {
					if (_.isObject(v)) {
						v = JSON.stringify(v);
					}
					parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
				});
			});
			return parts.join('&');
		};
	};
}
/**
 * 实现类似jQuery的参数序列化
 */
function $HttpParamSerializerJQLikeProvider() {
	this.$get = function () {
		return function (params) {
			const parts = [];
			function serialize(value, prefix, topLevel) {
				if (_.isNull(value) || _.isUndefined(value)) {
					return;
				}
				if (_.isArray(value)) {
					_.forEach(value, function (v, i) {
						serialize(v, prefix + '[' + (_.isObject(v) ? i : '') + ']');
					});
				} else if (_.isObject(value)) {
					_.forEach(value, function (v, k) {
						serialize(v, prefix + (topLevel ? '' : '[') + k + (topLevel ? '' : ']'));
					});
				} else {
					parts.push(encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
				}
			}
			serialize(params, '', true);
			return parts.join('&');
		};
	};
}

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
		},
		// 转换请求
		transformRequest: [function (data) {
			// 对于 Blob,file,FormData 不做JSON序列化
			if (_.isObject(data) && !isBlob(data) && !isFile(data) && !isFormData(data)) {
				return JSON.stringify(data);
			} else {
				return data;
			}
		}],
		transformResponse: [defaultHttpResponseTransform],
		paramSerializer: '$httpParamSerializer'
	};
	
	this.$get = ['$httpBackend', '$q', '$rootScope', '$injector', function ($httpBackend, $q, $rootScope, $injector) {
		
		function sendReq(config, reqData) {
			// create a Deferred
			const deferred = $q.defer();
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
			// 构建传递给backend的url
			const url = buildUrl(config.url, config.paramSerializer(config.params));
			
			// 调用 $httpBackend
			$httpBackend(
				config.method,
				url,
				reqData,
				done,
				config.headers,
				config.withCredentials
			);
			// 返回 Deferred 结果
			return deferred.promise;
		}
		
		function $http(requestConfig) {
			
			// 配置默认值
			const config = _.extend({
				method: 'GET',
				transformRequest: defaults.transformRequest,
				transformResponse: defaults.transformResponse,
				paramSerializer: defaults.paramSerializer
			}, requestConfig);
			
			// 将请求配置参数与headers合并
			config.headers = mergeHeaders(requestConfig);
			
			if (_.isString(config.paramSerializer)) {
				config.paramSerializer = $injector.get(config.paramSerializer);
			}
			
			if (_.isUndefined(config.withCredentials) &&
				!_.isUndefined(defaults.withCredentials)) {
				config.withCredentials = defaults.withCredentials;
			}
			
			const reqData = transformData(
				config.data,
				headersGetter(config.headers),
				undefined,
				config.transformRequest
			);
			
			// 如果data数据为空，为了不造成误导，那么删除content-type
			if (_.isUndefined(reqData)) {
				_.forEach(config.headers, (v, k) => {
					if (k.toLowerCase() === 'content-type') {
						delete config.headers[k];
					}
				});
			}
			// 转换响应数据
			function transformResponse(response) {
				// 如果data存在处理数据
				if (response.data) {
					response.data = transformData(
						response.data,
						response.headers,
						response.status,
						config.transformResponse);
				}
				// 如果请求成功返回response，失败再次reject
				if (isSuccess(response.status)) {
					return response;
				} else {
					return $q.reject(response);
				}
			}
			return sendReq(config, reqData)
				.then(transformResponse, transformResponse);
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
		if (_.isObject(headers)) {
			return _.transform(headers, function (result, v, k) {
				result[_.trim(k.toLowerCase())] = _.trim(v);
			}, {});
		} else {
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
	
	/**
	 * 转换数据
	 * @param data
	 * @param transform
	 * @returns {*}
	 */
	function transformData(data, headers, status, transform) {
		if (_.isFunction(transform)) {
			return transform(data, headers, status);
		} else {
			return _.reduce(transform, function (data, fn) {
				return fn(data, headers, status);
			}, data);
		}
	}
	
	/**
	 * 构建url
	 * @param url
	 * @param serializedParams
	 * @returns {*}
	 */
	function buildUrl(url, serializedParams) {
		if (serializedParams.length) {
			url += (url.indexOf('?') === -1) ? '?' : '&';
			url += serializedParams;
		}
		return url;
	}
}

module.exports = {
	$HttpProvider: $HttpProvider,
	$HttpParamSerializerProvider: $HttpParamSerializerProvider,
	$HttpParamSerializerJQLikeProvider: $HttpParamSerializerJQLikeProvider
};

