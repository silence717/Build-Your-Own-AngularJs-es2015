/**
 * @author  https://github.com/silence717
 * @desc []
 * @date 2017-08-02
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('$controller', () => {
	beforeEach(() => {
		delete window.angular;
		publishExternalAPI();
	});
	
	it('instantiates controller functions', () => {
		const injector = createInjector(['ng']);
		const $controller = injector.get('$controller');
		function MyController() {
			this.invoked = true;
		}
		const controller = $controller(MyController);
		expect(controller).toBeDefined();
		expect(controller instanceof MyController).toBe(true);
		expect(controller.invoked).toBe(true);
	});
	
	it('injects dependencies to controller functions', () => {
		const injector = createInjector(['ng', $provide => {
			$provide.constant('aDep', 42);
		}]);
		const $controller = injector.get('$controller');
		function MyController(aDep) {
			this.theDep = aDep;
		}
		const controller = $controller(MyController);
		expect(controller.theDep).toBe(42);
	});
	
	it('allows injecting locals to controller functions', () => {
		const injector = createInjector(['ng']);
		const $controller = injector.get('$controller');
		function MyController(aDep) {
			this.theDep = aDep;
		}
		const controller = $controller(MyController, {aDep: 42});
		expect(controller.theDep).toBe(42);
	});
	
	it('allows registering controllers at config time', () => {
		function MyController() {
		}
		const injector = createInjector(['ng', $controllerProvider => {
			$controllerProvider.register('MyController', MyController);
		}]);
		const $controller = injector.get('$controller');
		const controller = $controller('MyController');
		expect(controller).toBeDefined();
		expect(controller instanceof MyController).toBe(true);
	});
	
	it('allows registering several controllers in an object', () => {
		function MyController() { }
		function MyOtherController() { }
		const injector = createInjector(['ng', $controllerProvider => {
			$controllerProvider.register({
				MyController: MyController,
				MyOtherController: MyOtherController
			});
		}]);
		const $controller = injector.get('$controller');
		const controller = $controller('MyController');
		const otherController = $controller('MyOtherController');
		
		expect(controller instanceof MyController).toBe(true);
		expect(otherController instanceof MyOtherController).toBe(true);
	});
	
	it('allows registering controllers through modules', () => {
		const module = window.angular.module('myModule', []);
		module.controller('MyController', function MyController() { });
		
		const injector = createInjector(['ng', 'myModule']);
		const $controller = injector.get('$controller');
		const controller = $controller('MyController');
		
		expect(controller).toBeDefined();
	});
	
	
});
