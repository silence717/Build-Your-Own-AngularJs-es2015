/**
 * @author  https://github.com/silence717
 * @date on 2017/2/1
 */
import {filter} from './filter';
import parse from '../ExpressionsAndFilters/parse';

describe('filter filter', () => {
	it('is available', () => {
		expect(filter('filter')).toBeDefined();
	});
	it('can filter an array with a predicate function', () => {
		const fn = parse('[1, 2, 3, 4] | filter:isOdd');
		const scope = {
			isOdd: n => {
				return n % 2 !== 0;
			}
		};
		expect(fn(scope)).toEqual([1, 3]);
	});
});
