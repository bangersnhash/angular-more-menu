angular-more-menu
=============

Fully responsive horizontal menu bar, with multi-level dropdowns.  As the browser
viewport shrinks, any menu items which would overflow will automatically collapse
into a "More" menu dropdown.  

Menu items can be configured using a source object or JSON file, and item links
are compatible with standard links, ng-click callbacks, or ui.router sref statements.

##Install

#### Bower:
```bash
 $ bower install angular-more-menu
```

#### NPM
```bash
 $ npm install angular-more-menu
```

##Usage

```js
 angular.module('myApp', ['bnh.more.menu']);
```

```template
<more-menu source="data"></more-menu>
```

##Author

Matthew Kaname Thompson
(!!!&#)[http://github.com/bangersnhash]
