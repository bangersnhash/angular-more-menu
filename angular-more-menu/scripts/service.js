
'use strict';
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
