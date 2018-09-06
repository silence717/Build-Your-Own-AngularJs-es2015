import _ from 'lodash';

// 初始化watch的值
function initWacthVal() {}
// 判断是否相等
function areEqual(newValue, oldValue, valueEq) {
  
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue;
  }

}

export default class Scope {


  constructor() {
    this.$$watchers = [];
    this.lastDirtyWatch = null;
  }

  $watch(watchFn, listenerFn, valueEq) {

    const watcher = {
      watchFn,
      listenerFn,
      valueEq, 
      last: initWacthVal
    };
    
    this.$$watchers.push(watcher);
    // 新加入一个watcher的时候将lastDirtyWatch初始化
    this.lastDirtyWatch = null;
  }

  $digest() {
  
    let ttl = 10;
    this.lastDirtyWatch = null;

    let newValue;
    let oldValue;
    // 标记是否为脏
    let dirty;
    // 上来先执行一次看是否所有值发生变化，如果有变化，则第二次执行watch
    do {
      // 初次进来设置为false
      dirty = false;

      _.forEach(this.$$watchers, watcher => {
      
        newValue = watcher.watchFn(this);
        
        // 第一次获取last的时候值为undefined
        oldValue = watcher.last;

        // 只有当新旧值不相等的时候才执行listener
        if (areEqual(newValue, oldValue, watcher.valueEq)) {
          // 标记值发生变化
          dirty = true;
          // watcher.last = newValue;
          // 如果为对象或者数组的话需要深拷贝
          watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
          // 将 lastDirtyWatch 设置为当前的watcher
          this.lastDirtyWatch = watcher;

          // watcher.listenerFn(newValue, oldValue, this);
          const temp = oldValue === initWacthVal ? newValue : oldValue;
          watcher.listenerFn(newValue, temp, this);
        } else if (this.lastDirtyWatch === watcher) {
          // 新旧值没有变化，并且当前的 watcher 和 lastDirtyWatch 相等，那么重置 dirty
          dirty = false;
        }

      });
      // 如果为脏，并且ttl达到0的时候
      if (dirty && !(ttl--)) {
        throw '10 digest iterations reached';
      }

    } while (dirty);
    
  }

}
