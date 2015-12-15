/** @preserve
// ==UserScript==
// @name LinguaLeoHelpers
// @all-frames true
// @include http://*
// @include https://*
// @include file://*
// @include file:///*
// @exclude http*://lingualeo.com/*
// @exclude http*://lingualeo.ru/*
// @exclude http*://*facebook.com/plugins/*
// @exclude http*://*twitter.com/widgets/*
// @exclude http*://plusone.google.com/*
// ==/UserScript==
**/


//----------------------------------------------
// Crossbrowser Event object (custom fixes last 13.09.2012)
// from http://javascript.ru/tutorial/events/crossbrowser
var Event = (function() {
  var guid = 0;

  function fixEvent(event) {
      event = event || window.event;
      if (event.isFixed) {
          return event;
      }
      event.isFixed = true;
      event.preventDefault = event.preventDefault || function () {
          this.returnValue = false
      };
      event.stopPropagation = event.stopPropagaton || function () {
          this.cancelBubble = true
      };
      if (!event.target) {
          event.target = event.srcElement;
      }
      if (!event.relatedTarget && event.fromElement) {
          //TODO: here may be problems in Opera
          event.relatedTarget = event.fromElement == event.target ? event.toElement : event.fromElement;
      }
      if (event.pageX == null && event.clientX != null) {
          var html = document.documentElement, body = document.body;
          event.pageX = event.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0);
          event.pageY = event.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0);
      }
      if (!event.which && event.button) {
          event.which = (event.button & 1 ? 1 : ( event.button & 2 ? 3 : ( event.button & 4 ? 2 : 0 ) ));
      }
      return event;
  }

  function commonHandle(event) {
        event = fixEvent(event);
        var handlers = this.custom_universal_events[event.type];
        for (var g in handlers) {
            var handler = handlers[g]['handler'];
            event['customData'] = handlers[g]['data'];
            var ret = handler.call(this, event);
            if (ret === false) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    var Event = {
        add: function (elem, type, handler, data) {
            if (elem.setInterval && ( elem != window && !elem.frameElement )) {
                elem = window;
            }
            if (!handler['guid']) {
                handler['guid'] = ++guid;
            }
            if (!elem.custom_universal_events) {
                elem.custom_universal_events = {};
                elem.handle = function (event) {
                    if (typeof Event !== "undefined") {
                        return commonHandle.call(elem, event);
                    }
                }
            }
            if (!elem.custom_universal_events[type]) {
                elem.custom_universal_events[type] = {};
                if (elem.addEventListener) {
                    elem.addEventListener(type, elem.handle, false);
                }
                else if (elem.attachEvent) {
                    elem.attachEvent("on" + type, elem.handle);
                }
            }
            elem.custom_universal_events[type][handler['guid']] = {'handler': handler, 'data': data};
        },

        remove: function (elem, type, handler) {
            var handlers = elem.custom_universal_events && elem.custom_universal_events[type]
            if (!handlers) {
                return;
            }
            delete handlers[handler['guid']]

            for (var any in handlers) {
                return;
            }
            if (elem.removeEventListener) {
                elem.removeEventListener(type, elem.handle, false);
            }
            else if (elem.detachEvent) {
                elem.detachEvent("on" + type, elem.handle);
            }
            delete elem.custom_universal_events[type];

            for (var any in elem.custom_universal_events) {
                return;
            }
            try {
                delete elem.handle;
                delete elem.custom_universal_events;
            } catch (e) { // IE
                elem.removeAttribute("handle");
                elem.removeAttribute("custom_universal_events");
            }
        }

        /*dispatch: function (eventType, eventName, elem) {
            var e;
            if (document.createEvent) {
                e = document.createEvent(eventType);
                e.initEvent(eventName, true, true);
            } else {
                e = document.createEventObject();
                e.eventType = eventName;
            }
            e.eventName = eventName;

            if (document.createEvent) {
                event.target.dispatchEvent(e);
            } else {
                event.target.fireEvent('on' + e.eventType, e);
            }
        }*/
    };
    return Event;
}());


