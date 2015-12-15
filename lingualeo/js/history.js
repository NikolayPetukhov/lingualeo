var LinguaLeoHistory = function () {

    var MAX_VISIBLE_HISTORY_COUNT = 100;
    var keyName = 'history';
    var data = {
        items: []
    };

    var templates;
    var templateNames = [
        'popup/historyList',
        'popup/historyItem'
    ];


    /**************************************************/


    function doReadHistory () {
        try {
            data = JSON.parse(kango.storage.getItem(keyName) || {});
        }
        catch (e) {
            data = {
                items: []
            };
        }
    }


    function doGetHistoryHtml() {
        doReadHistory();

        if (!data.items.length) {
            return null;
        }

        if (!templates) {
            templates = lingualeo.getTemplates(templateNames, true);
        }

        var itemsHtml = [];
        for (var i = data.items.length-1, cnt = 0, item; (item = data.items[i]) && (cnt++ < MAX_VISIBLE_HISTORY_COUNT); i--) {
            itemsHtml.push(stringHelper.formatStrExt(templates['popup/historyItem'], {
                originalText: item.word.length > 100 ? item.word.substr(0, 50) + '...' : item.word,
                translatedText: item.tword
                                ? item.tword.length > 100 ? item.tword.substr(0, 100) + '...' : item.tword
                                : '...',
                link: lingualeoHelper.getWordArticleUrl(item.word)
            }));
        }

        return stringHelper.formatStr(templates['popup/historyList'], {items: itemsHtml.join('')});
    }


    function doGetItemsCount () {
        doReadHistory();
        return data.items.length;
    }


    function doClearHistory () {
        kango.storage.removeItem(keyName);
        doReadHistory();
    }


    function doAddItem (originalText, translatedText, context, pageUrl, pageTitle) {
        doReadHistory();

        for (var i = 0, il = data.items.length; i < il; i++) {
            if (data.items[i].word === originalText) {
                data.items.splice(i, 1);
                i--;
                il--;
                break;
            }
        }

        data.items.push({
            word: originalText,
            tword: translatedText,
            context: context,
            context_url: pageUrl,
            context_title: pageTitle
        });

        if (data.items.length > MAX_VISIBLE_HISTORY_COUNT) {
            data.items.shift();
        }

        kango.storage.setItem(keyName, JSON.stringify(data));
    }


    /**********************************************************************************/
    /*** Initialization                                                             ***/
    /**********************************************************************************/



    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {

        addItem: doAddItem,
        getItemsCount: doGetItemsCount,
        getHistoryHtml: doGetHistoryHtml,
        clearHistory: doClearHistory

    };
};