// require all `js`
const appContext = require.context('../src', true, /\.js$/);
appContext.keys().forEach(appContext);
