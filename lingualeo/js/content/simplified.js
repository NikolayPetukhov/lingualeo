/** @preserve
// ==UserScript==
// @name LinguaLeoSimplified
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

llSimplified = function () {

    if (!lingualeoHelper.isTopWindow()) {
        return;
    }

    var bannedHosts = ['twitter.com'];

    var isSimplifiedOn = false;
    var creatingSimplified = false;
    var rootElem = null;

    var currentFontSize = 'size1';
    var oldBodyOverflow = null;

    var wordsStorage = null;
    var addedWords = [];

    var useSVG = browserDetector.isFirefox() || browserDetector.isIE();


    /**************************************************/

    function zoomSimplifiedLayer() {
        cssHelper.addClass(rootElem, 'lleo_simplifiedZoomed');
        setTimeout(function() {
            cssHelper.removeClass(rootElem, 'lleo_simplifiedZoomed');
        }, 200);
    }


    function isElementOfLinguaLeo (element) {
        return element.hasAttribute('id') && !element.getAttribute('id').indexOf('lleo_');
    }


    function preparePage () {
        isSimplifiedOn = true;
        var body = domHelper.getBody();

        // Remove body scrollbars
        oldBodyOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        // Add SVG filter for specific browsers
        if (useSVG) {
            lingualeoHelper.getTemplate('content/simplifiedSvgFilter', function (html) {
                domHelper.appendHtmlToElement(domHelper.getBody(), html);
            });
        }

        // Set style for top elements on page
        if (llContent.config.simplifiedContentBlurBackground) {
            var topElems = body.children;
            for (var i = 0, elem; elem = topElems[i]; i++) {
                if (!isElementOfLinguaLeo(elem)) {
                    elem.setAttribute('data-lleo-changed', 'yes');
                    elem.setAttribute('data-lleo-webkit-filter', elem.style.webkitFilter);
                    elem.setAttribute('data-lleo-filter', elem.style.filter);
                    elem.style.webkitFilter = 'blur(7px)';
                    elem.style.filter = useSVG ? 'url(#lleo_svgBlur)' : '';
                }
            }
        }
    }


    function restorePage () {
        var body = domHelper.getBody();

        // Restore styles for all affected elements on page
        if (llContent.config.simplifiedContentBlurBackground) {
            var topElems = body.children;
            for (var i = 0, elem; elem = topElems[i]; i++) {
                if (elem.getAttribute('data-lleo-changed')) {
                    elem.style.webkitFilter = elem.getAttribute('data-lleo-webkit-filter');
                    elem.style.filter = elem.getAttribute('data-lleo-filter');
                    elem.removeAttribute('data-lleo-webkit-filter');
                    elem.removeAttribute('data-lleo-filter');
                    elem.removeAttribute('data-lleo-changed');
                }
            }
        }

        // Restore scrollbars
        body.style.overflow = oldBodyOverflow;

        // Remove SVG filter
        if (useSVG) {
            domHelper.removeChild(document.getElementById('lleo_svg'));
        }
        isSimplifiedOn = false;
    }


    function restoreWordsList () {
        addedWords = {};
        if (wordsStorage) {
            for (var i = 0, word; word = wordsStorage[i]; i++) {
                doAddWordToList(word);
            }
        }
    }


    function showSimplifiedContent (contentHtml, isEmptyContent) {
        if (creatingSimplified) {
            return;
        }
        creatingSimplified = true;

        lingualeoHelper.getTemplate('content/simplifiedStyle', function (css) {
            cssHelper.addCss(css, 'simplified');
        });

        lingualeoHelper.getTemplate('content/simplified', function (template) {
            var body = domHelper.getBody();
            var dialogWidth = Math.min(sizeHelper.clientSize().width - 300, llContent.config.simplifiedContentMaxWidth);

            // Create simplified template
            var html = stringHelper.formatStrExt(template, {
                content: contentHtml,
                isEmpty: isEmptyContent,
                width: dialogWidth + 'px !important',
                marginLeft: (-dialogWidth / 2)  + 'px !important',
                listPaddingLeft: dialogWidth / 2 + 30 + 'px !important'
            });

            // Create DOM
            domHelper.appendHtmlToElement(body, html);
            rootElem = document.getElementById('lleo_simplifiedLayer');

            Event.add(window, 'keydown', handlerKeydown);
            Event.add(rootElem, 'click', handlerSimplifiedContentClick);
            Event.add(document.getElementById('lleo_simplifiedCloseBtn'), 'click', handlerCloseButtonClick);
            Event.add(document.getElementById('lleo_fontSizeContainer'), 'click', handlerFontSelectorClick);
            updateSimplifiedOptions();
            toggleIframes(false);

            // Show simplified-page layer
            setTimeout(function() {
                cssHelper.addClass(rootElem, 'lleo_simplifiedShow');
                restoreWordsList();
            }, 10);

            creatingSimplified = false;
        });
    }

    function toggleIframes (isVisible) {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0, il = iframes.length; i < il; i++) {
            iframes[i].classList[isVisible ? 'remove' : 'add']('lleo_hidden_iframe');
        }
    }


    function updateSimplifiedOptions () {
        if (rootElem) {
            kango.invokeAsync('window.lingualeo.getExtensionOptions', function (options) {
                var contentElem = document.getElementById('lleo_simplifiedContent');
                cssHelper.removeClass(contentElem, 'lleo_font_' + currentFontSize);
                currentFontSize = options.simplifiedFontSize || 'size1';
                cssHelper.addClass(contentElem, 'lleo_font_' + currentFontSize);
                updateFontControls();
            });
        }
    }


    function updateFontControls() {
        cssHelper.removeClass(document.querySelector('#lleo_fontSizeContainer a.selected'), 'selected');
        cssHelper.addClass(document.querySelector('#lleo_fontSizeContainer a[data-value="' + currentFontSize + '"]'), 'selected');
    }


    /**********************************************************************************/
    /*** Handlers                                                                   ***/
    /**********************************************************************************/

    function handlerSimplifiedContentClick (event) {
        if (event.target.tagName === 'TRAN') {
            selectionHelper.selectNode(event.target);
            llContent.showDialogForCurrentSelection(null, false);
            return false;
        }
        return true;
    }


    function handlerFontSelectorClick (e) {
        if (e.target.tagName === 'A') {
            kango.invokeAsync('window.lingualeo.setExtensionOptions', {
                simplifiedFontSize: e.target.getAttribute('data-value')
            });
        }
    }


    function handlerCloseButtonClick () {
        wordsStorage = [];
        for (var word in addedWords) {
            if (addedWords.hasOwnProperty(word)) {
                wordsStorage.push(word);
            }
        }
        addedWords = {};
        domHelper.removeChild(rootElem);
        rootElem = null;

        toggleIframes(true);
        Event.remove(window, 'keydown', handlerKeydown);
        restorePage();
    }


    function handlerKeydown (event) {
        if (event.keyCode === 27) { // Esc
            event.stopPropagation();
            event.preventDefault();
            handlerCloseButtonClick();
        }
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    function doSimplifyPage (callback) {
        if (isSimplifiedOn) {
            zoomSimplifiedLayer()
            return;
        }

        var isHostAllowed = false;
        if (bannedHosts.indexOf(location.host) === -1) {
            isHostAllowed = true;
        }

        if (isHostAllowed) {
            var simplifiedHtml = Readability.parse();
            preparePage();
        }

        if (isHostAllowed && simplifiedHtml) {
            kango.invokeAsyncCallback('window.lingualeo.getClickableContent', simplifiedHtml, function (clickableHtml) {
                showSimplifiedContent(clickableHtml, false);
                if (callback) {
                    callback(true /*not empty content*/);
                }
            });
        } else {
            lingualeoHelper.getTemplate('content/simplifiedEmpty', function (html) {
                showSimplifiedContent(html, true);
                if (callback) {
                    callback(false /*empty content*/);
                }
            });
        }
    }


    function doAddWordToList (originalText) {
        var wordArticleUrl = lingualeoHelper.getWordArticleUrl(originalText);
        var wordListElem = document.getElementById('lleo_simplifiedWordList');
        var originalTextTrimmed = originalText.length > 30 ? originalText.substr(0, 29) + '...' : originalText;

        // Add new word to list, scroll list to bottom
        domHelper.appendHtmlToElement(
            wordListElem,
            '<a href="' + wordArticleUrl + '" target="_blank">' + htmlHelper.escapeHTML(originalTextTrimmed) + '</a>'
        );
        var wordElem = wordListElem.lastChild;
        wordListElem.scrollTop = 9999999999;

        // Remove word duplicate from list if exist
        if (originalText in addedWords) {
            domHelper.removeChild(addedWords[originalText]);
        }

        // Add new word
        addedWords[originalText] = wordElem;
        setTimeout(function () {
            cssHelper.addClass(wordElem, 'lleo_show');
        }, 1);
    }


    /**********************************************************************************/
    /*** Initialization                                                             ***/
    /**********************************************************************************/

    kango.addMessageListener('updateOptions', updateSimplifiedOptions);


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {

        isSimplifiedModeOn: function () {
            return isSimplifiedOn;
        },
        simplifyPage: doSimplifyPage,
        addWordToList: doAddWordToList

    };

}();