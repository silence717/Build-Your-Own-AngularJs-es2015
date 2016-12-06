/**
 * @author  https://github.com/silence717
 * @date on 2016/12/6
 */
var sayHello = require('../../src/chapter0/hello');
describe('Hello', function () {
	it('says hello', function () {
		expect(sayHello('Jane')).toBe('Hello, Jane!');
	});
});