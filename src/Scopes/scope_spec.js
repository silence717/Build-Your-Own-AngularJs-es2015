/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
'use strict';
import Scope from './scope';
describe('Scope', function () {
	it('can be constructed and used as an object', function () {
		const scope = new Scope();
		scope.aProperty = 1;
		expect(scope.aProperty).toBe(1);
	});
});
