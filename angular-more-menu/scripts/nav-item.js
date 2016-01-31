
'use strict';

/**
* @ngdoc directive
* @name bnh.moremenu.directive:bnhMenuItem
* @restrict A
*
* @description
* Adds behavior to Menu items, including overflow calculations.
*/

angular.module('bnh.moremenu')
  .directive('moreMenuItem', ['moreMenuService', bnhMenuItem]);

function bnhMenuItem (moreMenuService) {
  return {
    restrict: 'A',
    link: function ($scope, element, attrs) {
      $scope.$on('more-menu:overflow', function () {
        if (moreMenuService.getMediaQuery() === 'desktop') {
          var option = $scope.$eval(attrs.option);
          // Set option as hidden
          option.isOverflow = (element[0].offsetTop > 0) ? true : false;

          // Also set previous menu item hidden to accomodate More menu
          if (option.isOverflow === true && option.index > 0) {
            $scope.options.mainmenu.children[option.index - 1].isOverflow = true;
          }
        }
      });
    }
  };
}