var browserDetector = (function () {

    var mp3support = null;

    return {
        userAgent: window.navigator.userAgent.toLowerCase(),

        getVersion: function () {
            return (this.userAgent.match(/.+(?:rv|it|ra|ie|me)[\/: ]([\d.]+)/) || [])[1];
        },

        isChrome: function () {
            return (/chrome/.test(this.userAgent));
        },

        isSafari: function () {
            return (/webkit/.test(this.userAgent) && !/chrome/.test(this.userAgent));
        },

        isOpera: function () {
            return (/opera/.test(this.userAgent));
        },

        isIE: function () {
            return (/msie/.test(this.userAgent) && !/opera/.test(this.userAgent));
        },

        isFirefox: function () {
            return (/firefox/.test(this.userAgent) && !/(compatible|webkit)/.test(this.userAgent));
        },

        canPlayMp3: function () {
            if (mp3support !== null) {
                return mp3support;
            }
            try {
                var canPlay = document.createElement('audio').canPlayType('audio/mpeg');
                return mp3support = (canPlay === 'maybe' || canPlay === 'probably');
            }
            catch (e) {
                return mp3support = false;
            }
        }
    };

})();


var i18n = (function () {

    var messages = null;
    var i18n = {

        getLocaleMessage: function (messageId) {
            return messages !== null && typeof messages[messageId] !== 'undefined' ? messages[messageId] : messageId
        },


        updateLocaleMessages: function (bForce, callback) {
            if (typeof callback !== 'function') {
                callback = function () {};
            }
            if (bForce === true || messages === null) {
                if (typeof kango !== 'undefined' && typeof kango.invokeAsync !== 'undefined') {
                    kango.invokeAsync('kango.i18n.getMessages', function (_messages) {
                        messages = _messages;
                        callback();
                    });
                }
            }
            else {
                callback();
            }
        },


        localizeDom: function (containerElement) {
            var elems = containerElement.querySelectorAll
                        ? containerElement.querySelectorAll('[data-i18n]')
                        : containerElement.getElementsByTagName('*');

            for (var i = 0, elem; elem = elems[i]; i++) {
                i18n.localizeElement(elem, elem.getAttribute('data-i18n'), elem.getAttribute('data-i18n-attr'));
            }
        },


        localizeElement: function (element, msg, targetAttribute) {
            if (msg) {
                var text = i18n.getLocaleMessage(msg);
                if (targetAttribute) {
                    element.setAttribute(targetAttribute, text);
                }
                else {
                    switch (element.tagName) {
                        case 'INPUT':
                            element.value = text;
                            break;

                        default:
                            element.innerHTML = text;
                    }
                }
            }
        }

    };

    i18n.updateLocaleMessages(false, null);
    return i18n;
})();


