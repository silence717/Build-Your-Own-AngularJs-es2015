/**
 * @author https://github.com/silence717
 * @date 2017.09.26
 */
const ngControllerDirective = function () {
	return {
		restrict: 'A',
		scope: true,
		controller: '@'
	};
};
module.exports = ngControllerDirective;
