var webpackConfig = require('./webpack.config');

module.exports = function (config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		files: [
			'test/index.js'
		],
		exclude: [],
		preprocessors: {
			'test/index.js': ['webpack']
		},
		webpack: webpackConfig,
		// Webpack middleware
		webpackMiddleware: {
			noInfo: true
		},
		reporters: ['progress', 'coverage'],
		// optionally, configure the reporter
		coverageReporter: {
			reporters: [
				// generates ./coverage/lcov.info
				{type: 'lcovonly', subdir: '.'},
				// generates ./coverage/coverage-final.json
				{type: 'json', subdir: '.'}
			]
		},
		port: 9876,
		colors: true,
		logLevel: config.LOG_INFO,
		autoWatch: true,
		browsers: ['PhantomJS'],
		singleRun: true,
		concurrency: Infinity
	});
};
