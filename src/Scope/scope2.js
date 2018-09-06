import _ from 'lodash';

// 初始化watch的值
function initWacthVal() {}

export default class Scope {


  constructor() {
    this.$$watchers = [];
  }

  $watch(watchFn, listenerFn) {

    const watcher = {
      watchFn,
      listenerFn,
      last: initWacthVal
    };
    
    this.$$watchers.push(watcher);
  }

  $digest() {

    let newValue;
    let oldValue;
    
    _.forEach(this.$$watchers, watcher => {
      
      newValue = watcher.watchFn(this);
      // 第一次获取last的时候值为undefined
      oldValue = watcher.last;
      // 只有当新旧值不相等的时候才执行listener
      if (newValue !== oldValue) {
        watcher.last = newValue;
        // watcher.listenerFn(newValue, oldValue, this);
        const temp = oldValue === initWacthVal ? newValue : oldValue;
        watcher.listenerFn(newValue, temp, this);
      }
    });
  }

}
