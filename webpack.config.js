/**
 * @author  https://github.com/silence717
 * @date on 2016/12/7
 */
var path = require('path');
var config = {
	devtool: 'eval',
	output: {
		pathinfo: true
	},
	eslint: {
		configFile: '.eslintrc',
		emitWarning: true,
		emitError: true,
		formatter: require('eslint-friendly-formatter')
	},
	module: {
		preLoaders: [{
			test: /\.js$/,
			loader: 'eslint-loader',
			exclude: /node_modules/,
			include: [path.join(__dirname, './src')]
		}],
		loaders: [{
			test: /\.js$/,
			loaders: ['babel'],
			exclude: /node_modules/,
			include: [path.join(__dirname, './src')]
		}],
		postLoaders: [{
			test: /\.js$/,
			loader: 'istanbul-instrumenter',
			exclude: /node_modules|_spec\.js$/,
			include: [path.join(__dirname, './src')]
		}]
	}
};
module.exports = config;
