/**
 * @author  https://github.com/silence717
 * @date on 2017/1/24
 */
import {register, filter} from './filter';

describe('filter', () => {
	it('can be registered and obtained', () => {
		const myFilter = () => { };
		const myFilterFactory = () => {
			return myFilter;
		};
		register('my', myFilterFactory);
		expect(filter('my')).toBe(myFilter);
	});
	it('allows registering multiple filters with an object', () => {
		const myFilter = () => { };
		const myOtherFilter = () => { };
		register({
			my: () => {
				return myFilter;
			},
			myOther: () => {
				return myOtherFilter;
			}
		});
		expect(filter('my')).toBe(myFilter);
		expect(filter('myOther')).toBe(myOtherFilter);
	});
});