var domHelper = (function () {
    var domHelper = {};
    var bodyElement = null


    domHelper.Fragment = function () {
        this.initialize(arguments);
    };


    domHelper.Fragment.prototype = {

        initialize: function () {
            this._frag = document.createDocumentFragment();
            this._nodes = [];
        },


        appendSource: function (source) {
            var div = document.createElement('div');
            div.innerHTML = source;
            for (var i = 0; i < div.childNodes.length; i++) {
                var node = div.childNodes[i].cloneNode(true);
                this._nodes.push(node);
                this._frag.appendChild(node);
            }
        },


        appendTo: function (element) {
            if (element) {
                element.appendChild(this._frag);
            }
        },


        insertAsFirst: function (element) {
            if (element) {
                element.insertBefore(this._frag, element.firstChild);
            }
        },


        insertBefore: function (parent, element) {
            if (parent && element) {
                parent.insertBefore(this._frag, element);
            }
        },


        insertAfter: function (element) {
            if (element) {
                element.parentNode.insertBefore(this._frag, element.nextSibling)
            }
        },


        reclaim: function () {
            for (var i = 0; i < this._nodes.length; i++) {
                var node = this._nodes[i];
                this._frag.appendChild(node);
            }
        }
    };


    domHelper.getBody = function () {
        return bodyElement || (bodyElement = document.getElementsByTagName('body')[0] || null)
    };


    domHelper.appendHtmlToElement = function (element, html) {
        var frag = new domHelper.Fragment();
        frag.appendSource(html);
        frag.appendTo(element);
    };


    domHelper.insertHtmlAsFirstElement = function (element, html) {
        var frag = new domHelper.Fragment();
        frag.appendSource(html);
        frag.insertAsFirst(element);
    };


    domHelper.insertHtmlAsNextElement = function (element, html) {
        var frag = new domHelper.Fragment();
        frag.appendSource(html);
        frag.insertAfter(element);
    };


    domHelper.removeAllChilds = function (elem) {
        if (typeof(elem) == 'string') {
            elem = document.getElementById(elem);
        }
        if (typeof elem == 'undefined' || elem == null)
            return false;
        while (elem.hasChildNodes()) {
            elem.removeChild(elem.firstChild);
        }
        return true;
    };


    domHelper.removeChild = function (childElem) {
        if (childElem) {
            childElem.parentNode.removeChild(childElem);
        }
    };


    domHelper.getStyleValues = function (elem, valueNames) {
        var styleValues = {};
        var style = elem.style;
        for (var i = 0, valueName; valueName = valueNames[i]; i++) {
            styleValues[valueName] = style[valueName];
        }
        return styleValues;
    };


    domHelper.setStyleValues = function (elem, values) {
        var style = elem.style;
        for (var valueName in values) {
            if (values.hasOwnProperty(valueName)) {
                style[valueName] = values[valueName];
            }
        }
    };


    domHelper.isElementVisible = function (elem) {
        return elem.offsetWidth > 0 || elem.offsetHeight > 0;
    };


    return domHelper;
})();


var cssHelper = (function () {

    var cssHelper = {};


    cssHelper.hasClass = function (ele, cls){
        return ele ? ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)')) : false;
    };


    cssHelper.clearClass = function (ele) {
        ele.className = '';
    };


    cssHelper.addClass = function (ele, cls){
        if (ele == null)
            return;
        if (!cssHelper.hasClass(ele, cls)) {
            ele.className += ' ' + cls;
        }
    };


    cssHelper.removeClass = function (ele, cls) {
        if (ele && cssHelper.hasClass(ele, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            ele.className = ele.className.replace(reg, ' ');
        }
    };


    cssHelper.addCss = function (cssCode, id) {
        if (id) {
            id = 'lleo_css_' + id;
        }
        if (id && document.getElementById(id)) {
            return;
        }

        var styleElement = document.createElement('style');
        styleElement.type = 'text/css';

        if (id) {
            styleElement.id = id;
        }
        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = cssCode;
        }
        else {
            styleElement.appendChild(document.createTextNode(cssCode));
        }

        var father = null;
        var heads = document.getElementsByTagName('head');
        if (heads.length > 0) {
            father = heads[0];
        }
        else {
            var bodies = document.getElementsByTagName('body');
            if (bodies.length > 0) {
                father = bodies[0];
            }
            else {
                //todo: do we really need this brunch? this is not correctly working for XML documents in Chrome
                //if (typeof document.documentElement != 'undefined') {
                //    father = document.documentElement
                //}
            }
        }
        if (father != null) {
            father.appendChild(styleElement);
        }
    };


    return cssHelper;
})();


