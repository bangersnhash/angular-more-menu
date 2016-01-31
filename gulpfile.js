

var gulp = require('gulp');
var del = require('del');
var $ = require('gulp-load-plugins')();
var eventStream = require('event-stream');
var streamqueue = require('streamqueue');
var templateCache = require('gulp-angular-templatecache');

var express = require('express'),
    refresh = require('gulp-livereload'),
    livereload = require('connect-livereload'),
    livereloadport = 35729,
    serverport = 5000;

// Set up an express server (not starting it yet)
var server = express();
// Add live reload
server.use(livereload({port: livereloadport}));
// Use our 'dist' folder as rootfolder
server.use(express.static('./dist'));
server.use(express.static('./example'));

// Because I like HTML5 pushstate .. this redirects everything back to our index.html
server.all('/*', function(req, res) {
  res.sendfile('index.html', { root: 'example' });
});

gulp.task('sass', function () {

  gulp.src('./angular-more-menu/styles/main.scss')
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.rename('angular-more-menu.css'))
    .pipe(gulp.dest('./dist/css'))
    ;

});

gulp.task('clean', function () {
  return del([
    'dist/*'
  ]);
});


// JSHint task
gulp.task('lint', function() {
  gulp.src('angular-more-menu/scripts/*.js')
  .pipe($.jshint())
  .pipe($.jshint.reporter('default'));
});

// Script task
gulp.task('js', function() {

  return streamqueue({ objectMode: true },
    gulp.src(['angular-more-menu/app.js', 'angular-more-menu/scripts/*.js'])
      .pipe($.concatUtil('js', {
        process: function (src) {
          return (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
        }
      })),
    gulp.src(['angular-more-menu/views/*.html'])
      .pipe($.ngTemplates({
        module: 'bnh.moremenu.templates',
        path: function (path, base) {
          return path.replace(/(.*)angular-more-menu(.*)/gi, 'angular-more-menu$2');
        }
      }))
    )
    .pipe($.concat('angular-more-menu.js'))
    // .pipe($.wrapper({
    //    header: '(function(){\n"use strict";\n\n',
    //    footer: '\n\n})();\n'
    // }))
    .pipe(gulp.dest('dist/js'))
    .pipe($.uglify())
    .pipe($.rename({
        suffix: ".min"
    }))
    .pipe(gulp.dest('dist/js'))
    ;
});

gulp.task('html', function() {
  // Get our index.html
  gulp.src('angular-more-menu/example/index.html')
  // And put it in the dist folder
  .pipe(gulp.dest('dist/example/index.html'));

});

gulp.task('watch', ['lint'], function() {
  // Start webserver
  server.listen(serverport);
  // Start live reload
  refresh.listen(livereloadport);

  // Watch our scripts, and when they change run lint and browserify
  gulp.watch(['angular-more-menu/scripts/*.js', 'angular-more-menu/scripts/**/*.js'],[
    'lint',
    'js'
  ]);

  // Watch our sass files
  gulp.watch(['angular-more-menu/styles/**/*.scss'], [
    'sass'
  ]);

  gulp.watch(['angular-more-menu/**/*.html'], ['html', 'js']);

  gulp.watch('./dist/**').on('change', refresh.changed);

});
// Dev task
gulp.task('dev', ['clean', 'html', 'sass', 'lint', 'js'], function() { });

gulp.task('default', ['dev', 'watch']);
