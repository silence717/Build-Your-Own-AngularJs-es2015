/**
 * @author  https://github.com/silence717
 * @date on 2017/2/1
 */
import publishExternalAPI from '../public/angular_public';
import createInjector from '../injector/injector';

describe('filter filter', () => {
	let parse;
	beforeEach(function () {
		publishExternalAPI();
		parse = createInjector(['ng']).get('$parse');
	});
	it('is available', () => {
		const injector = createInjector(['ng']);
		expect(injector.has('filterFilter')).toBe(true);
	});
	it('can filter an array with a predicate function', () => {
		const fn = parse('[1, 2, 3, 4] | filter:isOdd');
		const scope = {
			isOdd: n => {
				return n % 2 !== 0;
			}
		};
		expect(fn(scope)).toEqual([1, 3]);
	});
	it('can filter an array of strings with a string', () => {
		const fn = parse('arr | filter:"a"');
		expect(fn({arr: ['a', 'b', 'a']})).toEqual(['a', 'a']);
	});
	it('filters an array of strings with substring matching', () => {
		const fn = parse('arr | filter:"o"');
		expect(fn({arr: ['quick', 'brown', 'fox']})).toEqual(['brown', 'fox']);
	});
	it('filters an array of strings ignoring case', () => {
		const fn = parse('arr | filter:"o"');
		expect(fn({arr: ['quick', 'BROWN', 'fox']})).toEqual(['BROWN', 'fox']);
	});
	it('filters an array of objects where any value matches', () => {
		const fn = parse('arr | filter:"o"');
		expect(fn({arr: [
			{firstName: 'John', lastName: 'Brown'},
			{firstName: 'Jane', lastName: 'Fox'},
			{firstName: 'Mary', lastName: 'Quick'}
		]})).toEqual([
			{firstName: 'John', lastName: 'Brown'},
			{firstName: 'Jane', lastName: 'Fox'}
		]);
	});
	it('filters an array of objects where a nested value matches', () => {
		const fn = parse('arr | filter:"o"');
		expect(fn({arr: [
			{name: {first: 'John', last: 'Brown'}},
			{name: {first: 'Jane', last: 'Fox'}},
			{name: {first: 'Mary', last: 'Quick'}}
		]})).toEqual([
			{name: {first: 'John', last: 'Brown'}},
			{name: {first: 'Jane', last: 'Fox'}}
		]);
	});
	it('filters an array of arrays where a nested value matches', () => {
		const fn = parse('arr | filter:"o"');
		expect(fn({arr: [
			[{name: 'John'}, {name: 'Mary'}],
			[{name: 'Jane'}]
		]})).toEqual([
			[{name: 'John'}, {name: 'Mary'}]
		]);
	});
	it('filters with a number', () => {
		const fn = parse('arr | filter:42');
		expect(fn({arr: [
			{name: 'Mary', age: 42},
			{name: 'John', age: 43},
			{name: 'Jane', age: 44}
		]})).toEqual([
			{name: 'Mary', age: 42}
		]);
	});
	it('filters with a boolean value', () => {
		const fn = parse('arr | filter:true');
		expect(fn({arr: [
			{name: 'Mary', admin: true},
			{name: 'John', admin: true},
			{name: 'Jane', admin: false}
		]})).toEqual([
			{name: 'Mary', admin: true},
			{name: 'John', admin: true}
		]);
	});
	it('filters with a substring numeric value', () => {
		const fn = parse('arr | filter:42');
		expect(fn({arr: ['contains 42']})).toEqual(['contains 42']);
	});
	it('filters matching null', () => {
		const fn = parse('arr | filter:null');
		expect(fn({arr: [null, 'not null']})).toEqual([null]);
	});
	it('does not match null value with the string null', () => {
		const fn = parse('arr | filter:"null"');
		expect(fn({arr: [null, 'not null']})).toEqual(['not null']);
	});
	it('allows negating string filter', () => {
		const fn = parse('arr | filter:"!o"');
		expect(fn({arr: ['quick', 'brown', 'fox']})).toEqual(['quick']);
	});
	it('filters with an object', () => {
		const fn = parse('arr | filter:{name: "o"}');
		expect(fn({arr: [
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]})).toEqual([
			{name: 'Joe', role: 'admin'}
		]);
	});
	it('must match all criteria in an object', () => {
		const fn = parse('arr | filter:{name: "o", role: "m"}');
		expect(fn({arr: [
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]})).toEqual([
			{name: 'Joe', role: 'admin'}
		]);
	});
	it('matches everything when filtered with an empty object', () => {
		const fn = parse('arr | filter:{}');
		expect(fn({arr: [
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]})).toEqual([
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]);
	});
	it('filters with a nested object', () => {
		const fn = parse('arr | filter:{name: {first: "o"}}');
		expect(fn({arr: [
			{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'}
		]})).toEqual([
			{name: {first: 'Joe'}, role: 'admin'}
		]);
	});
	it('allows negation when filtering with an object', () => {
		const fn = parse('arr | filter:{name: {first: "!o"}}');
		expect(fn({arr: [
			{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'}
		]})).toEqual([
			{name: {first: 'Jane'}, role: 'moderator'}
		]);
	});
	it('ignores undefined values in expectation object', () => {
		const fn = parse('arr | filter:{name: thisIsUndefined}');
		expect(fn({arr: [
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]})).toEqual([
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]);
	});
	it('filters with a nested object in array', () => {
		const fn = parse('arr | filter:{users: {name: {first: "o"}}}');
		expect(fn({arr: [
			{users: [{name: {first: 'Joe'}, role: 'admin'},
				{name: {first: 'Jane'}, role: 'moderator'}]},
			{users: [{name: {first: 'Mary'}, role: 'admin'}]}
		]})).toEqual([
			{users: [{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'}]}
		]);
	});
	it('filters with nested objects on the same level only', () => {
		const items = [{user: 'Bob'},
			{user: {name: 'Bob'}},
			{user: {name: {first: 'Bob', last: 'Fox'}}}];
		const fn = parse('arr | filter:{user: {name: "Bob"}}');
		expect(fn({arr: items})).toEqual([
			{user: {name: 'Bob'}}
		]);
	});
	it('filters with a wildcard property', () => {
		const fn = parse('arr | filter:{$: "o"}');
		expect(fn({arr: [
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'},
			{name: 'Mary', role: 'admin'}
		]})).toEqual([
			{name: 'Joe', role: 'admin'},
			{name: 'Jane', role: 'moderator'}
		]);
	});
	it('filters nested objects with a wildcard property', () => {
		const fn = parse('arr | filter:{$: "o"}');
		expect(fn({arr: [
			{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'},
			{name: {first: 'Mary'}, role: 'admin'}
		]})).toEqual([
			{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'}
		]);
	});
	it('filters wildcard properties scoped to parent', () => {
		const fn = parse('arr | filter:{name: {$: "o"}}');
		expect(fn({arr: [
			{name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
			{name: {first: 'Jane', last: 'Quick'}, role: 'moderator'},
			{name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
		]})).toEqual([
			{name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
			{name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
		]);
	});
	it('filters primitives with a wildcard property', () => {
		const fn = parse('arr | filter:{$: "o"}');
		expect(fn({arr: ['Joe', 'Jane', 'Mary']})).toEqual(['Joe']);
	});
	it('filters with a nested wildcard property', () => {
		const fn = parse('arr | filter:{$: {$: "o"}}');
		expect(fn({arr: [
			{name: {first: 'Joe'}, role: 'admin'},
			{name: {first: 'Jane'}, role: 'moderator'},
			{name: {first: 'Mary'}, role: 'admin'}
		]})).toEqual([
			{name: {first: 'Joe'}, role: 'admin'}
		]);
	});
	it('allows using a custom comparator', () => {
		const fn = parse('arr | filter:{$: "o"}:myComparator');
		expect(fn({
			arr: ['o', 'oo', 'ao', 'aa'],
			myComparator: (left, right) => {
				return left === right;
			}
		})).toEqual(['o']);
	});
	it('allows using an equality comparator', () => {
		const fn = parse('arr | filter:{name: "Jo"}:true');
		expect(fn({arr: [
			{name: 'Jo'},
			{name: 'Joe'}
		]})).toEqual([
			{name: 'Jo'}
		]);
	});
});