var sizeHelper = (function () {
    var sizeHelper = {};

    sizeHelper.clientSize = function () {
        var d = document;
        var b = domHelper.getBody();
        return {
            width: (d['compatMode'] == null || typeof d['compatMode'] == 'undefined' || d['compatMode'] == 'CSS1Compat') && d.documentElement && d.documentElement.clientWidth || b && b.clientWidth,
            height: (d['compatMode'] == null || typeof d['compatMode'] == 'undefined' || d['compatMode'] == 'CSS1Compat') && d.documentElement && d.documentElement.clientHeight || b && b.clientHeight
        };
    };


    sizeHelper.scrollOffset = function () {
        var d = document;
        var b = domHelper.getBody();
        return {
            left: d.documentElement && d.documentElement.scrollLeft || b && b.scrollLeft,
            top: d.documentElement && d.documentElement.scrollTop || b && b.scrollTop
        };
    };


    sizeHelper.scrollSize = function () {
        var d = document;
        var b = domHelper.getBody();
        return {
            width: d.documentElement && d.documentElement.scrollWidth || b && b.scrollWidth,
            height: d.documentElement && d.documentElement.scrollHeight || b && b.scrollHeight
        };
    };


    sizeHelper.getOffsetSum = function (elem) {
        var top = 0, left = 0;
        while (elem) {
            top = top + parseInt(elem.offsetTop);
            left = left + parseInt(elem.offsetLeft);
            elem = elem.offsetParent;
        }
        return {'top': top, 'left': left};
    };


    sizeHelper.getOffsetRect = function (elem) {
        var box = elem.getBoundingClientRect();
        var body = domHelper.getBody();
        var docElem = document.documentElement;
        var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
        var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
        var clientTop = docElem.clientTop || body.clientTop || 0;
        var clientLeft = docElem.clientLeft || body.clientLeft || 0;
        var top = box.top + scrollTop - clientTop;
        var left = box.left + scrollLeft - clientLeft;
        return {
            top: Math.round(top),
            left: Math.round(left)
        };
    };


    sizeHelper.getOffset = function (elem) {
        return elem.getBoundingClientRect && !(window.getComputedStyle(elem, null).position === 'fixed')
                ? sizeHelper.getOffsetRect(elem)
                : sizeHelper.getOffsetSum(elem);
	};


	sizeHelper.pointInRect = function (point, rect) {
		if (point.y > rect.bottom || point.y < rect.top) {
			return false;
		}
		if (point.x > rect.right || point.x < rect.left) {
			return false;
		}
		return true;
	};

    return sizeHelper;
})();


var arrayHelper = {

    convertFromObject: function (obj) {
        var result = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(obj[key]);
            }
        }
        return result;
    },

    map: function (array, func) {
        var len = array.length;
        var result = new Array(len);
        for (var i = 0; i < len; i++) {
            result[i] = func(array[i]);
        }
        return result;
    },

    indexOf: function (array, object, start) {
        for (var i = start || 0, length = array.length; i < length; i += 1) {
            if (array[i] === object) {
                return i;
            }
        }
        return -1;
    }
};


