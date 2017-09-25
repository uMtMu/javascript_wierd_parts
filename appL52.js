// http://underscorejs.org/docs/underscore.html
var arr1 = [1, 2, 3, 4];

var arr2 = _.map(arr1, (item) => item * 3);
console.log(arr2);

var arr3 = _.filter([2, 3, 4, 5, 6, 7], (a) => a % 2);

console.log(arr3);