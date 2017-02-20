/**
 * @author  https://github.com/silence717
 * @date on 2017/2/20
 */
import publishExternalAPI from './angular_public';
import createInjector from '../injector/injector';

describe('angularPublic', () => {
	it('sets up the angular object and the module loader', () => {
		publishExternalAPI();
		expect(window.angular).toBeDefined();
		expect(window.angular.module).toBeDefined();
	});
	it('sets up the ng module', () => {
		publishExternalAPI();
		expect(createInjector(['ng'])).toBeDefined();
	});
});
