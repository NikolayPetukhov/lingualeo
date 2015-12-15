/** @preserve
// ==UserScript==
// @name LinguaLeoContent
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


/**********************************************************************************/
/*** Modules                                                                    ***/
/**********************************************************************************/

(function () {
    var modules = LinguaLeoConfig().modules;

    // Check for included modules and disable the ones that specified
    for (var moduleName in modules) {
        if (modules.hasOwnProperty(moduleName)) {
            if (typeof window[moduleName] === 'undefined' || !modules[moduleName]) {
                window[moduleName] = null;
            }
        }
    }
})();


/**********************************************************************************/
/***                                                                            ***/
/**********************************************************************************/

var llContent = {

    config: null,
    options: null,
    nativeLang: null,
    timerPageLanguageDetection: null,
    lastTextSentToTranslation: null,
    isMac: window.navigator.userAgent.toLowerCase().indexOf('macintosh') > -1,


    updateNativeLanguage: function (callback) {
        kango.invokeAsync('window.lingualeo.getNativeLang', function (lang) {
            llContent.nativeLang = lang;
            if (callback) {
                callback();
            }
        });
    },


    updateOptions: function (callback) {
        kango.invokeAsync('window.lingualeo.getExtensionOptions', function (_options) {
            llContent.options = _options;
            if (callback) {
                callback();
            }
        });
    },


    injectStyle: function () {
        lingualeoHelper.getTemplate('content/commonStyle', cssHelper.addCss);
        //kango.invokeAsync('kango.io.getExtensionFileContents', 'lingualeo/css/font-open-sans.css', cssHelper.addCss);
    },


    showMeatballsDialog: function () {
        LinguaLeoWizardManager.activateWizard('meatballsLimit', null, null);
    },


    showLocalDictionaryLimitDialog: function () {
        LinguaLeoWizardManager.activateWizard('localDictionaryLimit', null, null);
    },


    openSettings: function () {
        kango.invokeAsync('kango.ui.optionsPage.open');
    },


    getTranslationsHtml: function (translations, inDictionary) {
        var items = [];
        var translationTemplate = '<div class="ll-translation-item" data-index="{index}"><div class="ll-translation-text" data-index="{index}">' +
                                  '<span class="ll-translation-marker"></span><a href="javascript:void 0" data-index="{index}">{text}</a>' +
                                  '</div><!--<div class="ll-translation-counter">{votesCount}</div>--></div>';

        if (translations && translations.length) {
            var ind = 0;

            // Cut off the first translation if it's a current word translation.
            // Current translation always goes first in list.
            if (inDictionary) {
                translations.splice(0, 1);
                ind++;
            }

            // Limit by 5 translations
            translations = translations.slice(0, 5);

            items = arrayHelper.map(translations, function (item) {
                return stringHelper.formatStr(translationTemplate, {
                    index: ind++,
                    text: htmlHelper.escapeHTML(item.value),
                    votesCount: htmlHelper.escapeHTML(item.votes)
                });
            });
        }
        return items.join('');
    },
    
    
    getArticleTemplateData: function () {
        var curData = llContent.dialog.curData;

        //*** Firefox fix.
        //*** curData.translations.length property always returns undefined.
        //*** Seems it's caused by inner security politics, while passing objects through kango API
        if (typeof curData.translations.length === 'undefined') {
            var trans = [];
            for (var i = 0, item; item = curData.translations[i]; i++) {
                trans.push(item);
            }
            curData.translations = trans;
        }
        //****************************************************************

        var baseForm = null;
        var isOriginalTextAlreadyABaseForm = true;
        var originalText = curData.originalText;
        var inDictionary = !!curData.inDictionary;
        var hasTranslation = !!(curData.translations && curData.translations.length);


        if (curData.word_forms && curData.word_forms.length) {
            if (stringHelper.trimText(originalText.toLowerCase()) != stringHelper.trimText(curData.word_forms[0].word.toLowerCase())) {
                isOriginalTextAlreadyABaseForm = false;
                baseForm = curData.word_forms[0].word;
            }
        }
    
        var dictionariesHTML = '';
        if (llContent.options.showDictIcons) {
            dictionariesHTML = dictionariesHelper.getHtml({
                text: originalText,
                locale: llContent.nativeLang
            });
        }
    
        return {
            originalText: htmlHelper.escapeHTML(originalText),
            inDict: inDictionary,
            soundUrl: htmlHelper.escapeHTML(curData.soundUrl) || '',
            hasPic: !!(llContent.options.showPicture && curData.picUrl),
            imagesUrl: htmlHelper.escapeHTML(llContent.config.path.images),
            transcription: htmlHelper.escapeHTML(curData.transcription) || '---',
            showDicts: htmlHelper.escapeHTML(llContent.options.showDictIcons),
            transItems: llContent.getTranslationsHtml(curData.translations, inDictionary), // already escaped
            seeAlsoHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('seeAlsoHint')),
            soundHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('soundButtonHint')),
            optionsBtnHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('optionsBtnHint')),
            addTranHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('enterCustomTranslation')),
            translateContextHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('translateContextHint')),
            picUrl: htmlHelper.escapeHTML((llContent.options.showPicture && curData.picUrl) || llContent.config.path.images + '/blank.gif'),
            context: llContent.options.showContext
                ? curData.context ? stringHelper.wrapWordWithTag(htmlHelper.escapeHTML(curData.context), originalText, 'b') : null
                : null,
            dictionariesLinksHTML: dictionariesHTML, //already escaped
            translatedText: baseForm && !isOriginalTextAlreadyABaseForm
                ? htmlHelper.escapeHTML(i18n.getLocaleMessage('baseFormHint')) + ':'
                : inDictionary
                ? htmlHelper.escapeHTML(curData.translations[0].value)
                : hasTranslation
                ? htmlHelper.escapeHTML(i18n.getLocaleMessage('chooseTranslationHint')) + ':'
                : htmlHelper.escapeHTML(i18n.getLocaleMessage('noTranslationHint')) + '.',
            baseForm: htmlHelper.escapeHTML(baseForm)
        }
    },
    
    
    playSound: function () {
        if (browserDetector.canPlayMp3()) {
            var playerElem = document.getElementById('lleo_player');
    
            /*** Chrome audio element fix to enable re-playing ***/
            if (browserDetector.isChrome()) {
                playerElem.src = playerElem.src;
            }
            /*****************************************************/
    
            playerElem.play();
    
            // Start animation
            var soundWaveElem = document.getElementById('lleo_soundWave');
            cssHelper.addClass(soundWaveElem, 'lleo_beforePlaying');
    
            setTimeout(function () {
                cssHelper.addClass(soundWaveElem, 'lleo_playing');
                setTimeout(function () {
                    soundWaveElem.style.display = 'none !important';
                    cssHelper.removeClass(soundWaveElem, 'lleo_beforePlaying');
                    cssHelper.removeClass(soundWaveElem, 'lleo_playing');
                    soundWaveElem = null;
                }, 500);
            }, 400);
    
        }
        else {
            var url = llContent.config.path.audio_player + llContent.dialog.curData.soundUrl;
            var htmlFrame = '<iframe id="lleo_soundFrame" src="' + url + '" width="0" height="0" style="width:0; height:0; visibility:hidden !important; border:0; overflow:hidden; margin:0; padding:0;" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="0" scrolling="no"></iframe>';
            domHelper.removeChild(document.getElementById('lleo_soundFrame'));
            domHelper.appendHtmlToElement(document.getElementById('lleo_sound'), htmlFrame);
        }
        return false;
    },


    showTranslations: function (data) {
        if (llContent.dialog.elem) {
            llContent.dialog.curData = data;
            lingualeoHelper.getTemplate('content/translations', function (htmlTemplate) {
                var html = stringHelper.formatStrExt(htmlTemplate, llContent.getArticleTemplateData());
                llContent.dialog.elem.className = 'lleo_show';
                llContent.dialog.setContent(html);

                Event.add(document.getElementById('lleo_sound'), 'click', llContent.playSound);
                Event.add(document.getElementById('lleo_trans'), 'click', llContent.handlers.clickTranslationsList);
                Event.add(document.getElementById('lleo_baseForm'), 'click', llContent.handlers.baseFormClick);
                Event.add(document.getElementById('lleo_setTransForm'), 'submit', llContent.handlers.submitCustomTranslation);

                if (browserDetector.isSafari() || browserDetector.isIE()) {
                    var optionsHref = document.getElementById('lleo_optionsBtn');
                    cssHelper.addClass(llContent.dialog.elem, 'lleo_optionsShown');
                    Event.add(optionsHref, 'click', llContent.openSettings);
                }
                if (llContent.options.autoplaySound) {
                    llContent.playSound();
                }
                if (llContent.options.showContext) {
                    if (llContent.options.autoTranslateContext) {
                        llContent.handlers.clickTranslateContext();
                    }
                    else {
                        Event.add(document.getElementById('lleo_translateContextLink'), 'click', llContent.handlers.clickTranslateContext);
                    }
                }
            });
        }
    },


    showLoginDialog: function (atDefaultPosition) {
        if (lingualeoHelper.isTopWindow()) {
            if (typeof showLoginDialog !== 'undefined') {
                var backupSelection = selectionHelper.saveSelection();
                showLoginDialog(atDefaultPosition, function (returnValue) {
                    if (returnValue) {
                        selectionHelper.restoreSelection(backupSelection);
                        llContent.showTranslationsDialog();
                    }
                });
            }
            else {
                kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'profile');
            }
        }
    },


    showTranslatesDialog: function (data) {
        llContent.dialog.create();
        llContent.lastTextSentToTranslation = data.text;
        kango.invokeAsyncCallback('window.lingualeo.getTranslations', data.text, data.context, function (result) {
            if (data.text === llContent.lastTextSentToTranslation) {
                if (result.error) {
                    llContent.dialog.remove();
                }
                else {
                    llContent.showTranslations(result);
                }
            }
        });
    },


    showDialogForCurrentSelection: function (inputElement, doExpandCollapsedSelection) {
        if (inputElement && inputElement.getAttribute && inputElement.getAttribute('type') === 'password') {
            return;
        }
        var sel;

        try {
            sel = selectionHelper.getSelection();
        } catch (e) {
            return;
        }

        if (!inputElement && doExpandCollapsedSelection) {
            if (sel.isCollapsed) {
                try {
                    sel.modify('move', 'left', 'word');
                    sel.modify('extend', 'right', 'word');
                }
                catch (e) {}
            }
        }

        var data = contentHelper.extractContext(inputElement);
        if (data) {

            // Remove punctuation at the end if a single word selected
            if (!/\s/ig.test(data.text)) {
                data.text = data.text.replace(/^(\w+)[.,;:”"']*$/gi, '$1');
            }

            // Exclude numbers
            if (/^\d+$/i.test(data.text)) {
                return;
            }

            var rect = null;
            if (inputElement) {
                rect = inputElement.getBoundingClientRect();
            }
            else {
                if (typeof sel.getRangeAt === 'function') {
                    var range = sel.getRangeAt(0);
                    rect = range.getBoundingClientRect();
                    if (browserDetector.isOpera() || browserDetector.isFirefox()) { //crutch, on http://ru.scribd.com/doc/42717509/gamification101 in Opera and FF 'getBoundingClientRect' returns incorrect values
                        var cS = sizeHelper.clientSize();
                        var point = {'x': rect.left, 'y': rect.top};
                        var visibleAreaRect = {'left': 0, 'top': 0, 'right': cS.width, 'bottom': cS.height};
                        if (!sizeHelper.pointInRect(point, visibleAreaRect)) {
                            var startEl = range.startContainer;
                            while (typeof startEl.tagName === 'undefined') {
                                startEl = startEl.parentNode;
                            }
                            var offset = sizeHelper.getOffset(startEl);
                            var sO = llContent.dialog.scrollOffsetOnClick || sizeHelper.scrollOffset();
                            offset.left -= sO.left;
                            offset.top -= sO.top;
                            rect = {'left': offset.left, 'top': offset.top, 'width': startEl.offsetWidth, 'height': startEl.offsetHeight};
                            rect.right = rect.left + rect.width;
                            rect.bottom = rect.top + rect.height;
                        }
                    }
                }
                else {
                    rect = document.selection.createRange().getClientRects()[0];
                }
            }
            llContent.dialog.scrollOffsetOnClick = sizeHelper.scrollOffset();
            llContent.dialog.rect = rect;
            llContent.showTranslatesDialog(data);
        }
    },

    
    showTranslationsDialog: function () {
        // Detect if context menu was called from input element.
        // If so, pass it as a parameter, so script can calculate dialog position relatively to the input,
        // not to current selection, because it's impossible to get x/y coords for selection inside the input
        // using standard technique with getClientBoundRect().
        // Moreover, this input will be used to extract a text context using input-specific selection methods.
        var inputElement = null;
        if (typeof document.activeElement.tagName !== 'undefined' && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            inputElement = document.activeElement;
        }
        llContent.showDialogForCurrentSelection(inputElement, true);
    },
    
    
    tryToSimplifyPage: function () {
        if (llSimplified) {
            clearTimeout(llContent.timerPageLanguageDetection);
            llSimplified.simplifyPage(function (hasContent) {
                LinguaLeoWizardManager.activateWizard(hasContent ? 'enjoyContentExplain' : 'enjoyContentNoContent', 2000);
            });
        }
    },


    detectPageLanguage: function () {
        if (!llSimplified || !llContent.options.enjoyContentControlsEnabled) {
            return;
        }
        llContent.timerPageLanguageDetection = setTimeout(function() {
            var content = domHelper.getBody().innerHTML;
            kango.invokeAsyncCallback('window.lingualeo.getPageLanguage', content, window.location.href, function (language) {
                if (language === 'en') {
                    LinguaLeoWizardManager.activateWizard('enjoyContentWelcome', 0, function (isActivated) {
                        if (!isActivated) {
                            LinguaLeoWizardManager.activateWizard('enjoyContentControlsExplain', 0, function (isActivated) {
                                LinguaLeoWizardManager.activateWizard('enjoyContentControls', isActivated ? 2000 : 0);
                            });
                        }
                    });
                }
            });
        }, llContent.config.languageDetectionTimeout);
    },


    bindEventHandlers: function () {
        //Event.add(document, 'selectionchange', llContent.handlers.selectionChange);

        // Assign broadcast listeners for user data changes
        var nativeLanguageOptions = llContent.config.userStorageData['lang_native'];
        if (nativeLanguageOptions) {
            kango.addMessageListener(nativeLanguageOptions.broadcastMessage, function () {
                llContent.updateNativeLanguage(null);
            });
        }
    
        var localeLanguageOptions = llContent.config.userStorageData['lang_interface'];
        if (localeLanguageOptions) {
            kango.addMessageListener(localeLanguageOptions.broadcastMessage, function () {
                i18n.updateLocaleMessages(true);
            });
        }
    
    
        // Assign DOM listeners
        Event.add(document, 'contextmenu', llContent.handlers.contextMenu);
        Event.add(window, 'resize', llContent.dialog.remove);
        Event.add(document, 'dblclick', llContent.handlers.dblClick);
        Event.add(document, 'keydown', llContent.handlers.keyDown);
        Event.add(document, 'mousedown', llContent.dialog.remove);
        if (browserDetector.isOpera()) {
            Event.add(document, 'mouseup', llContent.handlers.operaMouseUp);
        }
    
    
        // Assign common listeners
        kango.addMessageListener('getContext', llContent.showTranslationsDialog);
        kango.addMessageListener('updateOptions', function () { llContent.updateOptions(null); });
        kango.addMessageListener('showLoginDialog', function() {
            llContent.showLoginDialog(true);
        });
    
        kango.addMessageListener('showNoMeatballsDialog', llContent.showMeatballsDialog);
        kango.addMessageListener('simplifyPage', llContent.tryToSimplifyPage);
        kango.addMessageListener('showLocalDictionaryLimitDialog', llContent.showLocalDictionaryLimitDialog);
    },
    
    
    init: function () {
        llContent.config = new LinguaLeoConfig();
        llContent.bindEventHandlers();
        llContent.injectStyle();
        llContent.updateNativeLanguage(function () {
            llContent.updateOptions(function () {
                llContent.detectPageLanguage();
                if (llYoutube) {
                    llYoutube.init();
                }
            });
        });
    }

};


llContent.dialog = {

    elem: null,
    rect: null,
    curData: null,
    scrollOffsetOnClick: null,


    handlerStopEventPropagation: function (event) {
        event.stopPropagation();
    },


    create: function () {
        lingualeoHelper.getTemplate('content/dialog', function (htmlTemplate) {
            var html = stringHelper.formatStrExt(htmlTemplate, {
                imagesUrl: htmlHelper.escapeHTML(llContent.config.path.images),
                closeBtnHint: htmlHelper.escapeHTML(i18n.getLocaleMessage('dlgCloseHint') + ' (Esc)')
            });
            llContent.dialog.remove();
            domHelper.appendHtmlToElement(domHelper.getBody(), html);
            llContent.dialog.elem = document.getElementById('lleo_dialog');

            Event.add(llContent.dialog.elem, 'mouseup', llContent.dialog.handlerStopEventPropagation);
            Event.add(llContent.dialog.elem, 'dblclick', llContent.dialog.handlerStopEventPropagation);
            Event.add(llContent.dialog.elem, 'mousedown', llContent.dialog.handlerStopEventPropagation);
            Event.add(llContent.dialog.elem, 'contextmenu', llContent.dialog.handlerStopEventPropagation);
            //Event.add(document.getElementById('lleo_closeBtn'), 'click', llContent.dialog.remove);

            llContent.dialog.setContent('<div class="lleo_empty">Loading...</div>');
            setTimeout(function () {
                if (llContent.dialog.elem) {
                    cssHelper.addClass(llContent.dialog.elem, 'lleo_show lleo_show_small');
                }
            }, 0);
        });
    },


    remove: function () {
        var elem = document.getElementById('lleo_dialog');
        if (elem) {
            elem.parentNode.removeChild(elem);
            llContent.dialog.elem = null;
        }
    },


    setContent: function (html) {
        document.getElementById('lleo_dialogContent').innerHTML = html;
        llContent.dialog.updatePosition();
    },


    updatePosition: function () {
        var body = domHelper.getBody();
        var bodyRect = body.getBoundingClientRect();
        var sO = llContent.dialog.scrollOffsetOnClick || sizeHelper.scrollOffset();
        var bodyTop = bodyRect.top + sO.top;
        llContent.dialog.scrollOffsetOnClick = null;//todo: test this better
        var l = (sO.left + llContent.dialog.rect.left - 12);
        var t = (sO.top + llContent.dialog.rect.top - llContent.dialog.elem.offsetHeight - 10 - bodyTop);

        // Correct dialog position according to viewport
        if (t < sO.top) {
            t = (sO.top + llContent.dialog.rect.bottom + 10 - bodyTop);
        }
        if (l < sO.left + 5) {
            l = sO.left + 5;
        }
        else if (l + llContent.dialog.elem.offsetWidth > sO.left + body.offsetWidth - 35) {
            l = sO.left + body.offsetWidth - llContent.dialog.elem.offsetWidth - 35;
        }
        llContent.dialog.elem.style.left = l + 'px';
        llContent.dialog.elem.style.top = t + 'px';
    },


    setTranslatedContext: function (htmlEscapedText) {
        if (llContent.dialog.elem) {
    		document.getElementById('lleo_context').innerHTML = htmlEscapedText;
    		//document.getElementById('lleo_gBrand').className = '';
        }
    }

};


llContent.handlers = {

    contextMenu: function () {
        kango.invokeAsyncCallback(
            'window.lingualeo.toggleContextMenu',
            !window.getSelection().isCollapsed
        );
    },

    baseFormClick: function () {
        var wordForms = llContent.dialog.curData.word_forms;
    	var baseForm = wordForms && wordForms.length ? wordForms[0].word : null;
    	if (baseForm) {
    		llContent.showTranslatesDialog({text: baseForm, context: null});
    	}
    	return false;
    },


    dblClick: function (event) {
        if (!llContent.options.useDblClick || (llSimplified && llSimplified.isSimplifiedModeOn())) {
            return true;
        }
        if ((!llContent.options.dblClickWithCtrl && !llContent.options.dblClickWithAlt)
            || (llContent.options.dblClickWithCtrl && (llContent.isMac ? event.metaKey : event.ctrlKey))
            || (llContent.options.dblClickWithAlt && event.altKey))
        {
            var inputElement = null;


            if (typeof event.target.tagName !== 'undefined' && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
                // !!!Disable double clicks within input. Too annoying sometimes.
                //inputElement = event.target;
                return true;
            }

            llContent.showDialogForCurrentSelection(inputElement, false);
            return false;
        }
    },


    keyDown: function (event) {
        if (event.keyCode === 27) {   // Esc
            llContent.dialog.remove();
            return;
        }
        if (event.ctrlKey && event.keyCode === 76) {   // 'L'-key
            llContent.showTranslationsDialog();
            return;
        }
        // TODO !!!
        /*if (event.ctrlKey && event.shiftKey && (event.keyCode === 80 || event.keyCode === 112)) { // Ctrl + Shift + P
            llContent.showDialogForCurrentSelection(null, false);
        }*/
    },


    /*selectionChange: function (event) {
        // NOT USED FOR NOW, BUGGY.
        *//*var selection = selectionHelper.getSelection();
        if (typeof selection.toString === 'function') {
            var text = stringHelper.trimText(selection.toString());
            kango.invokeAsync('window.lingualeo.setContextItemText', lingualeoHelper.canTranslate(text) ? text : null);
        }*//*
    },*/


    saveTranslation: function (translatedText) {
        if (translatedText) {
            var isSimplifiedModeOn = llSimplified && llSimplified.isSimplifiedModeOn();
            kango.invokeAsyncCallback(
                'window.lingualeo.setWordTranslation',
                llContent.dialog.curData.originalText,
                translatedText,
                llContent.dialog.curData.context,
                document.URL,
                document.title,
                !isSimplifiedModeOn,
                function (isSuccess) {
                    if (isSuccess && isSimplifiedModeOn) {
                        llSimplified.addWordToList(llContent.dialog.curData.originalText);
                    }
                }
            );
        }
        llContent.dialog.elem.className = 'lleo_show lleo_collapse';
        setTimeout(function() {
            llContent.dialog.remove();
        }, 450);
    },


    submitCustomTranslation: function () {
        var transValue = stringHelper.trimText(document.getElementById('lleo_transField').value);
        llContent.handlers.saveTranslation(transValue);
        return false;
    },


    clickTranslationsList: function (event) {
        if (event.target.tagName === 'A' || event.target.tagName === 'DIV') {
            var index = parseInt(event.target.getAttribute('data-index'));
            if (!isNaN(index)) {
                llContent.handlers.saveTranslation(llContent.dialog.curData.translations[index].value);
            }
        }
        return false;
    },


    clickTranslateContext: function () {
        if (llContent.dialog.curData.context != null && typeof llContent.dialog.curData.context !== 'undefined') {
            document.getElementById('lleo_translateContextLink').className += 'hidden';
            //var context = stringHelper.wrapWordWithTag(htmlHelper.escapeHTML(llContent.dialog.curData.context), llContent.dialog.curData.originalText, 'b');
            kango.invokeAsyncCallback(
                'window.lingualeo.translateWithGoogle',
                llContent.dialog.curData.context, //context,
                'en',
                llContent.nativeLang && llContent.nativeLang !== 'en' ? llContent.nativeLang : 'ru',
                function (response) {
                    llContent.dialog.setTranslatedContext(response.error_msg ? i18n.getLocaleMessage('errorContextTranslation') : response.translation);
                });
        }
        return false;
    },


    operaMouseUp: function (event) {
        if (llContent.isMac ? event.metaKey : event.ctrlKey) {
            var inputElement = null;
            if (typeof event.target.tagName !== 'undefined' && (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea')) {
                inputElement = event.target;
            }
            llContent.showDialogForCurrentSelection(inputElement, false);
        }
        return false;
    }
};


llContent.init();

