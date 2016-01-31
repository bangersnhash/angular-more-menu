'use strict';

angular.module('bnh.moremenu', ['bnh.moremenu.templates']);

angular.module('bnh.moremenu')
  .controller('bnhtest', ['$scope', function ($scope) {
    $scope.anotherTest = 'this works';
  }])
  .run(function () {
    console.log("this works");
  });
