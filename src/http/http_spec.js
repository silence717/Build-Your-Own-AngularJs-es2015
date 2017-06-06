/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-06-04
 */
// 此版本1.17.1不支持，必须升级到2.3.2可正常
import sinon from 'sinon';
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';


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

});
