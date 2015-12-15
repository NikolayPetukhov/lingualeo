/**********************************************************************************
 *   @license
 *   LinguaLeo English Translator Extension
 *   (c) 2009-2015, LinguaLeo
 *   http://lingualeo.com
 *
 ***********************************************************************************/

var lingualeo = {

    browserButtonDefaultHint: 'LinguaLeo is cool!',

    isAuth: false,
    userName: '',
    templates: {},
    currentOptions: null,
    translationImageUrls: {},

    untrainedTimer: null,
    untrainedWordsCount: 0,


    disabledLanguageDetectionUrls: [
        /^https:\/\/.*/
        /*/^https?:\/\/(www\.)?google\./,
        /^https?:\/\/(www\.)?yahoo\./,
        /^https?:\/\/(www\.)?bing\./,
        /^https?:\/\/(www\.)?facebook\.com/,
        /^https?:\/\/(www\.)?instagram\.com/,
        /^https?:\/\/(www\.)?youtube\.com/,
        /^https?:\/\/(www\.)?twitter\.com/*/
    ],

    regex: {
        allTags: /<(.|\s)*?>/gi,
        allSpaces: / |\t|\r|\n/gim,
        footerTag: /<footer(.|\s)*?<\/footer>/gi,
        styleTags: /<style(.|\s)*?<\/style>/gi,
        scriptTags: /<script(.|\s)*?<\/script>/gi,
        noscriptTags: /<noscript(.|\s)*?<\/noscript>/gi,
        ieTags: /<!--\[if(.|\s)*?endif\]-->/gi,
        doubleSpaces: /[\n\r\t]{2,}/gi,
        doubleLineFeeds: /(\n\s*\n)+/gi,
        englishSentences: /[^.!?а-я]{30}[.!?]+\s|$/gi,
        englishWords: /\b\w+\b/gi
    },


    /*****************************************/

    isAuthorized: function () {
    	return lingualeo.isAuth;
    },


    getUserName: function () {
        return lingualeo.userName || kango.i18n.getMessage('defaultUserName');
    },


    localizeHtml: function (html) {
        if (typeof html !== 'string') {
            return html;
        }
        var i18nData = {};
        var regex = /\{i18n:(.*?)\}/gi;
        var match;
        while ((match = regex.exec(html)) !== null) {
            i18nData['i18n:' + match[1]] = kango.i18n.getMessage(match[1], {USERNAME: lingualeo.getUserName()});
        }
        return stringHelper.formatStr(html, i18nData);
    },


    getTemplate: function (name, doLocalize) {
        if (!(name in lingualeo.templates)) {
            var isCSS = name.indexOf('Style') === name.length - 5;
            lingualeo.templates[name] = kango.io.getExtensionFileContents('lingualeo/templates/' + name + (isCSS ? '.css' : '.html'));
        }
        return {
            html: doLocalize ? lingualeo.localizeHtml(lingualeo.templates[name]) : lingualeo.templates[name]
        };
    },


    getTemplates: function (names, doLocalize) {
        var htmls = {};
        for (var i = 0, name; name = names[i]; i++) {
            htmls[name] = lingualeo.getTemplate(name, doLocalize).html;
        }
        return htmls;
    },


    showLoginDialog: function () {
        kango.browser.tabs.getCurrent(function (tab) {
            // If can't show login dialog within a system tab (e.g. chrome://*) --> open website instead
            if (!tab.dispatchMessage('showLoginDialog') || (tab._tab  &&
                (tab._tab.url.indexOf('chrome-extension://') === 0 || tab._tab.url.indexOf('chrome://') == 0))
            ) {
                lingualeo.openLinguaLeoPage('profile');
            }
        });
    },

    getQueryParamsDelimiter: function (url) {
        var questionIndex = url.indexOf('?'),
            delimiter;

        if (questionIndex === url.length - 1) {
            delimiter = '';
        } else {
            delimiter = questionIndex === -1 ? '?' : '&';
        }

        return delimiter;
    },

    addArgumentsToUrl: function (url, queryArgs) {
        queryArgs = queryArgs || {};

        var queryArgsStr = Object.keys(queryArgs).map(function (queryArgument) {
            return queryArgument + '=' + encodeURIComponent(queryArgs[queryArgument]);
        }).join('&');

        return queryArgsStr ? url + this.getQueryParamsDelimiter(url) + queryArgsStr : url;
    },


    openLinguaLeoPage: function (page, getArguments) {
        getArguments = getArguments || {};

        var url = this.addArgumentsToUrl(lingualeo.config.domain + lingualeo.config.path[page], getArguments);

        kango.browser.tabs.create({url: url});
    },


    openDictionaryPage: function (originalText) {
        kango.browser.tabs.create({
            url: lingualeoHelper.getWordArticleUrl(originalText)
        });
    },


    enableEnjoyContentMode: function () {
        kango.browser.tabs.getCurrent(function(tab) {
           tab.dispatchMessage('simplifyPage');
        });
    },


    getClickableContent: function (html, callback) {
        var $elem = $('<div>' + html + '</div>');
        lingualeo.nodeWordsWrapper.wrapNodeWords($elem);
        callback($elem.html());
    },


    clearContentOfHtmlTags: function (content) {
        // Remove garbage from content in the specific order
        return content
                    .replace(lingualeo.regex.footerTag, '')
                    .replace(lingualeo.regex.styleTags, '')
                    .replace(lingualeo.regex.scriptTags, '')
                    .replace(lingualeo.regex.noscriptTags, '')
                    .replace(lingualeo.regex.ieTags, '')
                    .replace(lingualeo.regex.allTags, ' ');
    },


    isContentInEnglish: function (content, callback) {
        guessLanguage.detect(lingualeo.clearContentOfHtmlTags(content), function (lang) {
            callback(lang === 'en');
        });
    },


    getPageLanguage: function (content, url, callback) {
        if (url) {
            // Do not proceed language checking for specific urls
            for (var i = 0, regexUrl; regexUrl = lingualeo.disabledLanguageDetectionUrls[i]; i++) {
                if (regexUrl.test(url)) {
                    return callback(null);
                }
            }
        }

        content = lingualeo.clearContentOfHtmlTags(content).replace(/(^|(\s\s))[^.!?]+((\s\s)|$)/gi, '\n\n');

        var goodContentFlags = {
            smallBlocks: 0,
            largeBlocks: 0
        };

        var sentenceCounts = [];
        var nonEmptyTextBlocks = [];
        var sentenceCountsTotal = 0;
        var textBlocks = content.split(lingualeo.regex.doubleLineFeeds) || [];

        for (var j = 0; j < textBlocks.length; j++) {
            var textBlock = textBlocks[j];
            var sentences = textBlock.match(lingualeo.regex.englishSentences) || [];
            if (sentences.length >= 3) {
                nonEmptyTextBlocks.push(textBlock);
                sentenceCounts.push(sentences.length);
                sentenceCountsTotal += sentences.length;

                if (sentences.length === 3) {
                    goodContentFlags.smallBlocks++;
                }
                else if (sentences.length >= 5) {
                    goodContentFlags.largeBlocks++
                }
            }
        }


        /*************** DEBUG START *******************************************************/
        /*if (lingualeo.config.debug && console && console.log) {
            console.log('### Enjoy content! info: ', url);
            console.log('  -- Non-empty blocks count: ' + nonEmptyTextBlocks.length);
            console.log('  -- Sentences count average: ' + (nonEmptyTextBlocks.length ? (sentenceCountsTotal / nonEmptyTextBlocks.length) : 0));
            console.log('  -- Total sentences count: ' + sentenceCountsTotal);
            console.log('  -- Sentences per block: ' + sentenceCounts);
            console.log('  -- Small blocks / large blocks: ' + goodContentFlags.smallBlocks + ' / '  + goodContentFlags.largeBlocks);
            console.log('  -- Non-empty blocks: ', nonEmptyTextBlocks);
        }*/
        /*************** DEBUG END *********************************************************/


        if ((goodContentFlags.smallBlocks >= 4 || goodContentFlags.largeBlocks >= 2) ||
            (goodContentFlags.smallBlocks >= 2 && goodContentFlags.largeBlocks >= 1))
        {
            guessLanguage.detect(content, callback);
        }
        else {
            callback(null);
        }
    },


    // Only for IE
    moveCookiesToBHO: function () {
        try {
            var global = kango.lang.getGlobalContext();
            var kangoEngine = global.KangoEngine;
            if (kangoEngine) {
                var tab = kango.browser.getActiveTab();
                if (tab) {
                    var bho = tab.getBHO();
                    if (bho) {
                        var cookie = kangoEngine.getCookie('http://lingualeo.com/api/login', null);
                        var cookies = cookie.split('; ');
                        for(var i = 0; i < cookies.length; i++) {
                            if (cookies[i].indexOf('remember=') != -1 || cookies[i].indexOf('lingualeo=') != -1) {
                                bho.setCookie('http://lingualeo.com/api/login', null, cookies[i] + '; expires = Sat,01-Jan-2020 00:00:00 GMT; path=/');
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            kango.console.log('Error in lingualeo.moveCookiesToBHO. Details: ' + e.message);
        }
    },


    setExtensionCookie: function () {
        if (kango.storage.getItem('isCookieSet') === null) {
            lingualeo.server.setCookieWithServer(function () {
                kango.storage.setItem('isCookieSet', true);
            });
        }
    },


    setExtensionOptions: function (options) {
        var isChanged = false;
        for (var name in options) {
            if (options.hasOwnProperty(name) && name in lingualeo.defaultOptions) {
                kango.storage.setItem(name, options[name]);
                isChanged = true;
            }
        }
        if (isChanged) {
            lingualeo.updateOptionsForAllTabs();
        }
    },


    getExtensionOptions: function () {
        var options = {};
        for (var name in lingualeo.defaultOptions) {
            if (lingualeo.defaultOptions.hasOwnProperty(name)) {
                options[name] = kango.storage.getItem(name) != null ? kango.storage.getItem(name) : lingualeo.defaultOptions[name];
            }
        }
        return options;
    },


    setWizardOptions: function (options) {
        kango.storage.setItem('wizardOptions', JSON.stringify(options || {}));
    },


    getWizardOptions: function () {
        try {
            return JSON.parse(kango.storage.getItem('wizardOptions'));
        }
        catch (e) {}
        return {};
    },


    updateExtensionOptionsForBackgroundPage: function () {
        var oldOptions = lingualeo.currentOptions;
        lingualeo.currentOptions = lingualeo.getExtensionOptions();

        // Check for options changes
        if (oldOptions === null || oldOptions.showUntrainedWordsCount !== lingualeo.currentOptions.showUntrainedWordsCount) {
            lingualeo.updateUntrainedWordsCounter();
        }
    },


    updateOptionsForAllTabs: function () {
        lingualeo.sendMessageForAllTabs('updateOptions');
        lingualeo.updateExtensionOptionsForBackgroundPage();
    },


    sendMessageForAllTabs: function (msgName) {
        kango.browser.tabs.getAll(function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].dispatchMessage(msgName);
            }
        });
    },


    // Shows changelog if the extension has been updated or just installed
    checkExtensionVersion: function () {
        if (!kango.storage.getItem('version')) {
    		window.setTimeout(function () {
    			kango.ui.optionsPage.open('changelog');

    			// Safari cookie fix: open page and unlock setting cookies through XHR
    			var userAgent = window.navigator.userAgent.toLowerCase();
                if (/webkit/.test(userAgent) && !/chrome/.test(userAgent)) {
    				kango.browser.tabs.create({url: lingualeo.config.domain, focused: false});
    			}
    		}, 500);
        }
        kango.storage.setItem('version', kango.getExtensionInfo().version);
    },


    disableWizards: function () {
        lingualeo.setExtensionOptions({
            wizardsEnabled: false
        });

    },


    setTranslationImage: function (originalText, imageUrl) {
        if (imageUrl) {
            lingualeo.translationImageUrls[originalText] = imageUrl;
        }
        return imageUrl;
    },


    getTranslationImageUrl: function (originalText) {
        return originalText ? lingualeo.translationImageUrls[originalText] : null;
    },


    getNativeLang: function () {
        return lingualeo.getUserData('lang_native') || kango.i18n.getCurrentLocale();
    },


    isUserHasAccount: function () {
        return !!lingualeo.getUserData()['nickname'];
    },


    loginUser: function (username, pass, callback) {
        lingualeo.server.login(username, pass, function (result) {
            if (!result.error_msg) {
                lingualeo.moveCookiesToBHO();
                lingualeo.setUserData(result['user']);
                lingualeo.ext.setAuthState(true);
                lingualeo.updateUntrainedWordsCounter();
                lingualeo.syncLocalDictionary();
            }
            callback(result);
        });
    },


    loadUserData: function () {
        if (lingualeo.isAuth) {
            lingualeo.server.getUserData(function (result) {
                if (!result.error_msg) {
                    lingualeo.setUserData(result['user']);
                }
            });
        }
    },


    setUserData: function (userData) {
        if (typeof userData === 'object') {
            var userStorageData = lingualeo.config.userStorageData;
            for (var fieldName in userStorageData) {
                if (userStorageData.hasOwnProperty(fieldName)) {
                    if (fieldName in userData) {
                        kango.storage.setItem(lingualeo.config.userStorageDataPrefix + fieldName, userData[fieldName]);
                        if (userStorageData[fieldName].broadcastMessage) {
                            lingualeo.sendMessageForAllTabs(userStorageData[fieldName].broadcastMessage);
                        }
                    }
                }
            }
            lingualeo.userName = userData['fname'] || userData['nickname'];
            lingualeo.server.setUserLocale(lingualeo.getNativeLang());
        }
    },


    getUserData: function (fieldNames) {
        if (typeof fieldNames === 'string') {
            return kango.storage.getItem(lingualeo.config.userStorageDataPrefix + fieldNames);
        }
        var data = {};
        var userStorageData = lingualeo.config.userStorageData;
        for (var fieldName in userStorageData) {
            if (userStorageData.hasOwnProperty(fieldName)) {
                data[fieldName] = kango.storage.getItem(lingualeo.config.userStorageDataPrefix + fieldName);
            }
        }
        return data;
    },


    clearUserData: function () {
        var userStorageData = lingualeo.config.userStorageData;
        for (var fieldName in userStorageData) {
            if (userStorageData.hasOwnProperty(fieldName) && !userStorageData[fieldName].persistent) {
                kango.storage.removeItem(lingualeo.config.userStorageDataPrefix + fieldName);
            }
        }
    },


    checkAuthorization: function (callback) {
        lingualeo.ext.setAuthState(false);
        lingualeo.ext.setStateHints(kango.i18n.getMessage('stateAuthorization'), '...');
        lingualeo.server.checkAuthorization(
            true,
            function (isAuthorized) {
                lingualeo.ext.setAuthState(isAuthorized);
                lingualeo.updateUntrainedWordsCounter();
                lingualeo.loadUserData();
                if (isAuthorized) {
                    lingualeo.syncLocalDictionary();
                }
                if (callback) {
                    callback(isAuthorized);
                }
            },
            function () {
                lingualeo.ext.setAuthState(false);
                if (callback) {
                    callback(false);
                }
            }
        );
    },


    syncLocalDictionary: function () {
        if (lingualeo.isAuth && lingualeo.localDictionary.getTranslationsCount()) {
            lingualeo.server.setWordTranslationMultiple(
                lingualeo.localDictionary.getTranslationsAsArray(),
                function () {
                    lingualeo.localDictionary.clearTranslations();
                },
                function (error_msg, result, status) {
                    if (result.error_code && result.error_code !== 12) {  // do not handle for "No meatballs" error
                        lingualeo.ext.showNotification({
                            title: kango.i18n.getMessage('errorSyncingDictionary'),
                            text: 'Error code: ' + result.error_code + '. Response status: ' + status,
                            forceShowing: true
                        });
                    }
                }
            );
        }
    },


    getHistoryHtml: function () {
        return lingualeo.history.getHistoryHtml();
    },


    clearHistory: function () {
        return lingualeo.history.clearHistory();
    },


    translateWithGoogle: function (originalText, langFrom, langTo, callback) {
        lingualeo.server.translateCustomText(originalText, langFrom, langTo, function (response) {
            if (response.error || !response.translation) {
                callback({
                    error: true,
                    error_msg: kango.i18n.getMessage('translationErrorMessage'),
                    error_code: response.error_code
                });
            }
            else {
                callback(response);
            }
        });
    },


    getTranslations: function (originalText, context, callback) {
        if (originalText.length > lingualeo.config.maxTextLengthToTranslate) {
            lingualeo.ext.showNotification({
                title: kango.i18n.getMessage('textTooLong'),
                text: kango.i18n.getMessage('mustBeLessThan').replace(/\$1/, '' + lingualeo.config.maxTextLengthToTranslate),
                forceShowing: true
            });
            callback({error: true, error_msg: kango.i18n.getMessage('textTooLong')});
        }
        else {
            lingualeo.server.loadTranslations(
                originalText,
                function (result) { // success
                    //lingualeo.history.addItem(originalText, null, context, null, null);
                    callback({
                        context: context,
                        //inDictionary: null,              // todo: fix this later
                        originalText: originalText,
                        word_forms: result.word_forms,
                        translations: result.translate,
                        transcription: result.transcription,
                        soundUrl: ('' + result.sound_url).replace('http://', 'https://'),
                        picUrl: lingualeo.setTranslationImage(originalText, (result.pic_url || '').replace('http://', 'https://'))  // fix: convert to SLL on client-side
                    });
                },
                function (error_msg, result, status) { // error
                    callback({
                        error: true,
                        error_msg: error_msg,
                        error_code: result ? result.error_code : null,
                        status: status
                    });
                }
            );
        }
    },


    setWordTranslation: function (originalText, translatedText, context, pageUrl, pageTitle, isShowNotification, callback) {
        if (lingualeo.isAuth) {
            lingualeo.server.setWordTranslation(
                originalText,
                translatedText,
                context,
                pageUrl,
                pageTitle,
                function () {
                    lingualeo.history.addItem(originalText, translatedText, context, pageUrl, pageTitle);
                    if (isShowNotification !== false) {
                        lingualeo.ext.showNotificationForTranslation(originalText, translatedText, false, function () {
                            lingualeo.openDictionaryPage(originalText);
                        });
                    }
                    lingualeo.updateUntrainedWordsCounter(10 * 60 * 1000);
                    if (callback) {
                        callback(true);
                    }
                },
                function (error_msg, result /*, status*/) {
                    // todo add error_code === 401/402 for anonymous user, forward to local dictionary method
                    // if (result.error_code === 401 || result.error_code === 402) {
                    if (callback) {
                        callback(false);
                    }
                }
            );
        }
        else {
            if (lingualeo.localDictionary.getTranslationsCount() < lingualeo.config.localDictionaryMaxWordsCount) {

                lingualeo.localDictionary.addTranslation(originalText, translatedText, context, pageUrl, pageTitle);
                lingualeo.history.addItem(originalText, translatedText, context, pageUrl, pageTitle);

                if (isShowNotification !== false) {
                    lingualeo.ext.showNotification({
                        title: kango.i18n.getMessage('dictUpdated'),
                        text: originalText + ' — ' + translatedText,
                        originalText: originalText,
                        forceShowing: false,
                        handler: function () {
                            lingualeo.openLinguaLeoPage('registerViaExtension', {utm_campaign: 'notification'});
                        }
                    });
                }
                if (callback) {
                    callback(true);
                }
            }
            else {
                kango.browser.tabs.getCurrent(function (tab) {
                    if (!tab.dispatchMessage('showLocalDictionaryLimitDialog') || (tab._tab  &&
                        (tab._tab.url.indexOf('chrome-extension://') === 0 || tab._tab.url.indexOf('chrome://') == 0))
                    ) {
                        lingualeo.ext.showNotification({
                            title: kango.i18n.getMessage('registrationRequired_Title1'),
                            text: kango.i18n.getMessage('notificationTitleSignIn'),
                            forceShowing: true,
                            handler: function () {
                                lingualeo.openLinguaLeoPage('registerViaExtension', {utm_campaign: 'notification'});
                            }
                        });
                    }
                });
                if (callback) {
                    callback(false);
                }
            }
        }
    },


    updateUntrainedWordsCounter: function (customTimeout) {
        if (lingualeo.untrainedTimer) {
            clearTimeout(lingualeo.untrainedTimer);
            lingualeo.untrainedTimer = null;
        }
        if (lingualeo.isAuth) {
            if (lingualeo.currentOptions.showUntrainedWordsCount) {
                lingualeo.server.getUntrainedWordsCount(function (result) {
                    if (lingualeo.isAuth) {
                        lingualeo.ext.setUntrainedWordsCount(result.count);
                    }
                });
                kango.storage.setItem('lastUntrainedWordsCountUpdate', new Date().getTime());
                lingualeo.untrainedTimer = setTimeout(
                    lingualeo.updateUntrainedWordsCounter,
                    customTimeout || lingualeo.config.untrainedWordsCheckingTimeout
                );
            }
            else {
                // Hide words counter
                lingualeo.ext.setUntrainedWordsCount(null);
            }
        }
    },


    initContextMenu: function () {
        lingualeo.contextMenu.createTranslationItem(function () {
            kango.browser.tabs.getCurrent(function (tab) {
                tab.dispatchMessage('getContext');
            });
        });
        lingualeo.contextMenu.setTranslationItemVisibility(true);
        //lingualeo.contextMenu.createLoginItem(lingualeo.showLoginDialog);
        //lingualeo.contextMenu.setLoginItemVisibility(false);
        //lingualeo.contextMenu.setReadabilityItemVisibility(false);
    },

    toggleContextMenu: function (isVisible) {
        lingualeo.contextMenu.setTranslationItemVisibility(isVisible);
    },

    assignServerEvents: function () {
        lingualeo.server.responseStatusErrorHandler = function (status, isSilentError) {
            var text;
            var title = kango.i18n.getMessage('error');

            if (status == 404 || status == 0) {
                title = kango.i18n.getMessage('error404');
                text = kango.i18n.getMessage('errorNoConnection');
            }
            else if (status == 503) {
                // Force error showing when the server is being updated
                isSilentError = false;
                title = kango.i18n.getMessage('error503');
                text = kango.i18n.getMessage('serverUpdating');
            }
            else {
                // Reset authorization state, so next time user will be asked to login
                title = kango.i18n.getMessage('responseCode').replace(/\$1/, '' + status);
                text = kango.i18n.getMessage('errorNoConnection');
            }

            if (!isSilentError) {
                lingualeo.ext.showNotification({
                    title: title,
                    text: text
                });
            }
        };

        lingualeo.server.responseErrorHandler = function (errorMsg, errorCode, isSilentError) {
            if (errorCode === 12) {
                kango.browser.tabs.getCurrent(function (tab) {
                    if (!tab.dispatchMessage('showNoMeatballsDialog') || (tab._tab  &&
                        (tab._tab.url.indexOf('://lingualeo.com') > 0
                         || tab._tab.url.indexOf('chrome-extension://') === 0
                         || tab._tab.url.indexOf('chrome://') == 0))
                    ) {
                        lingualeo.ext.showNotification({
                            title: kango.i18n.getMessage('noMeatballs'),
                            text: kango.i18n.getMessage('noMeatballsText'),
                            hideTimeout: 60000,
                            handler: function () {
                                lingualeo.openLinguaLeoPage('meatballs');
                            },
                            forceShowing: true
                        });
                    }
                });
            }
            else {
                if (!isSilentError) {
                    lingualeo.ext.showNotification({
                        title: kango.i18n.getMessage('error'),
                        text: errorMsg,
                        forceShowing: true
                    });
                }
            }
        };
    },


    showSiteNotifications: function (notificationsArray) {
        for (var i = 0; i < notificationsArray.length; i++) {
            (function (itemData) {
                var itemUrl = itemData['notification_url'];
                var notificationTitle = itemData['notification_header'];
                var data = {
                    forceShowing: false,
                    text: itemData['notification_text'],
                    title: notificationTitle,
                    mainImageUrl: itemData['notification_pic_url'],
                    url: 'http:' + itemUrl + (itemUrl.indexOf('?') > -1 ? '&' : '?') +
                         'utm_source=ll_plugin&utm_medium=referral&utm_campaign=notification&utm_content=' + notificationTitle
                };
                lingualeo.ext.showNotification(data, function () {
                    kango.browser.tabs.create({url: data.url});
                });
            })(notificationsArray[i]);
        }
    },


    checkSiteNotifications: function () {
        var interval = 60 * 60000; // every hour
        if (lingualeo.isAuth && lingualeo.currentOptions.showBrowserPopups && lingualeo.currentOptions.showSiteNotifications) {
            var lastCheckTime = kango.storage.getItem('lastSiteNotificationsCheck') || 0;
            var currentTime = new Date().getTime();
            if (currentTime - lastCheckTime > interval) { // if more than 1 hour
                kango.storage.setItem('lastSiteNotificationsCheck', currentTime);
                var user_id = lingualeo.getUserData('user_id');
                if (user_id) {
                    lingualeo.server.checkSiteNotifications(user_id, function (result) {
                        if (lingualeo.isAuth && result['notification'] && result['notification'].length) {
                            lingualeo.showSiteNotifications(result['notification']);
                        }
                    });
                }
            }
        }
        window.setTimeout(lingualeo.checkSiteNotifications, interval);
    },


    approveYoutubeCaptionsInfo: function (captionsInfoUrl, callback) {
        lingualeo.server.getYoutubeCaptionsInfo(captionsInfoUrl, function (result) {
            callback(!!(result.text && /lang_code="en"/gi.test(result.text)));
        });
    },


    exportYoutubeContent: function (contentUrl, callback) {
        // todo how to detect content genre? Set a default value for now.
        var genreId = lingualeo.config.defaultExportedYoutubeContentGenre;
        lingualeo.server.exportYoutubeContentToJungle(contentUrl, genreId, callback);
    },


    init: function () {
        lingualeo.config = new LinguaLeoConfig();
        //lingualeo.tracer = new LinguaLeoTracer();
        lingualeo.ext = new LinguaLeoExt();
        lingualeo.localDictionary = new LinguaLeoLocalDictionary();
        lingualeo.history = new LinguaLeoHistory();
        lingualeo.defaultOptions = new LinguaLeoDefaultOptions();
        lingualeo.contextMenu = new LinguaLeoContextMenu();
        lingualeo.initContextMenu();

        lingualeo.nodeWordsWrapper = new NodeWordsWrapper();
        lingualeo.server = new LingualeoServer(lingualeo.config.api, lingualeo.getNativeLang());
        lingualeo.assignServerEvents();

        lingualeo.updateExtensionOptionsForBackgroundPage();
        lingualeo.checkExtensionVersion();
        lingualeo.setExtensionCookie();
        lingualeo.checkAuthorization();


        //***********************************************************************************//
        //*** Url changes handling                                                        ***//
        //***********************************************************************************//
        kango.browser.addEventListener(kango.browser.event.DOCUMENT_COMPLETE, function (event) {
            var domainRegex = /^.*\/\/([^\/]+).*$/i;
            var documentDomain = event.url.replace(domainRegex  , '$1');
            var llDomain = lingualeo.config.domain.replace(domainRegex  , '$1');

            // Reset extension local DB
            if (event.url.indexOf('ll_reset_extension') > 0) {
                kango.storage.clear();
            }

            // Automatically check authorization when on LinguaLeo website
            if (documentDomain === llDomain) {
                lingualeo.setExtensionCookie();
                kango.browser.cookies.getCookies('http://' + documentDomain, function (cookies) {
                    var isUserLoggedIn = false;
                    for (var i = 0; i < cookies.length; i++) {
                        if (cookies[i] /* can be null somehow */ && cookies[i].name === 'remember') {
                            isUserLoggedIn = true;
                            break;
                        }
                    }
                    if (isUserLoggedIn != lingualeo.isAuth) {
                        window.setTimeout(lingualeo.checkAuthorization, 100);
                    }
                });
            }
        });


        kango.ui.browserButton.setCaption('LinguaLeo');
        //kango.lingualeo = lingualeo;

        // Do the first website notification check at least in 5 min after startup
        window.setTimeout(lingualeo.checkSiteNotifications, 5 * 60000);
    }
};


lingualeo.init();
