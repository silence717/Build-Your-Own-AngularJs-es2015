/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
// 此版本1.17.1不支持，必须升级到2.3.2可正常
import sinon from 'sinon';
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';
import _ from 'lodash';

describe('$http', () => {
	let $http;
	let xhr;
	let requests;
	let $rootScope;
	let $q;
	
	beforeEach(() => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		$q = injector.get('$q');
	});
	
	beforeEach(() => {
		xhr = sinon.useFakeXMLHttpRequest();
		requests = [];
		xhr.onCreate = function (req) {
			requests.push(req);
		};
	});
	
	afterEach(() => {
		xhr.restore();
	});
	
	beforeEach(function () {
		jasmine.clock().install();
	});
	afterEach(function () {
		jasmine.clock().uninstall();
	});
	
	it('is a function', () => {
		expect($http instanceof Function).toBe(true);
	});
	
	it('returns a Promise', () => {
		const result = $http({});
		
		expect(result).toBeDefined();
		expect(result.then).toBeDefined();
	});
	
	it('makes an XMLHttpRequest to given URL', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 'hello'
		});
		$rootScope.$apply();
		expect(requests.length).toBe(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe('http://teropa.info');
		expect(requests[0].async).toBe(true);
		expect(requests[0].requestBody).toBe('hello');
	});
	
	it('resolves promise when XHR result received', () => {
		const requestConfig = {
			method: 'GET',
			url: 'http://teropa.info'
		};
		
		let response;
		$http(requestConfig).then(r => {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, 'Hello');
		
		expect(response).toBeDefined();
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('OK');
		expect(response.data).toBe('Hello');
		expect(response.config.url).toEqual('http://teropa.info');
	});
	
	it('rejects promise when XHR result received with error status', () => {
		const requestConfig = {
			method: 'GET',
			url: 'http://teropa.info'
		};
		
		let response;
		$http(requestConfig).catch(r => {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(401, {}, 'Fail');
		
		expect(response).toBeDefined();
		expect(response.status).toBe(401);
		expect(response.statusText).toBe('Unauthorized');
		expect(response.data).toBe('Fail');
		expect(response.config.url).toEqual('http://teropa.info');
	});
	
	it('rejects promise when XHR result errors/aborts', () => {
		const requestConfig = {
			method: 'GET',
			url: 'http://teropa.info'
		};
		let response;
		$http(requestConfig).catch(r => {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].onerror();
		expect(response).toBeDefined();
		expect(response.status).toBe(0);
		expect(response.data).toBe(null);
		expect(response.config.url).toEqual('http://teropa.info');
	});
	
	it('uses GET method by default', () => {
		$http({
			url: 'http://teropa.info'
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].method).toBe('GET');
	});
	
	it('sets headers on request', () => {
		$http({
			url: 'http://teropa.info',
			headers: {
				'Accept': 'text/plain',
				'Cache-Control': 'no-cache'
			}
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders.Accept).toBe('text/plain');
		expect(requests[0].requestHeaders['Cache-Control']).toBe('no-cache');
	});
	
	it('sets default headers on request', () => {
		$http({
			url: 'http://teropa.info'
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders.Accept).toBe(
			'application/json, text/plain, */*');
	});
	
	it('sets method-specific default headers on request', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: '42'
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders['Content-Type']).toBe(
			'application/json;charset=utf-8');
	});
	
	it('exposes default headers for overriding', () => {
		$http.defaults.headers.post['Content-Type'] = 'text/plain;charset=utf-8';
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: '42'
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders['Content-Type']).toBe(
			'text/plain;charset=utf-8');
	});
	it('exposes default headers through provider', () => {
		const injector = createInjector(['ng', function ($httpProvider) {
			$httpProvider.defaults.headers.post['Content-Type'] =
				'text/plain;charset=utf-8';
		}]);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: '42'
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders['Content-Type']).toBe(
			'text/plain;charset=utf-8');
	});
	
	it('merges default headers case-insensitively', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: '42',
			headers: {
				'content-type': 'text/plain;charset=utf-8'
			}
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders['content-type']).toBe(
			'text/plain;charset=utf-8');
		expect(requests[0].requestHeaders['Content-Type']).toBeUndefined();
	});
	
	it('does not send content-type header when no data', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			}
		});
		$rootScope.$apply();
		
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders['Content-Type']).not.toBe(
			'application/json;charset=utf-8');
	});
	
	it('supports functions as header values', () => {
		const contentTypeSpy = jasmine.createSpy().and.returnValue(
			'text/plain;charset=utf-8');
		$http.defaults.headers.post['Content-Type'] = contentTypeSpy;
		const request = {
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		};
		$http(request);
		$rootScope.$apply();
		
		expect(contentTypeSpy).toHaveBeenCalledWith(request);
		expect(requests[0].requestHeaders['Content-Type']).toBe(
			'text/plain;charset=utf-8');
	});
	
	it('ignores header function value when null/undefined', () => {
		const cacheControlSpy = jasmine.createSpy().and.returnValue(null);
		$http.defaults.headers.post['Cache-Control'] = cacheControlSpy;
		
		const request = {
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		};
		$http(request);
		$rootScope.$apply();
		
		expect(cacheControlSpy).toHaveBeenCalledWith(request);
		expect(requests[0].requestHeaders['Cache-Control']).toBeUndefined();
	});
	
	it('makes response headers available', () => {
		let response;
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
		expect(response.headers).toBeDefined();
		expect(response.headers instanceof Function).toBe(true);
		expect(response.headers('Content-Type')).toBe('text/plain');
		expect(response.headers('content-type')).toBe('text/plain');
	});
	
	it('may returns all response headers', () => {
		let response;
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
		expect(response.headers()).toEqual({'content-type': 'text/plain'});
	});
	
	it('allows setting withCredentials', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42,
			withCredentials: true
		});
		$rootScope.$apply();
		
		expect(requests[0].withCredentials).toBe(true);
	});
	
	it('allows setting withCredentials from defaults', () => {
		$http.defaults.withCredentials = true;
		
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		});
		$rootScope.$apply();
		
		expect(requests[0].withCredentials).toBe(true);
	});
	
	it('allows transforming requests with functions', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42,
			transformRequest: function (data) {
				return '*' + data + '*';
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('*42*');
	});
	
	it('allows multiple request transform functions', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42,
			transformRequest: [function (data) {
				return '*' + data + '*';
			}, function (data) {
				return '-' + data + '-';
			}]
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('-*42*-');
	});
	
	it('allows settings transforms in defaults', () => {
		$http.defaults.transformRequest = [function (data) {
			return '*' + data + '*';
		}];
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('*42*');
	});
	
	it('passes request headers getter to transforms', () => {
		$http.defaults.transformRequest = [function (data, headers) {
			if (headers('Content-Type') === 'text/emphasized') {
				return '*' + data + '*';
			} else {
				return data;
			}
		}];
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42,
			headers: {
				'content-type': 'text/emphasized'
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('*42*');
	});
	
	it('allows transforming responses with functions', () => {
		let response;
		$http({
			url: 'http://teropa.info',
			transformResponse: function (data) {
				return '*' + data + '*';
			}
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
		
		expect(response.data).toEqual('*Hello*');
	});
	
	it('passes response headers to transform functions', () => {
		let response;
		$http({
			url: 'http://teropa.info',
			transformResponse: function (data, headers) {
				if (headers('content-type') === 'text/decorated') {
					return '*' + data + '*';
				} else {
					return data;
				}
			}
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Content-Type': 'text/decorated'}, 'Hello');
		
		expect(response.data).toEqual('*Hello*');
	});
	
	it('allows setting default response transforms', () => {
		$http.defaults.transformResponse = [function (data) {
			return '*' + data + '*';
		}];
		let response;
		$http({
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
		
		expect(response.data).toEqual('*Hello*');
	});
	
	it('transforms error responses also', () => {
		let response;
		$http({
			url: 'http://teropa.info',
			transformResponse: function (data) {
				return '*' + data + '*';
			}
		}).catch(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
		
		expect(response.data).toEqual('*Fail*');
	});
	
	it('passes HTTP status to response transformers', () => {
		let response;
		$http({
			url: 'http://teropa.info',
			transformResponse: function (data, headers, status) {
				if (status === 401) {
					return 'unauthorized';
				} else {
					return data;
				}
			}
		}).catch(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
		
		expect(response.data).toEqual('unauthorized');
	});
	
	it('serializes object data to JSON for requests', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: {aKey: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('{"aKey":42}');
	});
	
	it('serializes array data to JSON for requests', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: [1, 'two', 3]
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe('[1,"two",3]');
	});
	
	it('does not serialize form data for requests', () => {
		let formData = new FormData();
		formData.append('aField', 'aValue');
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: formData
		});
		$rootScope.$apply();
		
		expect(requests[0].requestBody).toBe(formData);
	});
	
	it('parses JSON data for JSON responses', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(
			200,
			{'Content-Type': 'application/json'},
			'{"message":"hello"}'
		);
		
		expect(_.isObject(response.data)).toBe(true);
		expect(response.data.message).toBe('hello');
	});
	
	it('parses a JSON object response without content type', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, '{"message":"hello"}');
		
		expect(_.isObject(response.data)).toBe(true);
		expect(response.data.message).toBe('hello');
	});
	
	it('parses a JSON array response without content type', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, '[1, 2, 3]');
		
		expect(_.isArray(response.data)).toBe(true);
		expect(response.data).toEqual([1, 2, 3]);
	});
	
	it('does not choke on response resembling JSON but not valid', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, '{1, 2, 3]');
		
		expect(response.data).toEqual('{1, 2, 3]');
	});
	
	it('does not try to parse interpolation expr as JSON', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function (r) {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, '{{expr}}');
		
		expect(response.data).toEqual('{{expr}}');
	});
	
	it('adds params to URL', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: 42
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?a=42');
	});
	
	it('adds additional params to URL', () => {
		$http({
			url: 'http://teropa.info?a=42',
			params: {
				b: 42
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?a=42&b=42');
	});
	
	it('escapes url characters in params', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				'==': '&&'
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?%3D%3D=%26%26');
	});
	
	it('does not attach null or undefined params', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: null,
				b: undefined
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info');
	});
	
	it('attaches multiple params from arrays', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: [42, 43]
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?a=42&a=43');
	});
	
	it('serializes objects to json', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: {b: 42}
			}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?a=%7B%22b%22%3A42%7D');
	});
	
	it('serializes dates to ISO strings', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: new Date(2015, 0, 1, 12, 0, 0)
			}
		});
		$rootScope.$apply();
		expect(/\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}/
			.test(requests[0].url)).toBeTruthy();
	});
	
	it('allows substituting param serializer through DI', () => {
		const injector = createInjector(['ng', $provide => {
			$provide.factory('mySpecialSerializer', () => {
				return function (params) {
					return _.map(params, function (v, k) {
						return k + '=' + v + 'lol';
					}).join('&');
				};
			});
		}]);
		injector.invoke(function ($http, $rootScope) {
			$http({
				url: 'http://teropa.info',
				params: {
					a: 42,
					b: 43
				},
				paramSerializer: 'mySpecialSerializer'
			});
			$rootScope.$apply();
			
			expect(requests[0].url).toEqual('http://teropa.info?a=42lol&b=43lol');
		});
	});
	
	it('makes default param serializer available through DI', () => {
		const injector = createInjector(['ng']);
		injector.invoke($httpParamSerializer => {
			const result = $httpParamSerializer({a: 42, b: 43});
			expect(result).toEqual('a=42&b=43');
		});
	});
	
	describe('JQ-like param serialization', () => {
		
		it('is possible', () => {
			$http({
				url: 'http://teropa.info',
				params: {
					a: 42,
					b: 43
				},
				paramSerializer: '$httpParamSerializerJQLike'
			});
			$rootScope.$apply();
			
			expect(requests[0].url).toEqual('http://teropa.info?a=42&b=43');
		});
		
		it('uses square brackets in arrays', () => {
			$http({
				url: 'http://teropa.info',
				params: {
					a: [42, 43]
				},
				paramSerializer: '$httpParamSerializerJQLike'
			});
			$rootScope.$apply();
			
			expect(requests[0].url).toEqual('http://teropa.info?a%5B%5D=42&a%5B%5D=43');
		});
		
	});
	
	it('uses square brackets in objects', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: {b: 42, c: 43}
			},
			paramSerializer: '$httpParamSerializerJQLike'
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toEqual('http://teropa.info?a%5Bb%5D=42&a%5Bc%5D=43');
	});
	
	it('supports nesting in objects', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: {b: {c: 42}}
			},
			paramSerializer: '$httpParamSerializerJQLike'
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toEqual('http://teropa.info?a%5Bb%5D%5Bc%5D=42');
	});
	
	it('appends array indexes when items are objects', () => {
		$http({
			url: 'http://teropa.info',
			params: {
				a: [{b: 42}]
			},
			paramSerializer: '$httpParamSerializerJQLike'
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toEqual('http://teropa.info?a%5B0%5D%5Bb%5D=42');
	});
	
	it('supports shorthand method for GET', () => {
		$http.get('http://teropa.info', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('GET');
	});
	
	it('supports shorthand method for HEAD', () => {
		$http.head('http://teropa.info', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('HEAD');
	});
	
	it('supports shorthand method for DELETE', () => {
		$http.delete('http://teropa.info', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('DELETE');
	});
	
	it('supports shorthand method for POST with data', () => {
		$http.post('http://teropa.info', 'data', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('POST');
		expect(requests[0].requestBody).toBe('data');
	});
	
	it('supports shorthand method for PUT with data', () => {
		$http.put('http://teropa.info', 'data', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].requestBody).toBe('data');
	});
	
	it('supports shorthand method for PATCH with data', () => {
		$http.patch('http://teropa.info', 'data', {
			params: {q: 42}
		});
		$rootScope.$apply();
		
		expect(requests[0].url).toBe('http://teropa.info?q=42');
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].requestBody).toBe('data');
	});
	
	it('allows attaching interceptor factories', () => {
		const interceptorFactorySpy = jasmine.createSpy();
		const injector = createInjector(['ng', $httpProvider => {
			$httpProvider.interceptors.push(interceptorFactorySpy);
		}]);
		$http = injector.get('$http');
		
		expect(interceptorFactorySpy).toHaveBeenCalled();
	});
	
	it('uses DI to instantiate interceptors', () => {
		const interceptorFactorySpy = jasmine.createSpy();
		const injector = createInjector(['ng', $httpProvider => {
			$httpProvider.interceptors.push(['$rootScope', interceptorFactorySpy]);
		}]);
		$http = injector.get('$http');
		const $rootScope = injector.get('$rootScope');
		expect(interceptorFactorySpy).toHaveBeenCalledWith($rootScope);
	});
	
	it('allows referencing existing interceptor factories', () => {
		const interceptorFactorySpy = jasmine.createSpy().and.returnValue({});
		const injector = createInjector(['ng', ($provide, $httpProvider) => {
			$provide.factory('myInterceptor', interceptorFactorySpy);
			$httpProvider.interceptors.push('myInterceptor');
		}]);
		$http = injector.get('$http');
		expect(interceptorFactorySpy).toHaveBeenCalled();
	});
	
	it('allows intercepting requests', () => {
		const injector = createInjector(['ng', function ($httpProvider) {
			$httpProvider.interceptors.push(function () {
				return {
					request: function (config) {
						config.params.intercepted = true;
						return config;
					}
				};
			});
		}]);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		$http.get('http://teropa.info', {params: {}});
		$rootScope.$apply();
		expect(requests[0].url).toBe('http://teropa.info?intercepted=true');
	});
	
	it('allows returning promises from request intercepts', () => {
		const injector = createInjector(['ng', function ($httpProvider) {
			$httpProvider.interceptors.push(function ($q) {
				return {
					request: function (config) {
						config.params.intercepted = true;
						return $q.when(config);
					}
				};
			});
		}]);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		$http.get('http://teropa.info', {params: {}});
		$rootScope.$apply();
		expect(requests[0].url).toBe('http://teropa.info?intercepted=true');
	});
	
	it('allows intercepting responses', () => {
		const injector = createInjector(['ng', $httpProvider => {
			$httpProvider.interceptors.push(_.constant({
				response: function (response) {
					response.intercepted = true;
					return response;
				}
			}));
		}]);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		let response;
		$http.get('http://teropa.info').then(r => {
			response = r;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {}, 'Hello');
		expect(response.intercepted).toBe(true);
	});
	
	it('allows intercepting request errors', () => {
		const requestErrorSpy = jasmine.createSpy();
		const injector = createInjector(['ng', $httpProvider => {
			$httpProvider.interceptors.push(_.constant({
				request: function (config) {
					throw 'fail';
				}
			}));
			$httpProvider.interceptors.push(_.constant({
				requestError: requestErrorSpy
			}));
		}]);
		
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		$http.get('http://teropa.info');
		$rootScope.$apply();
		
		expect(requests.length).toBe(0);
		expect(requestErrorSpy).toHaveBeenCalledWith('fail');
	});
	
	it('allows intercepting response errors', () => {
		const responseErrorSpy = jasmine.createSpy();
		const injector = createInjector(['ng', $httpProvider => {
			$httpProvider.interceptors.push(_.constant({
				responseError: responseErrorSpy
			}));
			$httpProvider.interceptors.push(_.constant({
				response: function () {
					throw 'fail';
				}
			}));
		}]);
		$http = injector.get('$http');
		$rootScope = injector.get('$rootScope');
		
		$http.get('http://teropa.info');
		$rootScope.$apply();
		
		requests[0].respond(200, {}, 'Hello');
		$rootScope.$apply();
		
		expect(responseErrorSpy).toHaveBeenCalledWith('fail');
	});
	
	it('allows attaching success handlers', () => {
		let data, status, headers, config;
		$http.get('http://teropa.info').success(function (d, s, h, c) {
			data = d;
			status = s;
			headers = h;
			config = c;
		});
		$rootScope.$apply();
		
		requests[0].respond(200, {'Cache-Control': 'no-cache'}, 'Hello');
		$rootScope.$apply();
		
		expect(data).toBe('Hello');
		expect(status).toBe(200);
		expect(headers('Cache-Control')).toBe('no-cache');
		expect(config.method).toBe('GET');
	});
	
	it('allows attaching error handlers', () => {
		let data, status, headers, config;
		$http.get('http://teropa.info').error((d, s, h, c) => {
			data = d;
			status = s;
			headers = h;
			config = c;
		});
		$rootScope.$apply();
		
		requests[0].respond(401, {'Cache-Control': 'no-cache'}, 'Fail');
		$rootScope.$apply();
		
		expect(data).toBe('Fail');
		expect(status).toBe(401);
		expect(headers('Cache-Control')).toBe('no-cache');
		expect(config.method).toBe('GET');
	});
	
	it('allows aborting a request with a Promise', () => {
		const timeout = $q.defer();
		$http.get('http://teropa.info', {
			timeout: timeout.promise
		});
		$rootScope.$apply();
		
		timeout.resolve();
		$rootScope.$apply();
		
		expect(requests[0].aborted).toBe(true);
	});
	
	it('allows aborting a request after a timeout', () => {
		$http.get('http://teropa.info', {
			timeout: 5000
		});
		$rootScope.$apply();
		
		jasmine.clock().tick(5001);
		
		expect(requests[0].aborted).toBe(true);
	});
	
	describe('pending requests', () => {
		
		it('are in the collection while pending', () => {
			$http.get('http://teropa.info');
			$rootScope.$apply();
			expect($http.pendingRequests).toBeDefined();
			expect($http.pendingRequests.length).toBe(1);
			expect($http.pendingRequests[0].url).toBe('http://teropa.info');
			requests[0].respond(200, {}, 'OK');
			$rootScope.$apply();
			expect($http.pendingRequests.length).toBe(0);
		});
		
		it('are also cleared on failure', () => {
			$http.get('http://teropa.info');
			$rootScope.$apply();
			requests[0].respond(404, {}, 'Not found');
			$rootScope.$apply();
			expect($http.pendingRequests.length).toBe(0);
		});
	});
	
	describe('useApplyAsync', () => {
		
		beforeEach(function () {
			const injector = createInjector(['ng', $httpProvider => {
				$httpProvider.useApplyAsync(true);
			}]);
			$http = injector.get('$http');
			$rootScope = injector.get('$rootScope');
		});
		
		xit('does not resolve promise immediately when enabled', () => {
			const resolvedSpy = jasmine.createSpy();
			$http.get('http://teropa.info').then(resolvedSpy);
			$rootScope.$apply();
			
			requests[0].respond(200, {}, 'OK');
			expect(resolvedSpy).toHaveBeenCalled();
		});
		
		it('resolves promise later when enabled', () => {
			const resolvedSpy = jasmine.createSpy();
			$http.get('http://teropa.info').then(resolvedSpy);
			$rootScope.$apply();
			
			requests[0].respond(200, {}, 'OK');
			jasmine.clock().tick(100);
			
			expect(resolvedSpy).toHaveBeenCalled();
		});
	});
	
});
