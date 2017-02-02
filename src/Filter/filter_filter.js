/**
 * @author  https://github.com/silence717
 * @date on 2017/2/1
 */

import _ from 'lodash';

function filterFilter() {
	return (array, filterExpr) => {
		return _.filter(array, filterExpr);
	};
}
module.exports = filterFilter;
