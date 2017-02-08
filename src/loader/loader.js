/**
 * @author  https://github.com/silence717
 * @date on 2017/2/7
 */
export default function setupModuleLoader(window) {
	const ensure = function(obj, name, factory) {
		return obj[name] || (obj[name] = factory());
	};
	const angular = ensure(window, 'angular', Object);
}
