/** @preserve
// ==UserScript==
// @name LinguaLeoLyrics
// @all-frames true
// @include http*://vk.com/*
// ==/UserScript==
**/

llLyrics = function () {

    var urlTimer;
    var templates;
    var isPagePrepared = false;


    /**************************************************/

    function doInit () {
        lingualeoHelper.getTemplates(
            ['content/lyricsBrand', 'content/lyricsBrandStyle'],
            false,
            function (_templates) {
                templates = _templates;
            }
        );

        Event.add(document, 'DOMNodeInserted', function (e) {
            if (e.target.nodeType === Node.TEXT_NODE &&
                e.target.parentNode &&
                cssHelper.hasClass(e.target.parentNode, 'lyrics') &&
                !e.target.parentNode.hasAttribute('data-lleo-lyrics'))
            {
                waitForContentAddition(e.target.parentNode);
            }
        });

        Event.add(document, 'DOMNodeRemoved', function (e) {
            if (e.target.nodeType === Node.TEXT_NODE &&
                e.target.parentNode &&
                e.target.parentNode.getAttribute('data-lleo-lyrics') === 'yes')
            {
                waitForContentRemoving(e.target.parentNode);
            }
        });

        urlTimer = setInterval(handlerUrlChange, 4000);
    }


    function preparePage () {
        cssHelper.addCss(templates['content/lyricsBrandStyle']);
        Event.add(document, 'click', handlerContentClick);
    }


    function waitForContentAddition (element) {
        var id = element.id;
        if (!id) {
            return;
        }

        // "Lock" element
        element.setAttribute('data-lleo-lyrics', 'waiting');
        cssHelper.addClass(element, 'lleo_lyrics');

        // Parse content after a while
        setTimeout(function () {
            var elem = document.getElementById(id);
            if (elem) {
                kango.invokeAsyncCallback('window.lingualeo.isContentInEnglish', elem.innerHTML, function (isEnglish) {
                    if (isEnglish) {
                        kango.invokeAsyncCallback('window.lingualeo.getClickableContent', elem.innerHTML, function (html) {
                            elem.innerHTML = templates['content/lyricsBrand'] + html;
                            elem.setAttribute('data-lleo-lyrics', 'yes');
                        });

                        // Assign common events only once
                        if (!isPagePrepared) {
                            preparePage();
                            isPagePrepared = true;
                        }

                    }
                });
            }
        }, 500);
    }


    function waitForContentRemoving (element) {
        element.setAttribute('data-lleo-lyrics', 'removing');
        setTimeout(function () {
            element.removeAttribute('data-lleo-lyrics');
            cssHelper.removeClass(element, 'lleo_lyrics');
        }, 100);
    }


    /**********************************************************************************/
    /*** Handlers                                                                   ***/
    /**********************************************************************************/

    function handlerContentClick (event) {
        if (event.target.tagName === 'TRAN') {
            selectionHelper.selectNode(event.target);
            llContent.showDialogForCurrentSelection(null, false);
            return false;
        }
        return true;
    }


    function handlerUrlChange () {
        if (window.location.href.indexOf('vk.com/audios') > -1) {
            clearInterval(urlTimer);
            LinguaLeoWizardManager.activateWizard('vkLyrics', 0, function (isActivated) {
                if (isActivated) {
                    var linksElems = document.querySelectorAll('.audio_table .title a');
                    for (var i = 0; i < linksElems.length; i++) {
                        if (!/[а-я]/i.test(linksElems[i].textContent)) {
                            cssHelper.addClass(linksElems[i], 'lleo_songName');
                        }
                    }
                }
            });
        }
        return true;
    }


    /**********************************************************************************/
    /*** Initialization                                                             ***/
    /**********************************************************************************/

    doInit();

}();