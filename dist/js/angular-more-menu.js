(function(){
"use strict";

angular.module('bnh.moremenu', []);

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
      $scope.$on('bnh-responsive-nav:overflow', function () {
        if (moreMenuService.getMediaQuery() === 'desktop') {
          var option = $scope.$eval(attrs.option);
          // Set option as hidden
          option.isOverflow = (element.get(0).offsetTop > 0) ? true : false;

          // Also set previous menu item hidden to accomodate More menu
          if (option.isOverflow === true && option.index > 0) {
            $scope.options.mainmenu.children[option.index - 1].isOverflow = true;
          }
        }
      });
    }
  };
}

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

/**
* @ngdoc service
* @name bnh.moremenu.factory:moreMenuService
*
* @description
* Common methods for More Menu directives.
*/

angular.module('bnh.moremenu')
  .factory('moreMenuService', ['$filter', '$compile', '$window', moreMenuService]);

function moreMenuService ($filter, $compile, $window) {

  var windowWidth;
  var windowHeight;
  var mediaQuery;
  var openItems = [];
  var lastPosition = 0;
  var menuFilter;

  var service = {
    setProperty: setProperty,
    setDefaultProperties: setDefaultProperties,
    setMenuFilter: setMenuFilter,
    updateMediaQuery: updateMediaQuery,
    getMediaQuery: getMediaQuery,
    getWindowWidth: getWindowWidth,
    getWindowHeight: getWindowHeight,
    getScrollOffset: getScrollOffset,
    getCollapsed: getCollapsed,
    recursiveCompile: recursiveCompile,
    handleClick: handleClick,
    closeAll: closeAll,
    menuOn: menuOn,
    menuOff: menuOff
  };

  return service;



  // Set property values on matching menu options
  function setProperty (arr, prop, rule) {
    var items = [];
    arr.forEach(function (i) {
      // Filter array items to those which match rule
      if (!rule || _.matches(rule)(i)) {
        // Add new properties to item
        items.push(_.assign(i, prop));
      }
    });
    return items;
  }

  // Extend menu options object with base set of properties to track menu state
  function setDefaultProperties (menu) {

    // Filter items by permission and/or custom menu-filter
    if (menu.children && menuFilter) {
      menu.children = menuFilter(menu.children);
    }
    if (menu.children && menu.children.length) {
      menu.hasDropdown = true;
      // Test if all children have their own children; if so, treat as column
      menu.columns = (menu.level === 0 && _.filter(menu.children, 'children').length === menu.children.length && menu.children.length) || 1;

      // If there are children, then recursively set more options
      for (var i = 0, len = menu.children.length; i < len; i++) {
        var option = menu.children[i];
        option.level = menu.level + 1;
        option.index = i;
        option.isOpen = false;
        setDefaultProperties(option);
      }
    } else {
      menu.hasDropdown = false;
      menu.columns = 0;
    }
  }

  // Global styles & event listeners
  function menuOn ($scope) {
    $scope.isOpen = true;
  }

  function menuOff ($scope) {
    $scope.isOpen = false;
  }

  // Toggle Open State of menu item, store item in collection, bind & trigger events related to open stste
  function toggleOpen ($scope, option) {
    option.isOpen = !option.isOpen;
    // Add new open option to model
    if (option.isOpen) {
      openItems.push(option);
    } else {
      _.remove(openItems, { isOpen: false });
    }
    if (openItems.length) {
      menuOn($scope);
      if (option.level === 0) {
        $scope.$broadcast('more-menu:open');
      }
    } else {
      menuOff($scope);
    }
  }

  // Close All Menu Items
  function closeAll ($scope) {
    while (openItems.length) {
      openItems.shift().isOpen = false;
    }
    menuOff($scope);
  }

  // Set the media query based on screen width
  function updateMediaQuery () {
    windowWidth = $window.innerWidth;
    windowHeight = $window.innerHeight;
    mediaQuery = windowWidth >= 600 ? 'desktop' : 'phone';
    return mediaQuery;
  }

  function setMenuFilter (filter) {
    menuFilter = filter;
  }

  function getMediaQuery () {
    return mediaQuery;
  }

  function getWindowWidth () {
    return windowWidth;
  }

  function getWindowHeight () {
    return windowHeight;
  }

  function getScrollOffset () {
    return $window.pageYOffset;
  }

  function getCollapsed () {
    if (moreMenuService.getMediaQuery() === 'desktop') {
      var offset = moreMenuService.getScrollOffset();
      var direction = (offset > lastPosition) ? 'down' : 'up';
      lastPosition = offset;
      if (offset <= 100) {
        return false;
      } else if (offset > 100 && direction === 'down') {
        return true;
      }
    }
    return null;
  }
  /**
   * Manually compiles the element, fixing the recursion loop.
   * @param element
   * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
   * @returns An object containing the linking functions.
   */
  function recursiveCompile (element, link) {
    // Normalize the link parameter
    if (angular.isFunction(link)) {
      link = { post: link };
    }

    // Break the recursion loop by removing the contents
    var contents = element.contents().remove();
    var compiledContents;
    return {
      pre: (link && link.pre) ? link.pre : null,
      // Compiles and re-adds the contents
      post: function (scope, element) {
        // Compile the contents
        if (!compiledContents) {
          compiledContents = $compile(contents);
        }
        // Re-add the compiled contents to the element
        compiledContents(scope, function (clone) {
          element.append(clone);
        });

        // Call the post-linking function, if any
        if (link && link.post) {
          link.post.apply(null, arguments);
        }
      }
    };
  }

  function handleClick ($scope, $event, option) {
    var wasOpen;

    if (option.fn) {
      // Menu item has defined function call
      if (_.isFunction($scope[option.fn])) {
        $scope[option.fn]();
      } else if ($scope.functions && _.isFunction($scope.functions[option.fn])) {
        $scope.functions[option.fn]();
      }
      closeAll($scope);
    } else if (option.isOverflow && option.hasDropdown) {
      // Menu item is in More dropdown, toggle accordion open
      toggleOpen($scope, option);
    } else if (option.root || (mediaQuery === 'desktop' && option.level === 0 && option.hasDropdown)) {
      // Menu item is a primary main menu item, close all other menu options and toggle dropdown
      wasOpen = option.isOpen;
      closeAll($scope);
      option.style = (mediaQuery === 'phone') ? { 'max-height': (windowHeight - 100) + 'px' } : {};
      if (!wasOpen) {
        toggleOpen($scope, option);
      }
    } else if (option.hasDropdown) {
      // If dropdown exists, toggle open
      toggleOpen($scope, option);
    } else {
      // Otherwise, ng-href will trigger link.  Close Open Menus.
      closeAll($scope);
    }
  }

}

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

