'use strict';

var moreMenuDemo = angular.module('moreMenuDemo', ['bnh.moremenu']);

moreMenuDemo.controller('moreMenuDemoCtrl', ['$scope', function ($scope) {
    $scope.demo = {
      title: "Angular More Menu Example"
    };
  }]);
