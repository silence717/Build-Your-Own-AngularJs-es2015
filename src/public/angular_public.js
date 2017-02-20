/**
 * @author  https://github.com/silence717
 * @date on 2017/2/20
 */
import setupModuleLoader from '../loader/loader';

export default function publishExternalAPI() {
	setupModuleLoader(window);
	const ngModule = window.angular.module('ng', []);
}
