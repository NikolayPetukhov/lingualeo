/** @preserve
// ==UserScript==
// @name LinguaLeoWizardManager
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


/**********************************************************************************/
/***                                                                            ***/
/*** LinguaLeoWizard                                                            ***/
/***                                                                            ***/
/**********************************************************************************/

var LinguaLeoWizard = function (wizardData) {

    var handlerOnClose;
    var data = wizardData;

    var object = wizardData.create();
    object.assignOnCloseHandler(handlerOnCloseObject);


    /**************************************************/

    function doGetData () {
        return data;
    }


    function doAssignOnCloseHandler (handler) {
        handlerOnClose = handler;
    }


    function doClose () {
        object.close();
    }


    function handlerOnCloseObject () {
        if (wizardData && wizardData.close) {
            wizardData.close();
        }
        if (handlerOnClose) {
            handlerOnClose();
        }
        data = null;
    }


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {
        close: doClose,
        getData: doGetData,
        assignOnCloseHandler: doAssignOnCloseHandler
    }

};


/**********************************************************************************/
/***                                                                            ***/
/*** LinguaLeoWizardManager                                                     ***/
/***                                                                            ***/
/**********************************************************************************/

var LinguaLeoWizardManager = (function () {

    var currentWizard;
    var wizardOptions = {
        wizards: {}
    };


    var wizardsData = (function () {

        var _data = {
            meatballsLimit: {
                canDisableByCommonDisabling: false,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/meatballs-slide1', 'help/meatballs-slide2'],
                        isBig: true
                    });
                }
            },


            localDictionaryLimit: {
                independent: true,
                canDisableByCommonDisabling: false,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/localDictionaryLimit-slide1'],
                        isBig: true,
                        onAction: function (action) {
                            if (action === 'signin') {
                                kango.invokeAsync('window.lingualeo.showLoginDialog');
                            }
                            else if (action === 'signup') {
                                kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'registerViaExtension', {utm_campaign: 'dictionary-limit-dialog'});
                            }
                        }
                    });
                }
            },


            enjoyContentWelcome: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/enjoyContentWelcome-slide1', 'help/enjoyContentWelcome-slide2'],
                        onAction: function (action) {
                            if (action === 'enableEnjoyContent') {
                                llContent.tryToSimplifyPage();
                            } else if (action === 'disableWizards') {
                                LinguaLeoWizardManager.deactivateWizard('enjoyContentWelcome');
                                kango.invokeAsync('window.lingualeo.disableWizards');
                            }
                        }
                    });
                }
            },


            enjoyContentExplain: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        isStyle2: true,
                        slides: ['help/enjoyContentExplain-slide1', 'help/enjoyContentExplain-slide2']
                    });
                }
            },


            enjoyContentNoContent: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        isStyle2: true,
                        slides: ['help/enjoyContentExplainNoContent-slide1', 'help/enjoyContentExplainNoContent-slide2']
                    });
                }
            },


            enjoyContentControlsExplain: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/enjoyContentControlsExplain-slide1']
                    });
                }
            },


            enjoyContentControls: {
                independent: true,
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoEnjoyContentControls();
                },
                close: function () {
                    LinguaLeoWizardManager.deactivateWizard('enjoyContentControls');
                    LinguaLeoWizardManager.deactivateWizard('enjoyContentControlsExplain');
                }
            },


            vkLyrics: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/vkLyrics-slide1']
                    });
                }
            },


            youtubeExport: {
                canDisableByCommonDisabling: true,
                create: function () {
                    return new LinguaLeoWizardDialog({
                        slides: ['help/youtubeExport-slide1'],
                        traceTargetElement: document.getElementById('lleo_youtubeExportBtn')
                    });
                },
                close: function () {
                    domHelper.removeChild(document.getElementById('lleo_exportArrow'));
                }
            }

        };

        /***------------------------------------****/
        for (var wizardName in _data) {
            if (_data.hasOwnProperty(wizardName)) {
                _data[wizardName].name = wizardName;
            }
        }
        /***-----------------------------------****/

        return _data;

    })();


    /**********************************************************************************/
    /*** Common Methods                                                             ***/
    /**********************************************************************************/

    function saveWizardOptions (options) {
        kango.invokeAsync('window.lingualeo.setWizardOptions', options);
    }


    function loadWizardOptions (callback) {
        kango.invokeAsync('window.lingualeo.getWizardOptions', function (_wizardOptions) {
            // Firefox: create a new object for received options to avoid
            // a property access permission error in setWizardEnabled()
            wizardOptions = JSON.parse(JSON.stringify(_wizardOptions)) || wizardOptions;
            if (callback) {
                callback();
            }
        });
    }


    function setWizardEnabled (wizardName, isEnabled) {
        wizardOptions.wizards[wizardName] = {
            isDisabled: !isEnabled
        };
        saveWizardOptions(wizardOptions);
    }


    function canCreateWizard (wizardName) {
        if (wizardName in wizardsData) {
            var alreadyActive = !!wizardsData[wizardName]._wizardObject;
            var wasDisabled = wizardName in wizardOptions.wizards && wizardOptions.wizards[wizardName].isDisabled;
            var canBeShownRightNow = !currentWizard || wizardsData[wizardName].independent;

            return !alreadyActive && !wasDisabled && canBeShownRightNow;
        }
        return false;
    }


    function doCreateWizard (wizardData) {
        if (canCreateWizard(wizardData.name)) {
            var wizard = new LinguaLeoWizard(wizardData);

            wizard.assignOnCloseHandler(function () {
                if (wizard && wizard.getData().canDisableByCommonDisabling) {
                    setWizardEnabled(wizard.getData().name, false);
                }

                if (wizardData._wizardObject === currentWizard) {
                    currentWizard = null;
                }

                wizardData._wizardObject = wizard = null;
            });

            wizardData._wizardObject = wizard;
            if (!wizardData.independent) {
                currentWizard = wizard;
            }
            return true;
        }
        return false;
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    function doActivateWizard (wizardName, timeout, callbackOnActivate) {
        if (!lingualeoHelper.isTopWindow()) {
            return;
        }

        var wizardData = wizardsData[wizardName];

        if (!wizardData || (wizardData.canDisableByCommonDisabling && !llContent.options.wizardsEnabled)) {
            if (callbackOnActivate) {
                callbackOnActivate(false /*not activated*/);
            }
        }
        else {
            setTimeout(function () {
                // Reload wizards options every time before activating a wizard, 'coz another tab could change them
                loadWizardOptions(function () {
                    var isActivated = doCreateWizard(wizardData);
                    if (callbackOnActivate) {
                        callbackOnActivate(isActivated);
                    }
                })
            }, timeout || 0);
        }
        return this;
    }


    function doDeactivateWizard (wizardName) {
        if (!lingualeoHelper.isTopWindow()) {
            return;
        }

        var wizardData = wizardsData[wizardName];
        if (wizardData && wizardData._wizardObject) {
            wizardData._wizardObject.close();
        }
    }


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {
        activateWizard: doActivateWizard,
        deactivateWizard: doDeactivateWizard
    }

})();
