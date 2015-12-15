/** @preserve
// ==UserScript==
// @name LinguaLeoConfig
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


var LinguaLeoConfig = function () {

    var IS_DEBUG = false;


    var LL_DOMAIN = 'lingualeo.com';
    try {
        if (typeof localStorage !== 'undefined') {
            LL_DOMAIN = localStorage.getItem('domain') || LL_DOMAIN;
        }
    } catch (e) {}


    var cdnHost = 'https://d144fqpiyasmrr.cloudfront.net';
    var apiHost =  'http://api.' + LL_DOMAIN;


    return {

        debug: IS_DEBUG,
        domain: 'http://' + LL_DOMAIN,
        api: apiHost,

        modules: {
            llLyrics: true,
            llYoutube: false,
            llSimplified: true
        },

        path: {
            root: '?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=popup',
            login: '/login?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=options',
            profile: '/profile?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=logindialog',
            registerViaExtension: '?utm_source=ll_plugin&utm_medium=plugin',
            meatballs: '/meatballs?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=nomeatballsdialog',
            dictionaryFromInternet: '/glossary/learn/internet?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=simplifiedcontent#{originalText}',
            forgotPass: '/password/forgot?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=logindialog',
            goldStatus: '/gold?utm_source=ll_plugin&utm_medium=plugin&utm_campaign=wizardmanager',
            youtubeExport: '/content/addVideoContent',
            images: cdnHost + '/plugins/all/images',
            audio_player: cdnHost + '/plugins/all/flash/1.html#sound='
        },
		
        ajax: {
            isAuth: '/isauthorized',
            login: '/api/login',
            addWordToDict: '/addword',
            addWordToDictMultiple: '/addwords',
            translate: '/translate.php',
            getTranslations: '/gettranslates',
            setChromeHideCookie: '/setChromeHideCookie',
            getUntrainedWordsCount: '/getUntrainedWordsCount',
			checkSiteNotifications: apiHost + '/user/{user_id}/notifications/unread',
            youtubeCaptionsInfo: 'http://www.youtube.com/api/timedtext?type=list&v={id}'
        },


        // User data that's stored locally
        userStorageDataPrefix: 'user_',
        userStorageData: {
            user_id: {},
            fname: {},
            nickname: {
                persistent: true
            },
            avatar: {},
            avatar_mini: {},
            lang_native: {
                persistent: true,
                broadcastMessage: 'nativeLanguageUpdated'
            },
            lang_interface: {
                persistent: true,
                broadcastMessage: 'localeMessagesUpdated'
            }
        },


        notificationTimeout: 6000,

        maxTextLengthToTranslate: 255,
        simplifiedContentMaxWidth: 800,
        simplifiedContentBlurBackground: false,
        defaultExportedYoutubeContentGenre: 12,
        untrainedWordsCheckingTimeout: 2 * 60 * 60000, // 2 hours

        languageDetectionTimeout: 6000,
        localDictionaryMaxWordsCount: IS_DEBUG ? 2 : 20
    };
};
