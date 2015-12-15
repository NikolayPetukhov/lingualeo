/**********************************************************************************
 *   @license
 *   LinguaLeo English Translator Extension
 *   (c) 2009-2015, LinguaLeo
 *   http://lingualeo.com
 *
 ***********************************************************************************/

KangoAPI.onReady(function() {

    var config = new LinguaLeoConfig();
    var extensionOptions = null;
    var nativeLanguage = 'en';

    var textTimer;
    var lastRequestedText;
    var translationsData = null;

    var $loader;
    var $inptText;
    var $container;
    var $imgAvatar;
    var $btnClearInput;
    var $btnEnjoyContent;
    var $translationsContainer;

    var templates;
    var regexRussianLanguage = /[а-я]/i;
    var translationItemHtml = '<li><a href="#" class="translation-item" data-index="{index}">{text}</a></li>';

    var templateNames = [
        'popup/translations',
        'popup/translationsFromGoogle',
        'popup/translationsError',
        'popup/dictionaries',
        'popup/noTranslations'
    ];


    /****************************************************************************/
    /*** Handlers                                                             ***/
    /****************************************************************************/

    function handlerEnjoyContentClick () {
        kango.invokeAsync('window.lingualeo.enableEnjoyContentMode');
        KangoAPI.closeWindow();
    }


    function handlerLoginClick () {
        kango.invokeAsync('window.lingualeo.showLoginDialog');
        KangoAPI.closeWindow();
    }


    function handlerAvatarClick () {
        kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'root');
        KangoAPI.closeWindow();
    }


    function handlerOptionsClick () {
        kango.ui.optionsPage.open();
        KangoAPI.closeWindow();
    }


    function handlerClickClearInput () {
        $inptText.val('').trigger('input').focus();
    }


    function handlerClickClearHistory () {
        kango.invokeAsync('window.lingualeo.clearHistory', function () {
            clearTranslations();
        });
    }


    function handlerPlaySound () {
        var $soundIcon = $('#soundIcon');

        if (browserDetector.canPlayMp3()) {
            var playerElem = $('#player').get(0);

            /*** Chrome audio element fix to enable re-playing ***/
            if (browserDetector.isChrome()) {
                playerElem.src = playerElem.src;
            }
            /*****************************************************/

            playerElem.play();
        }
        else {
            // Play using iframe
            var url = config.path.audio_player + translationsData.soundUrl;
            var htmlFrame = '<iframe id="soundFrame" src="' + url + '" width="0" height="0" style="width:0; height:0; visibility:hidden !important; border:0; overflow:hidden; margin:0; padding:0;" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="0" scrolling="no"></iframe>';
            $soundIcon
                .find('#soundFrame').remove().end()
                .append(htmlFrame);
        }

        // Start animation
        setTimeout(function () {
            $soundIcon.addClass('playing');
            setTimeout(function () {
                $soundIcon.removeClass('playing');
                $soundIcon = null;
            }, 500);
        }, 400);

    	return false;
    }


    function handlerChangeTextInput (delay) {
        var originalText = stringHelper.trimText($inptText.val());
        if (lastRequestedText !== originalText) {
            lastRequestedText = null;
            $btnClearInput.css('display', originalText ? 'block' : 'none');

            clearTranslations();
            hideLoader();
            if (textTimer) {
                clearTimeout(textTimer);
            }
            if (originalText) {
                textTimer = setTimeout(function () {
                    loadTranslationsData(originalText);
                    textTimer = null;
                }, delay == null ? 0 : 1200);
            }
        }
    }


    function handlerKeydownTextInput (event) {
        if (event.keyCode === 27) {         // Esc
            if ($inptText.val()) {
                $btnClearInput.click();
                return false;
            }
        } else if (event.keyCode === 13) {  // Enter
            if (!$inptText.val()) {
                shakeTextInput();
            }
            handlerChangeTextInput(null);
            return false;
        }
        return true;
    }


    function handlerClickTranslationItem () {
        if (translationsData) {
            var index = +$(this).data('index');
            kango.invokeAsync(
                'window.lingualeo.setWordTranslation',
                translationsData.originalText,
                translationsData.translations[index].value,
                null, // context
                null, // url,
                'via LinguaLeo Browser Extension', // title,
                true
            );
            KangoAPI.closeWindow();
        }
    }


    /****************************************************************************/
    /*** Common Methods                                                       ***/
    /****************************************************************************/

    function getTranslationsItemsHtml (translations) {
        var html = '';
        for (var i = 0, item; item = translations[i]; i++) {
            html += stringHelper.formatStr(translationItemHtml, {
                index: i,
                text: htmlHelper.escapeHTML(item.value)
            });
        }
        return html;
    }


    function loadTranslationsData (originalText) {
        lastRequestedText = originalText;

        // Check for inverse translation if text language is not English
        // todo try to detect other languages also
        if (regexRussianLanguage.test(originalText)) {
            translateTextWithGoogle(originalText, 'ru', 'en');
        }
        else {
            translateTextWithLinguaLeo(originalText, null);
        }
    }


    function isResponseWithTranslations (response) {
        return Object.prototype.toString.call(response.translations) === '[object Array]'
                && response.translations.length

                // Why server always returns 1 item even if no translation? Who knows, who knows...
                && !(response.translations.length === 1 && response.translations[0].value === response.originalText);
    }


    function translateTextWithGoogle (originalText, langFrom, langTo) {
        showLoader();
        kango.invokeAsyncCallback('window.lingualeo.translateWithGoogle', originalText, langFrom, langTo, function (response) {
            if (originalText === lastRequestedText) {
                hideLoader();
                if (response.error) {
                    showError(response);
                }
                else {
                    lastRequestedText = response.translation;
                    translateTextWithLinguaLeo(lastRequestedText, function () {
                        showTranslationsFromGoogle(response);
                    });
                }
            }
        });
    }


    function translateTextWithLinguaLeo (originalText, callbackBeforeSuccess) {
        showLoader();
        kango.invokeAsyncCallback('window.lingualeo.getTranslations', originalText, null /*context*/, function (result) {
            if (originalText === lastRequestedText) {
                hideLoader();
                if (result.error) {
                    if (result.error_code == 101 || result.error_code == 102) {
                        // This is a workaround for 'Validation Error', code 102.
                        // I have no idea why some of English words raises this error when another similar ones don't.
                        // So let's make it nice on a client side then, 'coz it can take weeks to make it fixed on a backend.
                        showNoTranslation(originalText);
                    }
                    else {
                        showError(result);
                    }
                }
                else {
                    if (isResponseWithTranslations(result)) {
                        if (callbackBeforeSuccess) {
                            callbackBeforeSuccess();
                        }
                        showTranslationsFromLinguaLeo(result);
                    }
                    else {
                        showNoTranslation(originalText);
                    }
                }
            }
        });
    }


    /****************************************************************************/
    /*** Popup Methods                                                        ***/
    /****************************************************************************/

    function showLoader () {
        $loader.addClass('animated');
    }


    function hideLoader () {
        $loader.removeClass('animated');
    }


    function showError (serverResponse) {
        var errorMessage = serverResponse.error_msg;

        if (serverResponse.error_code) {
            errorMessage += '<br/>' +
            stringHelper.formatStr(i18n.getLocaleMessage('serverResponseCode'), {
                code: serverResponse.error_code
            });
        }

        $translationsContainer.append(stringHelper.formatStr(templates['popup/translationsError'], {
            message: errorMessage
        }));
        updateWindowSize();
    }


    function shakeTextInput () {
        $inptText.addClass('horizontal-shake');
        setTimeout(function () {
            $inptText.removeClass('horizontal-shake');
        }, 1000);
    }


    function showTranslationsFromGoogle (data) {
        $translationsContainer.append(stringHelper.formatStr(templates['popup/translationsFromGoogle'], {
            translation: htmlHelper.escapeHTML(data.translation)
        }));
        updateWindowSize();
    }


    function showTranslationsFromLinguaLeo (data) {
        translationsData = data;
        $translationsContainer.append(stringHelper.formatStr(templates['popup/translations'], {
            soundUrl: data.soundUrl,
            transcription: data.transcription || '---',
            translations: getTranslationsItemsHtml(data.translations)
        }));
        showDictionaries(data.originalText);

        if (extensionOptions.autoplaySound) {
            handlerPlaySound();
        }
    }


    function showDictionaries (originalText) {
        var template = stringHelper.formatStr(templates['popup/dictionaries'], {
            html: dictionariesHelper.getHtml({
                text: originalText,
                locale: nativeLanguage
            })
        });
        $translationsContainer.append(template);
        updateWindowSize();
    }


    function showNoTranslation (originalText) {
        $translationsContainer.html(stringHelper.formatStr(templates['popup/noTranslations'], {
            text: i18n.getLocaleMessage('noTranslationsMessage')
        }));
        showDictionaries(originalText);
    }


    function clearTranslations () {
        if ($translationsContainer.html()) {
            $translationsContainer.empty();
            translationsData = null;
            updateWindowSize();
        }
    }


    function showHistory () {
        kango.invokeAsync('window.lingualeo.getHistoryHtml', function (html) {
            if (html) {
                $translationsContainer.html(html);
                updateWindowSize();
            }
        });
    }


    function updateWindowSize () {
        if (browserDetector.isFirefox()) {
            KangoAPI.resizeWindow(document.documentElement.offsetWidth, document.documentElement.offsetHeight);
        }
    }


    function setControlsState (isAuth) {
        if (isAuth) {
            $('#btnLogin,#btnProfile').hide();
            $imgAvatar.show();
        }
        else {
            // Non-auth controls state is set by default within html
        }
    }


    function initControls () {
        $loader = $('#loader');
        $translationsContainer = $('#translationsContainer');

        $('#btnLogin').on('click', handlerLoginClick);
        $('#btnProfile').on('click', handlerAvatarClick);
        $('#btnOptions').on('click', handlerOptionsClick);

        $btnClearInput = $('#btnClearInput')
            .on('click', handlerClickClearInput);

        $container = $('#container')
            .on('click', '.translation-item', handlerClickTranslationItem)
            .on('click', '#soundIcon', handlerPlaySound);

        $inptText = $('#inptOriginalText')
            .on('input', handlerChangeTextInput)
            .on('keydown', handlerKeydownTextInput);

        $btnEnjoyContent = $('#btnEnjoyContent')
            .on('click', handlerEnjoyContentClick);


        $('body').on('click', '#btnClearHistory', handlerClickClearHistory);


        // User avatar
        $imgAvatar = $('#imgAvatar')
            .on('click', handlerAvatarClick);

        kango.invokeAsync('window.lingualeo.getUserData', null, function (userData) {
            $imgAvatar.attr('src', userData['avatar_mini'] || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' /*blank image*/);
        });


        // Disable some controls if currently opened tab is a system one (e.g. chrome://*)
        kango.browser.tabs.getCurrent(function (tab) {
            // todo safari bug somewhere over here!
            if (!tab.dispatchMessage('') || (tab._tab  &&
                (tab._tab.url.indexOf('chrome-extension://') === 0 || tab._tab.url.indexOf('chrome://') == 0))
            ) {
                $btnEnjoyContent.attr('disabled', true);
            }
        });

        kango.invokeAsync('window.lingualeo.isAuthorized', setControlsState);


        // Pre-load templates
        lingualeoHelper.getTemplates(templateNames, true, function (_templates) {
            templates = _templates;
        });
    }


    /****************************************************************************/
    /*** Initialization                                                      ****/
    /****************************************************************************/

    updateWindowSize();

    kango.invokeAsync('window.lingualeo.getNativeLang', function (lang) {
        nativeLanguage = lang;
    });


    kango.invokeAsync('window.lingualeo.getExtensionOptions', function (response) {
        extensionOptions = response;

        i18n.updateLocaleMessages(false, function() {
            i18n.localizeDom(domHelper.getBody());
            initControls();
            setTimeout(showHistory, 100);
        });

        setTimeout(function() {
            $inptText.focus()
        }, 400);
    });

    $(function () {
        var $container = $('#container');
        // force container reflow for eliminate bug with reneding in chrome/macos
        setTimeout(function () {
            $container.width($container.width() + 1);
        }, 150);
    });
});
