/* http://karimnassar.com/textgague v1.0 by Karim Nassar 
 * Copyright Karim Nassar. Licensed under MIT License
 * License text at http://karimnassar.com/textgague/license
 */

(function($){

    // default settings - override with options object
    var defaults = {
        limit: 100, // the limit to measure the input text against
        limitUnits: 'chars', // 'bytes' or 'chars': what to count against the limit
        recalculateDelay: 100, // number of milliseconds to wait betwen recounts while typing
        warningThreshold: .8, // percentage of limit at which to trigger the near-limit warning
        animate: true // animate the limit meter; recommended false for larger limited fields such as textareas
    };

    // these are the events you can bind listeners to to catch key textGauge behaviors
    var kEvents = {
        FELL_UNDER_WARNING: 'textGauge_fellUnderWarningThreshold',
        WENT_OVER_WARNING: 'textGauge_wentOverWarningThreshold',
        FELL_UNDER_LIMIT: 'textGauge_fellUnderLimit',
        AT_LIMIT: 'textGauge_textAtLimit',
        WENT_OVER_LIMIT: 'textGauge_wentOverLimit'
    };

    /* private methods */
    function byteLen(str) {
        var len = 0;
        var escStr = encodeURI(str);
        if (escStr.indexOf("%") != -1) {
            len = escStr.split("%").length - 1;
            len += (escStr.length - (len * 3));
        } else {
            len = escStr.length;
        }
        return len;
    };

    function setNeedsRecount(event) {
        var $el = $(event.currentTarget);
        var data = $el.data('textGauge');
        if (data.settings.recalculateDelay == 0) {
            update($el);
        } else if (!data.needsRecount) {
            data.needsRecount = true;
            setTimeout(function(){update($el);}, data.settings.recalculateDelay);
        }
    };

    function update($el) {
        var data = $el.data('textGauge');
        var text = $el.val();
        var $length = data.$length;
        if (data.settings.lengthUnit == 'bytes') {
            data.strlen = byteLen(text);
        } else {
            data.strlen = text.length;
        }
        if (data.needsRecount) {
            data.needsRecount = false;
        }        
        data.$outerBar.removeClass('textGauge-over-limit textGauge-near-limit textGauge-at-limit');

        if (data.strlen > data.settings.limit) {
            $length.width(data.barWidth);
            data.$outerBar.addClass('textGauge-over-limit');
            data.overLimit = true;
            $el.trigger(kEvents.WENT_OVER_LIMIT);
            var percent = data.settings.limit / data.strlen;
            var overWidth = parseInt(data.barWidth * percent);
            if (data.settings.animate) {
                data.$bar.animate({width:overWidth, left:data.barWidth - overWidth}, data.settings.recalculateDelay);
            } else {
                data.$bar.width(overWidth).css({left:data.barWidth - overWidth});
            }
        } else {
            if (data.overLimit) {
                data.overLimit = false;
                $el.trigger(kEvents.FELL_UNDER_LIMIT);
                data.$bar.width(data.barWidth).css({left: 0});;
            }
            if (data.strlen == data.settings.limit) {
                data.$outerBar.addClass('textGauge-at-limit');
                $el.trigger(kEvents.AT_LIMIT);
            } else if (data.strlen < data.settings.limit) {
                data.lastGoodLength = data.strlen;
                data.textBeforeKey = $el.val();
            }
            var percent = data.strlen / data.settings.limit;
            var meterWidth = parseInt(data.barWidth * percent);
            if (data.settings.animate) {
                $length.animate({'width': meterWidth+'px'}, data.settings.recalculateDelay);
            } else {
                $length.width(meterWidth);
            }
            if (percent < 1 && percent > data.settings.warningThreshold) {
                data.$outerBar.addClass('textGauge-near-limit');
                if (!data.overWarning) {
                    $el.trigger(kEvents.WENT_OVER_WARNING);
                    data.overWarning = true;
                }
            } else {
                if (data.overWarning) {
                    $el.trigger(kEvents.FELL_UNDER_WARNING);
                    data.overWarning = false;
                }
            }
        }
    };

    /* Public Methods */
    var methods = {
        init: function(options) {
            if (typeof(options.limitUnits) == 'string' && (options.limitUnits != 'bytes' && options.limitUnits != 'chars'))
                throw new Error("textGauge option 'limitUnits' must be either 'bytes' or 'chars'.");
            if (options.wentOverLimit != null && typeof(options.wentOverLimit) != 'function')
                throw new Error("textGauge option 'wentOverLimit' must be a function.");
            if (options.fellUnderLimit != null && typeof(options.fellUnderLimit) != 'function')
                throw new Error("textGauge option 'fellUnderLimit' must be a function.");

            var settings = defaults;
            if (options) {
                settings = $.extend({}, defaults, options);
            }

            return this.each(function(index, element) {
                
                var $el = $(element);
                $el.addClass('textGauge');
                $el.data('textGauge', {
                    'settings':settings, 
                    '$outerBar': null, 
                    '$bar': null, 
                    '$length': null, 
                    'needsRecount':false, 
                    'overLimit':false, 
                    'overWarning':false, 
                    'barWidth':null
                });

                if ($el.parent().css('position') != 'absolute') {
                    $el.parent().css('position', 'relative');
                }

                var barWidth = $el.width() - 4;
                $outerBar = $('<div class="textGauge-outer-bar" />')
                    .width(barWidth)
                    .css('left', $el.position().left);
                var $length = $('<div class="textGauge-length" />');
                
                $bar = $('<div class="textGauge-bar" />')
                    .width(barWidth)
                    .append($length)
                    .appendTo($outerBar);

                $outerBar.insertAfter($el);

                $el.bind('keyup.textGauge', setNeedsRecount);
            
                $el.data('textGauge').$outerBar = $outerBar;
                $el.data('textGauge').$bar = $bar;
                $el.data('textGauge').$length = $length;
                $el.data('textGauge').barWidth = barWidth;
            
                $el.trigger('keyup.textGauge');
            });
        },
        destroy: function() {
            return this.each(function(index, element) {
                var $el = $(element);
                $el.css($el.data('textGauge').originalBottomProperty, $el.data('textGauge').originalBottomSpacing);
                $el.data('textGauge').$outerBar.remove();
                $el.removeData('textGauge').unbind('keyup.textGauge');
            });
        },
        recount: function() {
            return this.each(function(index, element) {
                update($(element));
            });
        }
    };

    $.fn.textGauge = function(options) {
        var selected = this.filter('textarea, :text, input[type="password"]');
        if ( methods[options] ) {
            return methods[options].apply(selected, Array.prototype.slice.call(arguments, 1));
        } else if (typeof options === 'object' || ! options ) {
            return methods.init.apply(selected, arguments);
        } else {
            $.error( 'Method ' +  options + ' does not exist on jQuery.textGauge' );
        }    
    };
})(jQuery);
