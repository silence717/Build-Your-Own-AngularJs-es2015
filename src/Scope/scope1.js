import _ from 'lodash';

export default class Scope {


  constructor() {
    this.$$watchers = [];
  }

  $watch(watchFn, listenerFn) {

    const watcher = {
      watchFn,
      listenerFn
    };
    
    this.$$watchers.push(watcher);
  }

  // 什么特殊处理也不做，只要调用digest就触发对应的listener
  $digest() {
    
    _.forEach(this.$$watchers, watcher => {
      watcher.listenerFn();
    });

  }

}
