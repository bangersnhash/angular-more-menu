'use strict';

var moreMenuDemo = angular.module('moreMenuDemo', []);

moreMenuDemo.controller('moreMenuDemoCtrl', ['$scope', function ($scope) {
    $scope.demo = {
      title: "Angular More Menu Example"
    };
  }]);
