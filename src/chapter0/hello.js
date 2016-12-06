/**
 * @author  https://github.com/silence717
 * @date on 2016/12/6
 */
var _ = require('lodash');
module.exports = function sayHello(to) {
	return _.template('Hello, <%= name%>!')({name: to});
};