/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */

const appContext = require.context('../src', true, /_spec\.js$/);
appContext.keys().forEach(appContext);
