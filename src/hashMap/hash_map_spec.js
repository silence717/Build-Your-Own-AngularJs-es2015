/**
 * @author  https://github.com/silence717
 * @date on 2017/2/15
 */
import _ from 'lodash';
import {hashKey, HashMap} from './hash_map';

describe('hash', () => {
	describe('hashKey', () => {
		it('is undefined:undefined for undefined', () => {
			expect(hashKey(undefined)).toEqual('undefined:undefined');
		});
		it('is object:null for null', () => {
			expect(hashKey(null)).toEqual('object:null');
		});
		it('is boolean:true for true', () => {
			expect(hashKey(true)).toEqual('boolean:true');
		});
		it('is boolean:false for false', () => {
			expect(hashKey(false)).toEqual('boolean:false');
		});
		it('is number:42 for 42', () => {
			expect(hashKey(42)).toEqual('number:42');
		});
		it('is string:42 for "42"', () => {
			expect(hashKey('42')).toEqual('string:42');
		});
		it('is object:[unique id] for objects', () => {
			expect(hashKey({})).toMatch(/^object:\S+$/);
		});
		it('is the same key when asked for the same object many times', () => {
			const obj = {};
			expect(hashKey(obj)).toEqual(hashKey(obj));
		});
		it('does not change when object value changes', () => {
			const obj = {a: 42};
			const hash1 = hashKey(obj);
			obj.a = 43;
			const hash2 = hashKey(obj);
			expect(hash1).toEqual(hash2);
		});
		it('is not the same for different objects even with the same value', () => {
			const obj1 = {a: 42};
			const obj2 = {a: 42};
			expect(hashKey(obj1)).not.toEqual(hashKey(obj2));
		});
		it('is function:[unique id] for functions', () => {
			const fn = a => { return a; };
			expect(hashKey(fn)).toMatch(/^function:\S+$/);
		});
		it('is the same key when asked for the same function many times', () => {
			const fn = function () { };
			expect(hashKey(fn)).toEqual(hashKey(fn));
		});
		it('is not the same for different identical functions', () => {
			const fn1 = function () { return 42; };
			const fn2 = function () { return 42; };
			expect(hashKey(fn1)).not.toEqual(hashKey(fn2));
		});
		it('stores the hash key in the $$hashKey attribute', () => {
			const obj = {a: 42};
			const hash = hashKey(obj);
			expect(obj.$$hashKey).toEqual(hash.match(/^object:(\S+)$/)[1]);
		});
		it('uses preassigned $$hashKey', () => {
			expect(hashKey({$$hashKey: 42})).toEqual('object:42');
		});
		it('supports a function $$hashKey', () => {
			expect(hashKey({$$hashKey: _.constant(42)})).toEqual('object:42');
		});
		it('calls the function $$hashKey as a method with the correct this', () => {
			expect(hashKey({
				myKey: 42,
				$$hashKey: function () {
					return this.myKey;
				}
			})).toEqual('object:42');
		});
	});

	describe('HashMap', () => {
		it('supports put and get of primitives', () => {
			const map = new HashMap();
			map.put(42, 'fourty two');
			expect(map.get(42)).toEqual('fourty two');
		});
		it('supports put and get of objects with hashKey semantics', () => {
			const map = new HashMap();
			const obj = {};
			map.put(obj, 'my value');
			expect(map.get(obj)).toEqual('my value');
			expect(map.get({})).toBeUndefined();
		});
		it('supports remove', () => {
			const map = new HashMap();
			map.put(42, 'fourty two');
			map.remove(42);
			expect(map.get(42)).toBeUndefined();
		});
		it('returns value from remove', () => {
			const map = new HashMap();
			map.put(42, 'fourty two');
			expect(map.remove(42)).toEqual('fourty two');
		});
	});
});