var selectionHelper = (function () {
	var selectionHelper = {};

	selectionHelper.getSelection = function () {
		if (typeof window.getSelection === 'function') {
			var sel = window.getSelection();
            return typeof sel.getRangeAt === 'function' ? sel : document.getSelection();
		} else {
			return document.selection;
		}
	};

	selectionHelper.saveSelection = function () {
		var selection = {};
		var inputElement = null;
		var actElem = document.activeElement;
		var tagName = actElem.tagName;
		if (typeof tagName !== 'undefined') {
			tagName = tagName.toLowerCase();
			if (tagName === 'textarea' || tagName === 'input' && actElem.type.toLowerCase() === 'text') {
				inputElement = actElem;
			}
		}

		if (inputElement) {
			// Selection inside input elements must be saved in different way to restore it afterwards
			selection['type'] = 'input';
			selection['element'] = inputElement;
			selection['start'] = inputElement.selectionStart;
			selection['end'] = inputElement.selectionEnd;
		} else {
			var sel = selectionHelper.getSelection();
			selection['type'] = 'simple';
			if (typeof sel.getRangeAt === 'function' && sel.rangeCount > 0) {
				selection['range'] = sel.getRangeAt(0).cloneRange();
			}
		}

		return selection;
	};

	selectionHelper.restoreSelection = function (selection) {
		var result = false;
		if (typeof selection['type'] !== 'undefined') {
			if (selection['type'] === 'input') {
				selection['element'].focus();
				selection['element'].setSelectionRange(selection['start'], selection['end']);
				result = true;
			} else if (selection['type'] === 'simple') {
				var sel = selectionHelper.getSelection();
				if (typeof sel.removeAllRanges === 'function') {
					try {
						sel.removeAllRanges(); //sometimes gets exception in IE
					} catch (e) {
                    }
					if (typeof selection['range'] !== 'undefined') {
						sel.addRange(selection['range']);
						result = true;
					}
				}
			}
		}
		return result;
	};

    selectionHelper.selectNode = function (node) {
        if (document.createRange) {
            var range = document.createRange();
            range.selectNode(node);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

	return selectionHelper;
})();


var htmlHelper = {

    escapeReplacements: {'&': '&amp;', '"': '&quot', '<': '&lt;', '>': '&gt;'},

    escapeHTML: function (str) {
		if (str === null || str === 0) {
			return str;
        }
		str += ''; //to string;
		return str.replace(/[&"<>]/g, function (m) {
			return htmlHelper.escapeReplacements[m];
		});
	}
};


var dictionariesHelper = {

    linkTemplate: '<a href="{href}" target="_blank" class="{className}" title="{title}"></a>',

    items: {
        multitran: {
            className: 'lleo_multitran',
            title: 'Multitran',
            isAvailable: function (locale) {
                return locale == 'ru';
            },
            getLink: function (word, locale) {
                return 'http://multitran.ru/c/m.exe?CL=1&l1=1&s=' + encodeURIComponent(word);
            }
        },
        google: {
            className: 'lleo_google',
            title: 'Google',
            isAvailable: function (locale) {
                return true;
            },
            getLink: function (word, locale) {
                if (locale == 'pt_br') {
                    locale = 'pt';
                }
                return 'http://translate.google.com/#en|' + (locale == 'en' ? 'ru' : locale) + '|' + encodeURIComponent(word);
            }
        },
        lingvo: {
            className: 'lleo_lingvo',
            title: 'Abbyy Lingvo',
            isAvailable: function (locale) {
                return locale == 'ru';
            },
            getLink: function (word, locale) {
                return 'http://lingvopro.abbyyonline.com/en/Search/en-ru/' + encodeURIComponent(word);
            }
        },
        dictionary: {
            className: 'lleo_dict',
            title: 'Dictionary.com',
            isAvailable: function (locale) {
                return true;
            },
            getLink: function (word, locale) {
                return 'http://dictionary.reference.com/browse/' + encodeURIComponent(word);
            }
        },
        theFreeDictionary: {
            className: '',
            title: 'TheFreeDictionary.com',
            isAvailable: function (locale) {
                return true;
            },
            getLink: function (word, locale) {
                return 'http://www.thefreedictionary.com/' + encodeURIComponent(word);
            }
        },
        linguee: {
            className: 'lleo_linguee',
            title: 'Linguee',
            isAvailable: function (locale) {
                return locale == 'pt';
            },
            getLink: function (word, locale) {
                return 'http://www.linguee.com.br/ingles-portugues/search?source=auto&query=' + encodeURIComponent(word);
            }
        },
        michaelis: {
            className: 'lleo_michaelis',
            title: 'Michaelis',
            isAvailable: function (locale) {
                return locale == 'pt';
            },
            getLink: function (word, locale) {
                return 'http://michaelis.uol.com.br/moderno/ingles/index.php?lingua=ingles-portugues&palavra=' + encodeURIComponent(word);
            }
        }
    },

    getHtml: function (data) {
        var html = '';
        for (var name in dictionariesHelper.items) {
            var item = dictionariesHelper.items[name];
            if (item.isAvailable(data.locale)) {
                html += stringHelper.formatStr(dictionariesHelper.linkTemplate, {
                    title: item.title,
                    className: item.className,
                    href: item.getLink(data.text, data.locale)
                })
            }
        }
        return html;
    }

};


var lingualeoHelper = {

    canTranslate: function (text) {
        return /[a-z0-9'-]/i.test(text)/* && text.length <= 50*/;
    },

    getTemplate: function (name, callback) {
        kango.invokeAsync('window.lingualeo.getTemplate', name, true, function (response) {
            callback(response.html);
        });
    },

    getTemplates: function (names, doLocalize, callback) {
        kango.invokeAsync('window.lingualeo.getTemplates', names, doLocalize, function (htmls) {
            callback(htmls);
        });
    },


    getWordArticleUrl: function (originalText) {
        return stringHelper.formatStr(
            LinguaLeoConfig().domain + LinguaLeoConfig().path.dictionaryFromInternet,
            {originalText: encodeURIComponent(originalText)}
        );
    },


    isTopWindow: function () {
        try {
            if (window.top != window) { //do not use !== because of Quirks mode
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

};


var contentHelper = {

    findSentence: function (selection, inputElement) {
        var arrPunctuation = ['.', '!', '?'];
        var moveLeftUntilPunctuatuin = function (range) {
            var text = range.toString();
            var bPunctReached = false;
            while (!bPunctReached) {
                if (range.startOffset > 0) {
                    range.setStart(range.startContainer, range.startOffset - 1);
                    if (arrPunctuation.indexOf(range.toString().charAt(0)) !== -1) {
                        bPunctReached = true;
                        range.setStart(range.startContainer, range.startOffset + 1);
                    }
                } else {
                    bPunctReached = true;
                }
                if (text === range.toString())
                    bPunctReached = true;
            }
            return range;
        };


        var moveRightUntilPunctuatuin = function (range) {
            var text = range.toString();
            var bPunctReached = false;
            while (!bPunctReached) {
                if (range.endOffset < range.endContainer.textContent.length) {
                    try{
    					range.setEnd(range.endContainer, range.endOffset + 1);
    				} catch (e) {
    					bPunctReached = true;
    				}
                    if (arrPunctuation.indexOf(range.toString().charAt(range.toString().length - 1)) !== -1) {
                        bPunctReached = true;
                        range.setEnd(range.endContainer, range.endOffset - 1);
                    }
                } else {
                    bPunctReached = true;
                }
                if (text === range.toString())
                    bPunctReached = true;
            }
            return range;
        };


        var findSentenceContainingText = function (context, text, arrPunctuation) {
            text = stringHelper.trimText(text);
            var pos = context.indexOf(text);
            while (pos !== -1) {
                var posPunct = context.search(new RegExp('[\\' + arrPunctuation.join('\\') + '](\\s|$)', 'gim'));
                if (posPunct === -1){
                    return context;
                }
                if (pos < posPunct) {
                    return context.substr(0, posPunct + 1);
                } else {
                    context = context.substr(posPunct + 1);
                }
                pos = context.indexOf(text);
            }
    		return text;
        };


    	// Chacks if all element siblings are inline
    	var isAllSiblingsAreInline = function (element) {
    		var blockTags = ['div', 'p', 'form', 'ul', 'ol', 'dl', 'li', 'table', 'pre', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    		var parent = element.parentNode;
    		var child = parent.firstChild;
    		while (child !== null) {
    			if (typeof child.nodeName !== 'undefined') {
    				if (arrayHelper.indexOf(blockTags, child.nodeName.toLowerCase()) !== -1) {
    					return false;
    				}
    			}
    			if (typeof child.style !== 'undefined' && child.style.display !== 'inline' && child.style.display !== '') {
    				return false;
    			}
    			child = child.nextSibling;
    		}
    		return true;
    	};

    	// Finds first block parent or parent that has block children
    	var getBlockParent = function (element) {
    		var resultElement = element;
    		var inlineTags = ['font', 'b', 'i', 'span', 'u', 'em', 'a', 'strong'];
    		var bStop = false;
    		while (!bStop) {
    			if (typeof resultElement.parentNode !== 'undefined' && resultElement.parentNode !== null) {
    				resultElement = resultElement.parentNode;
    				//kango.console.log([resultElement.nodeName, resultElement.style.display]);
    				if (!isAllSiblingsAreInline(resultElement) || (typeof resultElement.nodeName !== 'undefined' && arrayHelper.indexOf(inlineTags, resultElement.nodeName.toLowerCase()) === -1)) {
    					bStop = true;
    				}
    			} else {
    				bStop = true;
    			}
    		}
    		return resultElement;
    	};

    	if (inputElement) {
    		var selStart = inputElement.selectionStart;
    		var selEnd = inputElement.selectionEnd;
    		var text = inputElement.value + '.';
    		var separatorsStr = arrPunctuation.join('');
    		while (separatorsStr.indexOf(text.charAt(selStart - 1)) === -1 && selStart !== 1) {
    			selStart -= 1;
    		}
    		while (separatorsStr.indexOf(text.charAt(selEnd + 1)) === -1 && selEnd !== text.length - 1) {
    			selEnd += 1;
    		}
    		var selectedText = text.substring(selStart, selEnd);
    		result = findSentenceContainingText(inputElement.value, selectedText, arrPunctuation);
    	} else {
    		var range = selection.getRangeAt(0);
    		// Expand selection to the left and to the right until punctuation to get more info about selected text.
    		// This helps us to skip sentenses that contain the same text as selected text.
    		range = moveLeftUntilPunctuatuin(range);
    		range = moveRightUntilPunctuatuin(range);
    		var parentElement = getBlockParent(range.startContainer); //range.commonAncestorContainer;
    		var parentText = parentElement.textContent;
    		var result = findSentenceContainingText(parentText, range.toString(), arrPunctuation);
    	}
        return result;
    },


    extractContext: function (inputElement) {
    	var result = null;
    	var sel = selectionHelper.getSelection();
    	var backupSelection = selectionHelper.saveSelection();

    	// Get selection text
    	var text = '';
    	if (inputElement) {
    		text = inputElement.value.substring(inputElement.selectionStart, inputElement.selectionEnd);
    	} else {
    		if (typeof sel.toString === 'function') {
    			text = sel.toString();
    		} else {
    			try {
    				text = document.selection.createRange().text; //IE throws Access denied sometimes when document.selection.type === 'None' (read here https://github.com/tinymce/tinymce/pull/122)
    			} catch (e) {}
    		}
    	}
    	text = stringHelper.trimText(text);

    	if (lingualeoHelper.canTranslate(text) && text.length > 0) {
            // Expand selection to whole sentence, get context
            var context = null;

    		if (browserDetector.isChrome() || browserDetector.isSafari()) {
    			//chrome
                sel.modify('move', 'left', 'sentence');  // modifying with 'sentence' in FF causes exception
                sel.modify('extend', 'right', 'sentence');
                context = stringHelper.trimText(sel.toString());
            } else {
                if (typeof sel.getRangeAt === 'function') {
                    // Opera, Firefox, IE9 standards
                    context = contentHelper.findSentence(sel, inputElement);
                } else {
                    // IE9 quirks mode
                    var tmpRange = document.selection.createRange();
    				var parentElText = tmpRange.parentElement().innerText || '';
                    tmpRange.moveStart('sentence', -1);
                    tmpRange.moveEnd('sentence', 1);
                    context = tmpRange.text;
    				if (parentElText.length && context.length > parentElText.length) {
    					context = parentElText;
    				}
                }
            }
    		result = {
    			text: text,
    			context: (context === text || context.length < text.length) ? null : context
    		};
    	}
    	selectionHelper.restoreSelection(backupSelection);
    	return result;
    }
};
