/**
 * @author  https://github.com/silence717
 * @date on 2017-03-15
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('$q', () => {
	let $q;
	beforeEach(() => {
		publishExternalAPI();
		$q = createInjector(['ng']).get('$q');
	});
	it('can create a deferred', () => {
		const d = $q.defer();
		expect(d).toBeDefined();
	});
});
