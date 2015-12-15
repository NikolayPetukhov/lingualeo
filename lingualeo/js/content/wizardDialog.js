/** @preserve
// ==UserScript==
// @name LinguaLeoWizardDialog
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

var LinguaLeoWizardDialog = function (data) {

    var handlerOnClose;

    var uid = Math.random() + Math.random() * 10;
    var dialogData = data;
    var rootElement = null;
    var traceTimer;
    var traceSourceElement;
    var tracePointElements;
    var tracePointCount = 40;


    /**************************************************/

    function doInit () {
        // Set templates names
        var templateNames = ['content/wizardDialog'].concat(dialogData.slides);

        // Load css
        lingualeoHelper.getTemplate('content/wizardDialogStyle', function (html) {
            cssHelper.addCss(html, 'wizardDialog');
        });

        // Load html
        lingualeoHelper.getTemplates(templateNames, true, function (htmls) {
            // Proceed templates
            var html = stringHelper.formatStrExt(htmls['content/wizardDialog'], {
                UID: uid,
                isBig: dialogData['isBig'],
                isStyle2: dialogData['isStyle2'],
                slide1: htmls[dialogData.slides[0]],
                slide2: htmls[dialogData.slides[1]]
            });

            // Create DOM
            domHelper.appendHtmlToElement(domHelper.getBody(), html);
            rootElement = document.getElementById('lleo_wizardDialog' + uid);
            Event.add(rootElement, 'click', handlerClick);

            // Show dialog
            setTimeout(function() {
                cssHelper.addClass(rootElement, 'lleo_show');
                if (data.traceTargetElement && (traceSourceElement = rootElement.querySelector('[data-trace-pointer="yes"]'))) {
                    createTrace();
                }
                if (dialogData.onShow) {
                    dialogData.onShow();
                }
            }, 0)
        });

        return this;
    }


    function removeDialog () {
        domHelper.removeChild(rootElement);
        rootElement = null;
        data = null;
    }


    function createTrace () {
        var html = [];
        var endSize = 3;
        var startSize = 15;
        var deltaSize = (startSize - endSize) / tracePointCount;
        for (var i = 0; i < tracePointCount; i++) {
            html.push('<div class="lleo_tracePoint" style="width:' + parseInt(endSize + deltaSize * i) +
            'px !important;height:' + parseInt(endSize + deltaSize * i) + 'px !important"></div>');
        }
        domHelper.appendHtmlToElement(domHelper.getBody(), html.join(''));
        tracePointElements = Array.prototype.slice.call(document.getElementsByClassName('lleo_tracePoint'), 0);
        updateTrace();
        Event.add(window, 'scroll', updateTrace);
    }


    function updateTrace () {
        var scrollOffset = sizeHelper.scrollOffset();
        var targetOffset = sizeHelper.getOffset(data.traceTargetElement);
        targetOffset.left = targetOffset.left + data.traceTargetElement.offsetWidth - scrollOffset.left;
        targetOffset.top = targetOffset.top - scrollOffset.top;

        var sourceOffset = sizeHelper.getOffsetSum(traceSourceElement);
        sourceOffset.left += traceSourceElement.offsetWidth / 2;
        sourceOffset.top += traceSourceElement.offsetHeight / 2;

        var m = (sourceOffset.top - targetOffset.top) / (sourceOffset.left - targetOffset.left);
        var deltaX = (targetOffset.left - sourceOffset.left) / tracePointElements.length;

        var getY = function (x) {
            return m * (x - targetOffset.left) + targetOffset.top;
        };

        for (var i = 0, elem; elem = tracePointElements[i]; i++) {
            elem.style.left = sourceOffset.left + deltaX * i + 'px';
            elem.style.top = getY(sourceOffset.left + deltaX * i) + 'px';
        }
        traceTimer = null;
    }


    function removeTrace () {
        if (traceSourceElement) {
            Event.remove(window, 'scroll', updateTrace);
            for (var i = 0, elem; elem = tracePointElements[i]; i++) {
                domHelper.removeChild(elem);
            }
            tracePointElements = null;
            traceSourceElement = null;
        }
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    function doAssignOnCloseHandler (handler) {
        handlerOnClose = handler;
    }


    function doClose () {
        if (!lingualeoHelper.isTopWindow()) {
            return;
        }

        cssHelper.addClass(rootElement, 'lleo_hide');
        cssHelper.removeClass(rootElement, 'lleo_nextStep');
        if (dialogData && dialogData.onClose) {
            dialogData.onClose();
        }
        if (handlerOnClose) {
            handlerOnClose();
        }
        dialogData = null;
        removeTrace();
        setTimeout(removeDialog, 1000);
    }


    function doGetRootElement () {
        return rootElement;
    }


    /**********************************************************************************/
    /*** Handlers                                                                   ***/
    /**********************************************************************************/

    function handlerClick (event) {
        var actionPage = event.target.getAttribute('data-action-page');
        if (actionPage) {
            kango.invokeAsync('window.lingualeo.openLinguaLeoPage', actionPage);
            if (dialogData.onActionPage) {
                dialogData.onActionPage(actionPage);
            }
            doClose();
        }
        else {
            var action = event.target.getAttribute('data-action');
            if (action === 'next') {
                cssHelper.addClass(rootElement, 'lleo_nextStep');
                if (dialogData.onNext) {
                    dialogData.onNext();
                }
            }
            else if (action === 'close') {
                doClose();
            }
            else if (action) {
                if (dialogData.onAction) {
                    dialogData.onAction(action);
                }
                doClose();
            }
        }
    }


    /**********************************************************************************/
    /*** Initialization                                                             ***/
    /**********************************************************************************/

    doInit();


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {
        close: doClose,
        getRootElement: doGetRootElement,
        assignOnCloseHandler: doAssignOnCloseHandler
    }

};
