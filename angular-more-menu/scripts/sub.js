'use strict';

angular.module('bnh.moremenu')

/**
 * @ngdoc directive
 * @name bnh.moreMenu.directive:bnhSub
 * @restrict E
 *
 * @description
 * Adds behavior to Dropdown items, including repositioning menus when overflowed.
 */
  .directive('moreMenuSub', [
    '$timeout',
    'moreMenuService',
    function ($timeout, moreMenuService) {
      return {
        restrict: 'E',
        scope: {
          child: '=options'
        },
        templateUrl: 'angular-more-menu/views/sub.html',

        compile: function (element) {
          return moreMenuService.recursiveCompile(element, function ($scope, element) {

            $scope.subStyle = {};

            var renderSub = function () {
              if ($scope.child.isOpen && moreMenuService.getMediaQuery() === 'desktop') {
                $timeout(function () {

                  if (!$scope.child.root) {
                    // Reposition dropdown if menu goes offscreen. Do not reposition user menu (aligned right)
                    var position = element.parent().offset().left;
                    var width = element.children().width();
                    if (position + width > moreMenuService.getWindowWidth()) {
                      $scope.subStyle.left = '-' + (position + width - moreMenuService.getWindowWidth() + 30) + 'px';
                    } else {
                      delete $scope.subStyle.left;
                    }
                  }
                  // Ensure sub menu items are scrollable
                  $scope.subStyle.maxHeight = moreMenuService.getWindowHeight() - 100 + 'px';
                }, 0);

                // Make dropdown visible after repositioning complete
                $scope.subStyle.opacity = 1;
              }
            };

            $scope.subStyle = {};
            // In Desktop layout, check if default menu position extends beyond window bounds.
            if ($scope.child && $scope.child.level === 0) {
              $scope.$on('more-menu:open', function () {
                renderSub();
              });
              renderSub();
            }

            $scope.handleClick = function ($event, option) {
              moreMenuService.handleClick($scope, $event, option);
              $scope.$emit('more-menu:open');

            };
          });
        }
      };
    }
  ]
);