angular.module("bnh.moremenu", []).run(["$templateCache", function($templateCache) {$templateCache.put("nav.html","\n\n<nav class=\"more-menu\" ng-class=\"{\'is-open\': options.mainmenu.isOpen, \'is-hidden\': options.mainmenu.isHidden}\" ng-style=\"options.mainmenu.style\">\n  <ul ng-show=\"showMainmenu\" class=\"more-menu-items\" role=\"menu\">\n\n    <li more-menu-item class=\"more-menu-item\" role=\"menuitem\" ng-repeat=\"child in options.mainmenu.children\" option=\"child\" ng-class=\"{\'is-active\': isCurrentState(child), \'is-open\': child.isOpen, \'is-hidden\': child.isHidden }\">\n      <a ng-click=\"handleClick($event, child)\" ng-href=\"{{getOptionHref(child)}}\" ng-class=\"{\'has-dropdown\': child.children}\">\n        {{child.title}}\n      </a>\n      <more-menu-sub options=\"child\"></more-menu-sub>\n    </li>\n\n    <li class=\"more-menu-item\" role=\"menuitem\" option=\"options.moremenu\" ng-class=\"{\'is-open\': options.moremenu.isOpen, \'is-hidden\': options.moremenu.isHidden}\">\n      <a class=\"has-dropdown\" ng-click=\"handleClick($event, options.moremenu)\">\n        {{options.moremenu.title}}\n      </a>\n      <more-menu-sub ng-if=\"options.moremenu.isOpen\" options=\"options.moremenu\"></more-menu-sub>\n    </li>\n  </ul>\n</nav>\n");
$templateCache.put("sub.html","<div class=\"more-menu-sub\" role=\"menu\" ng-if=\"child.isOpen && child.children && child.children.length\" ng-style=\"subStyle\">\n  <div class=\"more-menu-sub-content\">\n    <ul ng-if=\"!child.columns || child.columns <= 1\">\n      <li class=\"more-menu-sub-item\" role=\"menuitem\" ng-repeat=\"child in child.children\">\n        <a ng-click=\"handleClick($event, child)\" ng-href=\"{{getOptionHref(child)}}\" ng-if=\"!child.hasDropdown\">\n          {{child.title}}\n        </a>\n        <div ng-if=\"child.hasDropdown\">\n          <span class=\"has-dropdown\" ng-click=\"handleClick($event, child)\" ng-class=\"{\'is-open\': child.isOpen}\">{{child.title}}</span>\n          <more-menu-sub ng-if=\"child.isOpen\" options=\"child\"></more-menu-sub>\n        </div>\n      </li>\n    </ul>\n    <ul ng-if=\"child.columns > 1\" ng-repeat=\"column in child.children\">\n      <li class=\"more-menu-sub-head\">{{column.title}}</li>\n      <li class=\"more-menu-sub-item\" role=\"menuitem\" ng-repeat=\"child in column.children\">\n        <a ng-click=\"handleClick($event, child)\" ng-href=\"{{getOptionHref(child)}}\" ng-if=\"!child.hasDropdown\">\n          {{child.title}}\n        </a>\n        <span ng-if=\"child.hasDropdown\">{{child.title}}</span>\n        <more-menu-sub ng-if=\"child.hasDropdown && child.isOpen\" options=\"child\"></more-menu-sub>\n      </li>\n    </ul>\n  </div>\n</div>\n");}]);

})();
