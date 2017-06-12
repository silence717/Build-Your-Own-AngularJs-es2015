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
	
	beforeEach(() => {
		publishExternalAPI();
		const injector = createInjector(['ng']);
		$http = injector.get('$http');
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
		expect(requests.length).toBe(1);
		expect(requests[0].requestHeaders.Accept).toBe('text/plain');
		expect(requests[0].requestHeaders['Cache-Control']).toBe('no-cache');
	});
	
	it('sets default headers on request', () => {
		$http({
			url: 'http://teropa.info'
		});
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
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: '42'
		});
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
		expect(requests[0].withCredentials).toBe(true);
	});
	
	it('allows setting withCredentials from defaults', () => {
		$http.defaults.withCredentials = true;
		
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: 42
		});
		
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
		
		requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
		
		expect(response.data).toEqual('*Hello*');
	});
	
	it('transforms error responses also', () => {
		let response;
		$http({
			url: 'http://teropa.info',
			transformResponse: function(data) {
				return '*' + data + '*';
			}
		}).catch(function (r) {
			response = r;
		});
		
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
		
		requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
		
		expect(response.data).toEqual('unauthorized');
	});
	
	it('serializes object data to JSON for requests', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: {aKey: 42}
		});
		
		expect(requests[0].requestBody).toBe('{"aKey":42}');
	});
	
	it('serializes array data to JSON for requests', () => {
		$http({
			method: 'POST',
			url: 'http://teropa.info',
			data: [1, 'two', 3]
		});
		
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
		}).then(function(r) {
			response = r;
		});
		requests[0].respond(200, {}, '{"message":"hello"}');
		
		expect(_.isObject(response.data)).toBe(true);
		expect(response.data.message).toBe('hello');
	});
	
	it('parses a JSON array response without content type', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function(r) {
			response = r;
		});
		requests[0].respond(200, {}, '[1, 2, 3]');
		
		expect(_.isArray(response.data)).toBe(true);
		expect(response.data).toEqual([1, 2, 3]);
	});
	
	it('does not choke on response resembling JSON but not valid', () => {
		let response;
		$http({
			method: 'GET',
			url: 'http://teropa.info'
		}).then(function(r) {
			response = r;
		});
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
		requests[0].respond(200, {}, '{{expr}}');
		
		expect(response.data).toEqual('{{expr}}');
	});
	
});
