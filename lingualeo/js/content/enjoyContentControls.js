/** @preserve
// ==UserScript==
// @name LinguaLeoEnjoyContentControls
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


var LinguaLeoEnjoyContentControls = function (showTimeout) {

    var handlerOnClose;

    var isEnjoyContentControlsHidden = false;
    var rootElement;
    var ecControlsEnabled = true;
    var ecControlsTimer;


    /**************************************************/

    function doInit () {
        // If "Enjoy content!" controls have been hidden once --> do not show them anymore in this session
        if (isEnjoyContentControlsHidden) {
            return;
        }

        kango.invokeAsync('window.lingualeo.getExtensionOptions', function (options) {
            if (options.enjoyContentControlsEnabled) {
                lingualeoHelper.getTemplate('help/enjoyContentControlsStyle', function (css) {
                    cssHelper.addCss(css, 'enjoyContentControls');
                });
                lingualeoHelper.getTemplate('help/enjoyContentControls', function (template) {
                    domHelper.appendHtmlToElement(domHelper.getBody(), template);
                    rootElement = document.getElementById('lleo_enjoyContentControls');
                    assignEvents();

                    // Inject custom css to adjust control size according to localized inner content
                    var width = document.getElementById('lleo_enjoyContentLabel').offsetWidth + 60 + 'px !important';
                    cssHelper.addCss('#lleo_enjoyContentControls:hover {width: ' + width + '}');

                    // Show controls
                    setTimeout(function () {
                        cssHelper.addClass(rootElement, 'lleo_show');
                    }, showTimeout || 10);
                });

            }
        });
    }


    function assignEvents () {
        Event.add(rootElement, 'mouseenter', handlerMouseEnter);
        Event.add(rootElement, 'mouseleave', handlerMouseLeave);
        Event.add(document.getElementById('lleo_enjoyContentButton'), 'click', handlerButtonClick);
        Event.add(document.getElementById('lleo_enjoyContentCheckbox'), 'click', handlerCheckboxClick);
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    function doClose () {
        if (rootElement) {
            domHelper.removeChild(rootElement);
            rootElement = null;

            if (handlerOnClose) {
                handlerOnClose();
            }
            handlerOnClose = null;
        }
    }


    function doAssignOnCloseHandler (handler) {
        handlerOnClose = handler;
    }


    /**********************************************************************************/
    /*** Handlers                                                                   ***/
    /**********************************************************************************/

    function handlerButtonClick (event) {
        event.stopPropagation();
        doClose();
        setTimeout(llContent.tryToSimplifyPage, 0);
    }


    function handlerCheckboxClick (event) {
        event.stopPropagation();
        ecControlsEnabled = event.target.checked;
        kango.invokeAsync(
            'window.lingualeo.setExtensionOptions',
            {enjoyContentControlsEnabled: ecControlsEnabled}
        );
    }


    function handlerMouseLeave (event) {
        event.stopPropagation();
        if (!ecControlsEnabled) {
            cssHelper.addClass(rootElement, 'lleo_hiding');
            ecControlsTimer = setTimeout(doClose, 3000);
        }
    }


    function handlerMouseEnter (event) {
        event.stopPropagation();
        cssHelper.removeClass(rootElement, 'lleo_hiding');
        if (ecControlsTimer) {
            clearTimeout(ecControlsTimer);
            ecControlsTimer = null;
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
        assignOnCloseHandler: doAssignOnCloseHandler
    }

};