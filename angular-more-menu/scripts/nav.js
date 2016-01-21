
'use strict';

/**
 * @ngdoc directive
 * @name bnh.moremenu.directive:bnhMoreMenu
 * @restrict E
 *
 * @description
 * Generate menu wrapper
 *
 */
angular.module('bnh.moremenu')
  .directive('moreMenu', [
    '$compile',
    '$document',
    '$http',
    '$filter',
    '$injector',
    '$interpolate',
    '$interval',
    '$q',
    '$timeout',
    '$window',
    'moreMenuService',
    function (
      $compile,
      $document,
      $http,
      $filter,
      $injector,
      $interpolate,
      $interval,
      $q,
      $timeout,
      $window,
      moreMenuService
    ) {
      return {
      restrict: 'E',
      scope: {
        data: '=?',
        dataSource: '=?',
        menuFilter: '=?'
      },
      templateUrl: 'angular-more-menu/views/nav.html',
      link: function ($scope, element) {

        $scope.$element = $(element);

        // Set default values for chrome options if not specified on directive
        if (!$scope.dataSource) {
          $scope.dataSource = 'data/mainmenu.json';
        }
        if ($scope.menuFilter) {
          moreMenuService.setMenuFilter($scope.menuFilter);
        }

        // Load ui.router for sref functionality, if in use by project
        $scope.hasUiRouter = $injector.has('ui.router');
        var $state = ($scope.hasUiRouter) ? $injector.get('ui.router') : null;

        // Store current json source for menus
        var sourceUrl = {
          'mainmenu': $scope.dataSource
        };
        var source = {
          'mainmenu': $scope.data
        };

        // Global Nav Menu parameters
        $scope.options = {
          // Menu Options
          'mainmenu': {
            'title': 'Menu',
            'isHidden': true,
            'level': -1,
            'children': [],
            'root': true
          },

          // More Menu status
          moremenu: {
            'title': 'More',
            'isHidden': true,
            'level': 0,
            'children': []
          }
        };

        // Determine which menu items will fit within the current window size
        $scope.redrawMenuItems = redrawMenuItems;

        // Hide/Show the main navigation if user scrolls beyond 100px
        $scope.checkScrollState = checkScrollState;

        // Close menu if user clicks outside the navigation
        $scope.documentClick = documentClick;


        var onResize = _.throttle(function () {
          // Close all menus when window resized to prevent visual artifacts
          $scope.$apply($scope.redrawMenuItems);
        }, 100);

        var onScroll = _.throttle(function () {
          $scope.$apply($scope.checkScrollState);
        }, 200);

        angular.element($window).on('resize', onResize);

        angular.element($window).on('scroll', onScroll);

        // Set Initial Media Query
        moreMenuService.updateMediaQuery();

        // Fetch mainmenu and usermenu json
        updateMenu('mainmenu').then(function () {
          // When both menus are fetched, recalculate menu sizing
          $scope.redrawMenuItems();
        });

        populateMenu('mainmenu');

        $scope.mainFilter = mainFilter;
        $scope.moreFilter = moreFilter;

        $scope.getOptionHref = getOptionHref;

        /****
        * Watcher Functions
        ****/

        // Trigger a menu redraw if the breadcrumb changes
        $scope.$watch('breadcrumb', $scope.redrawMenuItems, true);

        // Refresh menu options if the source changes
        $scope.$watch('dataSource', function () {
          if ($scope.dataSource && $scope.dataSource !== sourceUrl.mainmenu) {
            sourceUrl.mainmenu = $scope.dataSource;
            updateMenu('mainmenu');
          }
        });
        $scope.$watch('usermenuSource', function () {
          if ($scope.usermenuSource && $scope.usermenuSource !== sourceUrl.usermenu) {
            sourceUrl.usermenu = $scope.usermenuSource;
            updateMenu('usermenu');
          }
        });


        $scope.$watch('pageTitleContent', function (content) {
          var pageTitleElement = $scope.$element.find('#title-content');

          if (angular.isFunction(content)) {
            pageTitleElement.append(content());
            $scope.showPageTitleContent = true;
          } else {
            pageTitleElement.empty();
            $scope.showPageTitleContent = false;
          }
        });

        $scope.$watch('replacementPageTitleContent', function (content) {
          var pageTitleElement = $scope.$element.find('#title-content');
          var htmlContent = angular.isFunction(content) ? content() : content;
          if (angular.isDefined(htmlContent)) {
            pageTitleElement.html(htmlContent);
            $scope.showPageTitleContent = true;
          } else {
            pageTitleElement.empty();
            $scope.showPageTitleContent = false;
          }
        });

        /****
        * Function Definitions
        ****/

        function mainFilter (option) {
          return !option.isHidden;
        }

        function moreFilter (option) {
          return (option.isOverflow) ? true : false;
        }

        function getOptionHref (option) {
          if (option.sref && $scope.hasUiRouter) {
            return $state.href(option.sref);
          } else if (option.uri) {
            return option.uri;
          } else {
            return '';
          }
        }

        function documentClick (event, force) {
          $timeout(function () {
            if (force || $scope.$element.has(event.target).length === 0) {
              moreMenuService.closeAll($scope);
            }
          });
        }

        function checkScrollState () {
          if ($scope.collapse) {
            var collapse = moreMenuService.getCollapsed();
            if (collapse !== null) {
              $scope.isCollapsed = collapse;
            }
          }
        }

        function populateMenu (menuType, newOptions) {
          if (newOptions) {
            $scope.options[menuType].all = newOptions;
          }
          $scope.options[menuType].children = angular.copy($scope.options[menuType].all) || [];

          moreMenuService.setDefaultProperties($scope.options[menuType]);

          $scope.redrawMenuItems();

        }

        // Set new menu options if JSON is updated
        function updateMenu (menuType) {
          var deferred = $q.defer();

          if (sourceUrl[menuType]) {
            $http.get(sourceUrl[menuType]).then(function (result) {
              if (result && result.data) {
                populateMenu(menuType, result.data);
              } else {
                $scope.options[menuType].children = [];
              }
              deferred.resolve();
            });
          } else if (source[menuType]) {
            populateMenu(menuType, source[menuType]);
            deferred.resolve();
          }
          return deferred;
        }

        function redrawMenuItems () {
          moreMenuService.closeAll($scope);
          moreMenuService.updateMediaQuery();

          // Make all menu options visible to calculate overflow
          $scope.options.mainmenu.isHidden = false;
          moreMenuService.setProperty($scope.options.mainmenu.children, { isHidden: false });

          // Clear out more menu
          $scope.options.moremenu.isHidden = true;
          $scope.options.moremenu.hasDropdown = false;
          $scope.options.moremenu.children.splice(0, $scope.options.moremenu.children.length);
          if (moreMenuService.getMediaQuery() === 'phone') {
            $scope.options.mainmenu.isOpen = false;
          } else {
            $timeout(function () {
              $scope.$apply(function () {
                // Trigger overflow calculations
                $scope.$broadcast('more-menu:overflow');

                var hidden = angular.copy(moreMenuService.setProperty($scope.options.mainmenu.children, { isHidden: true }, { isOverflow: true }));
                // Show the more menu option if there are overflow menus
                if (hidden && hidden.length) {
                  moreMenuService.setProperty(hidden, { level: 1 });
                  $scope.options.moremenu.children.push.apply($scope.options.moremenu.children, hidden);
                  $scope.options.moremenu.hasDropdown = true;
                  $scope.options.moremenu.isHidden = false;
                }
              });
            });
          }
        }
      },
      controller: [
        '$scope',
        '$state',
        '$location',
        'moreMenuService',
        function (
          $scope,
          $state,
          $location,
          moreMenuService) {

          $scope.handleClick = function ($event, option) {
            moreMenuService.handleClick($scope, $event, option);
          };

          // Check for active state
          $scope.isCurrentState = function (option) {
            var currentPath;
            if (option.sref) {
              return $state.includes(option.sref);
            } else if (option.uri) {
              currentPath = option.uri.substring(option.uri.indexOf('#') + 1);
              return ($location.path().indexOf(currentPath) === 0);
            }
          };
        }]
      };
    }
  ]
);
