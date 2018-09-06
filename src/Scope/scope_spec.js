// eslint-disable

import Scope from './scope4';

describe('Scope', () => {
  // Angular的Scope对象是POJO（简单的JavaScript对象），在它们上面，可以像对其他对象一样添加属性。
  it('can be constructed and used as an object', () => {
    const scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });


  describe('digest', () => {

    let scope;

    beforeEach(() => {
      scope = new Scope();
    });

    it('calls the listener function of a watch on first $digest', () => {
      
      const watchFn = () => 'wat';
      const listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);

      scope.$digest();

      expect(listenerFn).toHaveBeenCalled();
    });

    it('calls the listener function when the watched value changes', () => {
      
      scope.someValue = 'a';
      scope.counter = 0;
      
      scope.$watch(
        scope => scope.someValue,
        (newValue, oldValue, scope) => { scope.counter++; }
      );
      expect(scope.counter).toBe(0);
      
      // someValue从undefined到a触发一次listener
      scope.$digest();
      expect(scope.counter).toBe(1);
      
      // 未改变继续保持
      scope.$digest();
      expect(scope.counter).toBe(1);
      
      // 修改someValue但是未触发digest
      scope.someValue = 'b';
      expect(scope.counter).toBe(1);
      
      // 再次触发digest执行listener
      scope.$digest();
      expect(scope.counter).toBe(2);
    });

  });

});
