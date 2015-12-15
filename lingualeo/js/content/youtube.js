/** @preserve
// ==UserScript==
// @name LinguaLeoYoutube
// @all-frames false
// @include http*://*youtube.com/*
// ==/UserScript==
**/

llYoutube = function () {

    var wizardActivated = false;
    var btnTemplate = '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-default" id="lleo_youtubeExportBtn">' +
                      '<span class="yt-uix-button-icon-wrapper"><i></i></span><span class="yt-uix-button-content">{title}</span></button>';


    /**************************************************/

    function doInit() {
        Event.add(document, 'DOMNodeInserted', handlerNodeInserted);
        Event.add(document, 'DOMNodeRemoved', handlerNodeRemoved);
        injectControls();
    }


    function handlerNodeInserted(event) {
        if (event.target && event.target.id && event.target.id === 'watch7-container') {
            injectControls();
        }
    }

    function handlerNodeRemoved(event) {
        if (event.target && event.target.id && event.target.id === 'watch7-container') {
            if (wizardActivated) {
                LinguaLeoWizardManager.deactivateWizard('youtubeExport');
            }
        }
    }


    function createButton (text) {
        var subscribeBtnElem = document.getElementById('watch7-subscription-container');
        if (subscribeBtnElem) {
            var btnHtml = stringHelper.formatStr(btnTemplate, {title: text});
            domHelper.insertHtmlAsNextElement(subscribeBtnElem, btnHtml);
            document.getElementById('lleo_youtubeExportBtn').onclick = handlerButtonClick;
            return true;
        }
        return false;
    }


    function setButtonText (text) {
        var btnContentElem = document.querySelector('#lleo_youtubeExportBtn .yt-uix-button-content');
        if (btnContentElem) {
            btnContentElem.innerHTML = text;
        }
    }


    function setButtonState (isEnabled) {
        var btnElem = document.getElementById('lleo_youtubeExportBtn');
        if (isEnabled) {
            btnElem.removeAttribute('disabled');
        }
        else {
            btnElem.setAttribute('disabled', 'disabled');
        }
    }


    function getCaptionInfoUrl () {
        var match = window.location.search.match(/v=(.*?)(&|$)/);
        if (match && match[1]) {
            return stringHelper.formatStr(llContent.config.ajax.youtubeCaptionsInfo, {id: match[1]})
        }
        return null;
    }


    function injectControls () {
        if (createButton(i18n.getLocaleMessage('processing'))) {
            setButtonState(false);
            var url = getCaptionInfoUrl();
            if (url) {
                kango.invokeAsyncCallback('window.lingualeo.approveYoutubeCaptionsInfo', url, function (isApproved) {
                    if (isApproved) {
                        setButtonText(i18n.getLocaleMessage('learnOnLinguaLeo'));
                        setButtonState(true);
                    }
                    else {
                        setButtonText(i18n.getLocaleMessage('noSubtitles'));
                    }
                });

                LinguaLeoWizardManager.activateWizard('youtubeExport', 1000, null);
                wizardActivated = true;
            }
            else {
                setButtonText(i18n.getLocaleMessage('noSubtitles'));
            }
        }
    }


    /**********************************************************************************/
    /*** Handlers                                                                   ***/
    /**********************************************************************************/

    function handlerButtonClick () {
        setButtonText(i18n.getLocaleMessage('processing'));
        setButtonState(false);
        kango.invokeAsyncCallback('window.lingualeo.exportYoutubeContent', window.location.href, function(result) {
            if (result.contentUrl) {
                setButtonText(i18n.getLocaleMessage('redirecting'));
                window.location.href = llContent.config.domain + result.contentUrl;
            }
            else {
                setButtonText(i18n.getLocaleMessage('learnOnLinguaLeo'));
                setButtonState(true);
            }
        });
    }


    /**********************************************************************************/
    /*** Expose Methods                                                             ***/
    /**********************************************************************************/


    return {
        init: doInit
    }

}();