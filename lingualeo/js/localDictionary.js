var LinguaLeoLocalDictionary = function () {

    var keyName = 'localDictionary';
    var data = {};

    /**************************************************/

    function doReadTranslations () {
        try {
            data = JSON.parse(kango.storage.getItem(keyName) || {});
        }
        catch (e) {
            data = {};
        }
    }


    function doAddTranslation (originalText, translatedText, context, pageUrl, pageTitle) {
        doReadTranslations();
        data[originalText] = {
            word: originalText,
            tword: translatedText,
            context: context,
            context_url: pageUrl,
            context_title: pageTitle
        };
        kango.storage.setItem(keyName, JSON.stringify(data));
        return doGetTranslationsCount();
    }


    function doGetTranslations () {
        doReadTranslations();
        return JSON.parse(JSON.stringify(data));
    }


    function doGetTranslationsAsArray () {
        var data = doGetTranslations();
        var words = [];
        for (var originalText in data) {
            if (data.hasOwnProperty(originalText)) {
                words.push(data[originalText]);
            }
        }
        return words;
    }


    function doClearTranslations () {
        kango.storage.removeItem(keyName);
        doReadTranslations();
    }


    function doGetTranslationsCount () {
        doReadTranslations();
        var count = 0;
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                count++;
            }
        }
        return count;
    }



    /**********************************************************************************/
    /*** Initialization                                                             ***/
    /**********************************************************************************/

    doReadTranslations();


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {

        addTranslation: doAddTranslation,
        getTranslations: doGetTranslations,
        getTranslationsAsArray: doGetTranslationsAsArray,
        clearTranslations: doClearTranslations,
        getTranslationsCount : doGetTranslationsCount

    };
};