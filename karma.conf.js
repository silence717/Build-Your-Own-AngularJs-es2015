module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['browserify', 'jasmine'],
    files: [
    	'src/**/*.js',
		'src/**/*_spec.js'
    ],
    exclude: [
    ],
    preprocessors: {
		'src/**/*.js': ['jshint', 'browserify']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    browserify: {
      debug: true
    },
    singleRun: false,
    concurrency: Infinity
  });
};
