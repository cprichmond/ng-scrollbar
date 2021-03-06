'use strict';
angular.module('ngScrollbar', []).directive('ngScrollbar', [
  '$rootScope',
  '$parse',
  '$window',
  '$document',
  function ($rootScope, $parse, $window, $document) {
    return {
      restrict: 'A',
      replace: true,
      transclude: true,
      scope: true,
      link: function (scope, element, attrs) {
        var mainElm, transculdedContainer, tools, thumb, thumbLine, track, rebuildListener;
        var flags = {
            bottom: attrs.hasOwnProperty('bottom'),
            top: attrs.hasOwnProperty('top')
          };
        var win = angular.element($window);
        // Elements
        var dragger = { top: 0 }, page = { top: 0 };
        // Styles
        var scrollboxStyle, draggerStyle, draggerLineStyle, pageStyle;
        var calcStyles = function () {
          scrollboxStyle = {
            position: 'relative',
            overflow: 'hidden',
            'max-width': '100%',
            height: '100%'
          };
          if (page.height) {
            scrollboxStyle.height = page.height - page.extraHeight + 'px';
          }
          draggerStyle = {
            position: 'absolute',
            height: dragger.height + 'px',
            top: dragger.top + 'px'
          };
          draggerLineStyle = {
            position: 'relative',
            'line-height': dragger.height + 'px'
          };
          pageStyle = {
            position: 'relative',
            top: page.top + 'px',
            overflow: 'hidden'
          };
        };
        var redraw = function () {
          thumb.css('top', dragger.top + 'px');
          var draggerOffset = dragger.top / (dragger.trackHeight - page.extraHeight);
          page.top = -Math.round((page.scrollHeight + page.extraHeight) * draggerOffset);
          transculdedContainer.css('top', page.top + 'px');
        };
        var trackClick = function (event) {
          var offsetY = event.hasOwnProperty('offsetY') ? event.offsetY : event.layerY;
          var newTop = Math.max(0, Math.min(parseInt(dragger.trackHeight, 10) - parseInt(dragger.height, 10), offsetY));
          dragger.top = newTop;
          redraw();
          event.stopPropagation();
        };
        var wheelHandler = function (event) {
          var wheelDivider = 20;
          // so it can be changed easily
          var deltaY = event.wheelDeltaY !== undefined ? event.wheelDeltaY / wheelDivider : event.wheelDelta !== undefined ? event.wheelDelta / wheelDivider : -event.detail * (wheelDivider / 10);
          dragger.top = Math.max(0, Math.min(parseInt(dragger.trackHeight, 10) - parseInt(dragger.height, 10), parseInt(dragger.top, 10) - deltaY));
          redraw();
          if (!!event.preventDefault) {
            event.preventDefault();
          } else {
            return false;
          }
        };
        var lastOffsetY;
        var thumbDrag = function (event, offsetX, offsetY) {
          dragger.top = Math.max(0, Math.min(parseInt(dragger.trackHeight, 10) - parseInt(dragger.height, 10), offsetY));
          event.stopPropagation();
        };
        var dragHandler = function (event) {
          var newOffsetY = event.pageY - thumb[0].scrollTop - lastOffsetY;
          var newOffsetX = 0;
          // TBD
          thumbDrag(event, newOffsetX, newOffsetY);
          redraw();
        };
        var getStyle = function (el, styleProp) {
          var val;
          if (el.currentStyle) {
            val = el.currentStyle[styleProp];
          } else if ($window.getComputedStyle) {
            val = $document[0].defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
          }
          return val;
        };
        var buildScrollbar = function (options) {
          // Getting top position of a parent element to place scroll correctly
          var parentOffsetTop = element[0].parentElement.offsetTop;
          var paddingTop = parseInt(getStyle(element[0], 'padding-top'), 10) || 0;
          var paddingBottom = parseInt(getStyle(element[0], 'padding-bottom'), 10) || 0;
          var borderTop = parseInt(getStyle(element[0], 'border-top-width'), 10) || 0;
          var borderBottom = parseInt(getStyle(element[0], 'border-bottom-width'), 10) || 0;
          var extraHeight = paddingTop + paddingBottom + borderTop + borderBottom;
          var wheelEvent = win[0].onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll';
          var rollToBottom = flags.bottom || options.rollToBottom;
          var rollToTop = flags.top || options.rollToTop;
          mainElm = angular.element(element.children()[0]);
          transculdedContainer = angular.element(mainElm.children()[0]);
          tools = angular.element(mainElm.children()[1]);
          thumb = angular.element(angular.element(tools.children()[0]).children()[0]);
          thumbLine = angular.element(thumb.children()[0]);
          track = angular.element(angular.element(tools.children()[0]).children()[1]);
          // Check if scroll bar is needed
          page.height = element[0].offsetHeight - parentOffsetTop;
          page.extraHeight = extraHeight;
          page.scrollHeight = transculdedContainer[0].scrollHeight;
          if (page.height < page.scrollHeight) {
            scope.showYScrollbar = true;
            // Calculate the dragger height
            dragger.height = Math.round(page.height / page.scrollHeight * page.height);
            dragger.trackHeight = page.height;
            // update the transcluded content style and clear the parent's
            calcStyles();
            element.css({ overflow: 'hidden' });
            mainElm.css(scrollboxStyle);
            transculdedContainer.css(pageStyle);
            thumb.css(draggerStyle);
            thumbLine.css(draggerLineStyle);
            // Bind scroll bar events
            track.bind('click', trackClick);
            // Handl mousewheel
            transculdedContainer[0].addEventListener(wheelEvent, wheelHandler, false);
            // Drag the scroller
            thumb.on('mousedown', function (event) {
              lastOffsetY = event.pageY - thumb[0].offsetTop;
              win.on('mouseup', function () {
                win.off('mousemove', dragHandler);
                event.stopPropagation();
              });
              win.on('mousemove', dragHandler);
              event.preventDefault();
            });
            if (rollToBottom) {
              flags.bottom = false;
              dragger.top = parseInt(page.height, 10) - parseInt(dragger.height, 10);
            } else if (rollToTop) {
              dragger.top = 0;
            } else {
              dragger.top = Math.max(0, Math.min(parseInt(page.height, 10) - parseInt(dragger.height, 10), parseInt(dragger.top, 10)));
            }
            redraw();
          } else {
            scope.showYScrollbar = false;
            thumb.off('mousedown');
            transculdedContainer[0].removeEventListener(wheelEvent, wheelHandler, false);
            transculdedContainer.attr('style', 'position:relative;top:0');
            // little hack to remove other inline styles
            mainElm.css({ height: '100%' });
          }
        };
        var rebuildTimer;
        var options = {};
        var rebuild = function (e, data) {
          /* jshint -W116 */
          if (rebuildTimer != null) {
            clearTimeout(rebuildTimer);
          }
          /* jshint +W116 */
          options = {
            rollToBottom: !!data && !!data.rollToBottom,
            rollToTop: !!data && !!data.rollToTop
          };
          rebuildTimer = setTimeout(function () {
            page.height = null;
            buildScrollbar(options);
            if (!scope.$$phase) {
              scope.$digest();
            }
          }, 72);
        };
        buildScrollbar(options);
        if (!!attrs.rebuildOn) {
          attrs.rebuildOn.split(' ').forEach(function (eventName) {
            rebuildListener = $rootScope.$on(eventName, rebuild);
          });
        }
        if (attrs.hasOwnProperty('rebuildOnResize')) {
          win.on('resize', rebuild);
        }
        scope.$on('$destroy', function () {
          if (angular.isFunction(rebuildListener)) {
            rebuildListener();
          }
        });
      },
      template: '<div>' + '<div class="ngsb-wrap">' + '<div class="ngsb-container" ng-transclude></div>' + '<div class="ngsb-scrollbar" style="position: absolute; display: block;" ng-show="showYScrollbar">' + '<div class="ngsb-thumb-container">' + '<div class="ngsb-thumb-pos" oncontextmenu="return false;">' + '<div class="ngsb-thumb" ></div>' + '</div>' + '<div class="ngsb-track"></div>' + '</div>' + '</div>' + '</div>' + '</div>'
    };
  }
]);