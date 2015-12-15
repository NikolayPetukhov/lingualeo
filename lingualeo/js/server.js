
var LingualeoServer = function (baseURL, locale) {

    var self = this;
    var userLocale = locale || 'ru';
    var port = kango.getExtensionInfo().settings['port'];
    var extensionVersion = kango.getExtensionInfo().version;
    this.responseStatusErrorHandler = null;
    this.responseErrorHandler = null;


    /**************************************************/

    function sendPostRequest (url, options) {
        sendRequest('POST', lingualeo.addArgumentsToUrl(url, {port: port}), options);
    }


    function sendGetRequest (url, options) {
        sendRequest('GET', url, options);
    }


    function sendRequest (method, url, options) {
		if (typeof options.params === 'undefined' || options.params === null) {
			options.params = {};
        }

        options.params['port'] = port;
        var details = {
            'method': method,
            'url': url,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'LinguaLeo-Version': extensionVersion,
                'X-Accept-Language': userLocale
            },
            'params': options.params
		};

        kango.xhr.send(details, function (data) {
            var result;
            if (data.status !== 200) {
                result = {
                    error: true,
                    error_msg: 'Response status error: ' + data.status
                };
                if (self.responseStatusErrorHandler) {
                    self.responseStatusErrorHandler(data.status, options.isSilentError);
                }
                if (options.onError) {
                    options.onError(result.error_msg, null, data.status);
                }
                if (options.onComplete) {
                    options.onComplete(result);
                }
            }
            else { // status === 200
                if (options.isTextResponse) {
                    result = {text: data.response || ''};
                    if (options.onSuccess) {
                        options.onSuccess(result);
                    }
                    if (options.onComplete) {
                        options.onComplete(result);
                    }
                }
                else {
                    try {
                        result = JSON.parse(data.response);
                    }
                    catch (e) {
                        result = {error_code: 27051983, error_msg: 'Wrong server response.'}
                    }

                    if (result.error_code) {
                        if (self.responseErrorHandler) {
                            self.responseErrorHandler(result.error_msg, result.error_code, options.isSilentError);
                        }
                        if (options.onError) {
                            options.onError(result.error_msg, result, data.status);
                        }
                    }
                    else {

                        if (options.onSuccess) {
                            options.onSuccess(result || {});
                        }
                    }

                    if (options.onComplete) {
                        options.onComplete(result || {});
                    }
                }
            }
		});
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    this.setUserLocale = function (locale) {
        userLocale = locale || 'ru';
    };


    this.loadTranslations = function (originalText, callbackSuccess, callbackError) {
        sendPostRequest(baseURL + lingualeo.config.ajax.getTranslations, {
            isSilentError: false,
            params: {
                word: originalText.replace(/&/g, '%26'),
                include_media: 1,
                add_word_forms: 1
            },
            onSuccess: callbackSuccess,
            onError: callbackError
        });
    };


    this.setWordTranslation = function (originalText, translatedText, context, pageUrl, pageTitle, callbackSuccess, callbackError) {
        sendPostRequest(baseURL + lingualeo.config.ajax.addWordToDict, {
            isSilentError: false,
            params: {
                word: originalText,
                tword: translatedText,
                context: context || '',
                context_url: pageUrl,
                context_title: pageTitle
            },
            onSuccess: callbackSuccess,
            onError: callbackError
        });
    };


    this.setWordTranslationMultiple = function (translations, callbackSuccess, callbackError) {

        var _params = [];
        for (var i = 0, translation; translation = translations[i]; i++) {
            _params['words[' + i + '][word]'] = translation.word;
            _params['words[' + i + '][tword]'] = translation.tword;
            _params['words[' + i + '][context]'] = translation.context;
            _params['words[' + i + '][context_url]'] = translation.context_url;
            _params['words[' + i + '][context_title]'] = translation.context_title;
        }

        sendPostRequest(baseURL + lingualeo.config.ajax.addWordToDictMultiple, {
            isSilentError: true,
            params: _params,
            onSuccess: callbackSuccess,
            onError: callbackError
        });
    };


    this.translateCustomText = function (originalText, langFrom, langTo, callback) {
        sendGetRequest(baseURL + lingualeo.config.ajax.translate, {
            isSilentError: true,
            params: {
                q: encodeURIComponent(originalText),
                source: langFrom,
                target: langTo
            },
            onComplete: callback
        });
    };


    this.checkAuthorization = function (isSilentError, callbackSuccess, callbackError) {
        sendPostRequest(baseURL + lingualeo.config.ajax.isAuth, {
            isSilentError: isSilentError,
            onSuccess: function (result) {
                if (callbackSuccess) {
                    callbackSuccess(result.is_authorized);
                }
            },
            onError: callbackError
        });
    };


    this.getUntrainedWordsCount = function (callbackSuccess, callbackError) {
        sendPostRequest(baseURL + lingualeo.config.ajax.getUntrainedWordsCount, {
            isSilentError: true,
            onSuccess: callbackSuccess,
            onError: callbackError
        });
    };


    this.setCookieWithServer = function (callbackSuccess) {
        sendPostRequest(baseURL + lingualeo.config.ajax.setChromeHideCookie, {
            isSilentError: true,
            onSuccess: callbackSuccess
        });
    };


    this.login = function (username, pass, callback) {
        sendPostRequest(baseURL + lingualeo.config.ajax.login, {
            isSilentError: true,
            params: {
                email: encodeURIComponent(username),
                password: encodeURIComponent(pass)
            },
            onComplete: callback
        });
    };


    this.getUserData = function (callback) {
        sendPostRequest(baseURL + lingualeo.config.ajax.login, {
            isSilentError: true,
            onComplete: callback
        });
    };


    this.checkSiteNotifications = function (user_id, callbackSuccess) {
        var url = lingualeo.config.ajax.checkSiteNotifications.replace('{user_id}', user_id);
        sendGetRequest(url, {
            isSilentError: true,
            onSuccess: callbackSuccess
        });
    };


    this.getYoutubeCaptionsInfo = function (url, callback) {
        sendPostRequest(url, {
            isTextResponse: true,
            onComplete: callback
        });
    };


    this.exportYoutubeContentToJungle = function (url, genreId, callback) {
        sendPostRequest(lingualeo.config.domain + lingualeo.config.path.youtubeExport, {
            params: {
                contentEmbed: url,
                genreId: genreId
            },
            onComplete: callback
        });
    };

};
