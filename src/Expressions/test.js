it('can parse filter expressions', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('upcase', function() {
			return function(str) {
				return str.toUpperCase();
			};
		});
	}]).get('$parse');
	var fn = parse('aString | upcase');
	expect(fn({aString: 'Hello'})).toEqual('HELLO');
});
it('can parse filter chain expressions', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('upcase', function() {
			return function(s) {
				return s.toUpperCase();
			};
		});
		$filterProvider.register('exclamate', function() {
			return function(s) {
				return s + '!';
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | upcase | exclamate');
	expect(fn()).toEqual('HELLO!');
});
it('can pass an additional argument to filters', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('repeat', function() {
			return function(s, times) {
				return _.repeat(s, times);
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | repeat:3');
	expect(fn()).toEqual('hellohellohello');
});
it('can pass several additional arguments to filters', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('surround', function() {
			return function(s, left, right) {
				return left + s + right;
			};
		});
	}]).get('$parse');
	var fn = parse('"hello" | surround:"*":"!"');
	expect(fn()).toEqual('*hello!');
});
// ...
it('marks filters constant if arguments are', function() {
	parse = createInjector(['ng', function($filterProvider) {
		$filterProvider.register('aFilter', function() {
			return _.identity;
		});
	}]).get('$parse');
	expect(parse('[1, 2, 3] | aFilter').constant).toBe(true);
	expect(parse('[1, 2, a] | aFilter').constant).toBe(false);
	expect(parse('[1, 2, 3] | aFilter:42').constant).toBe(true);
	expect(parse('[1, 2, 3] | aFilter:a').constant).toBe(false);
});