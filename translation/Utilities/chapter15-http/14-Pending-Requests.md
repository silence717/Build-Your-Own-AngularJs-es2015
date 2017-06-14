## Pending Requests
有时检查请求正在处理中是有用的。这主要是用于调试和工具，但也有可能有其他用处。

这个功能可以使用 interceptors 实现，但是这也有一个在*$http*内置的一个功能：任何正在进行的请求都会通过一个`$http.pendingRequests`的属性可以
在一个数组中访问。当一个请求发送的时候会被添加到里面，当一个响应被接收的时候会移除 - 不管是成功或者失败响应：
```js
describe('pending requests', () => {
		
    it('are in the collection while pending', () => {
        $http.get('http://teropa.info');
        $rootScope.$apply();
        expect($http.pendingRequests).toBeDefined();
        expect($http.pendingRequests.length).toBe(1);
        expect($http.pendingRequests[0].url).toBe('http://teropa.info');
        requests[0].respond(200, {}, 'OK');
        $rootScope.$apply();
        expect($http.pendingRequests.length).toBe(0);
    });
    
    it('are also cleared on failure', () => {
        $http.get('http://teropa.info');
        $rootScope.$apply();
        requests[0].respond(404, {}, 'Not found');
        $rootScope.$apply();
        expect($http.pendingRequests.length).toBe(0);
    });
});
```
我们将在`$httpProvider.$get`中初始化这个数组到`$http`对象：
```js
$http.defaults = defaults;
$http.pendingRequests = [];
```
现在我们将在`sendReq`方法中添加和删除request给这个数组。当请求被发送的时候push到这个数组，当Promise被resolve或者reject的时候从数组移除：
```js
function sendReq(config, reqData) {
    var deferred = $q.defer();
    $http.pendingRequests.push(config);
    deferred.promise.then(function() {
      _.remove($http.pendingRequests, config);
    }, function() {
      _.remove($http.pendingRequests, config);
    });
    // ...
}
```
注意到我们做这个在`sendReq`而不是`$http`，当一个请求在 interceptor 的管道中时，我们不能认为它的状态为"pending"。仅仅只有在执行的时候。