/** @preserve
// ==UserScript==
// @name LinguaLeoDialogs
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


var getDialogTemplate = function (dialogId, htmlTemplateId, styleTemplateId, atDefaultPosition) {

    if (!getDialogTemplate.insertedStyles) {
        getDialogTemplate.insertedStyles = {};
    }


    var dialogTemplate = {
        _dialogHtml: '',
        dialogData: {},
        _id: dialogId,
        _styleTemplateId: styleTemplateId,
        _templateId: htmlTemplateId,
		_hideCallback: null,


        init: function (callback) {
            var self = this;
            self._insertCss(function () {
                self._getHtmlTemplate(callback);
            });
        },


        show: function () {
            this._createDialog();
			this._bindCommonEvents();
            this.bindEvents();
        },


        hide: function (returnValue) {
            this._destroyDialogElement();
			if (this._hideCallback) {
				this._hideCallback(returnValue);
			}
        },


        addClassName: function(className) {
            cssHelper.addClass(document.getElementById(this._id), className)
        },


        removeClassName: function(className) {
            cssHelper.removeClass(document.getElementById(this._id), className)
        },


        _destroyDialogElement: function () {
            this._unbindCommonEvents();
            var formElement = document.getElementById(this._id);
            if (formElement) {
                formElement.parentNode.removeChild(formElement);
            }
        },


        _setDialogPosition: function (atDefaultPosition) {
            var formElement = document.getElementById(this._id);
            if (atDefaultPosition) {
                cssHelper.addClass(formElement, 'lleo_default-pos' + (browserDetector.isSafari() ? ' lleo_safari' : ''))
            }
            else {
                var rect = llContent.dialog.rect;  //todo:
                var sO = sizeHelper.scrollOffset();
                var l = (sO.left + rect.left - 12);
                var t = (sO.top + rect.top - formElement.offsetHeight - 10);

                // Correct dialog position according to viewport
                if (t < sO.top) {
                    t = (sO.top + rect.bottom + 10);
                }
                if (l < sO.left + 5) {
                    l = sO.left + 5;
                }
                else {
                    var body = domHelper.getBody();
                    if (l + formElement.offsetWidth > sO.left + body.offsetWidth - 5) {
                        l = sO.left + body.offsetWidth - formElement.offsetWidth - 5;
                    }
                }
                formElement.style.left = l + 'px';
                formElement.style.top = t + 'px';
            }
        },


        _createDialog: function () {
            this._destroyDialogElement(); //destroy previous dialog if exists
            var htmlForm = stringHelper.formatStrWithEscaping(this._dialogHtml, this.dialogData);
            domHelper.appendHtmlToElement(document.getElementsByTagName('body')[0], htmlForm);
            this._setDialogPosition(atDefaultPosition);

            var self = this;
            setTimeout(function() {
                // Remove class with animation keyframes, 'coz a little bit buggy in Chrome, blinking when another animation is applied
                self.removeClassName('lleo_show-animation');
            }, 1010);
        },


        _insertCss: function (callback) {
            if (getDialogTemplate.insertedStyles[dialogId]) {
                callback();
                return;
            }
            lingualeoHelper.getTemplate(this._styleTemplateId, function (cssCode) {
                cssHelper.addCss(cssCode);
                callback();
            });
            getDialogTemplate.insertedStyles[dialogId] = true;
        },


        _getHtmlTemplate: function (callback) {
            var self = this;
            lingualeoHelper.getTemplate(this._templateId, function (loginFormHtmlCode) {
                self._dialogHtml = loginFormHtmlCode;
                callback();
            });
        },


		_documentMouseDownHandler_static: function (event) {
			var self = event['customData'];
			self.hide();
		},


		_documentKeyDownHandler_static: function(event) {
			var self = event['customData'];
			if (event.keyCode === 27) {// Esc
				self.hide();
			}
		},

		
		_bindCommonEvents: function () {
			Event.add(document, 'mousedown', this._documentMouseDownHandler_static, this);
			Event.add(document, 'keydown', this._documentKeyDownHandler_static, this);
			var formElement = document.getElementById(this._id);
			Event.add(formElement, 'dblclick', function(event) { event.stopPropagation(); });
			Event.add(formElement, 'mousedown', function(event) { event.stopPropagation(); });
			Event.add(formElement, 'mouseup', function(event) { event.stopPropagation(); });
			Event.add(formElement, 'contextmenu', function(event) { event.stopPropagation(); });
        },


		_unbindCommonEvents: function () {
			Event.remove(document, 'mousedown', this._documentMouseDownHandler_static);
			Event.remove(document, 'keydown', this._documentKeyDownHandler_static);
		},


		//overload method
        bindEvents: function () {
            //
        }
    };

    return dialogTemplate;
};


var showLoginDialog = function (atDefaultPosition, hideCallback) {
    var loginDialog = getDialogTemplate('lleo_loginForm', 'content/loginForm', 'content/loginFormStyle', atDefaultPosition);

    loginDialog.dialogData = {
        'loginDialogCapt': i18n.getLocaleMessage('loginDialogCapt'),
        'loginDialogEnter': i18n.getLocaleMessage('loginDialogEnter'),
        'loginDialogSignUp': i18n.getLocaleMessage('loginDialogSignUp'),
        'loginDialogForgot': i18n.getLocaleMessage('loginDialogForgot'),
        'loginDialogPass': i18n.getLocaleMessage('loginDialogPass'),
        'loginDialogEmail': i18n.getLocaleMessage('loginDialogEmail'),
        'dlgCloseHint': i18n.getLocaleMessage('dlgCloseHint')
    };

    loginDialog.bindEvents = function () {
        var self = this;
        var form = document.getElementById(this._id);
        Event.add(form, 'submit', function (event) {
            return false;
        });
        var loginBtn = document.getElementById('lleo_loginButton');
        Event.add(loginBtn, 'click', function () {
            self._handleLogin();
            return false;
        });
        var createAccHref = document.getElementById('lleo_loginCreateAccount');
        Event.add(createAccHref, 'click', function () {
            kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'registerViaExtension', {utm_campaign: 'login-dialog'});
            self.hide();
            return false;
        });
        var forgotPassHref = document.getElementById('lleo_loginForgotPass');
        Event.add(forgotPassHref, 'click', function () {
            kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'forgotPass');
            return false;
        });
        var closeHref = document.getElementById('lleo_loginClose');
        Event.add(closeHref, 'click', function () {
            self.hide();
            return false;
        });
    };

    loginDialog._clearErrorList = function () {
        var errListEl = document.getElementById('lleo_loginErrorList1');
        domHelper.removeAllChilds(errListEl);
        cssHelper.removeClass(errListEl, "showing");
        loginDialog.removeClassName('lleo_error');
    };

    loginDialog._addErrorToList = function (text) {
        var errListEl = document.getElementById('lleo_loginErrorList1');
        domHelper.removeAllChilds(errListEl);
        domHelper.appendHtmlToElement(errListEl, htmlHelper.escapeHTML(text));
        cssHelper.addClass(errListEl, 'showing');

        loginDialog.removeClassName('lleo_error');
        setTimeout(function () {
            loginDialog.addClassName('lleo_error');
        }, 0);
    };

    loginDialog._isDataValid = function (username, pass) {
        var validateEmail = function (email) {
            var emailRegex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
            return emailRegex.test(email);
        };
        if (username.length === 0 || !validateEmail(username)) {
            this._addErrorToList(i18n.getLocaleMessage('loginDialogEmailIncorrect'));//todo: message for invalid email
            return false;
        }
        if (pass.length === 0) {
            this._addErrorToList(i18n.getLocaleMessage('loginDialogEmailIncorrect'));//todo: message for empty pass
            return false;
        }
        return true;
    };

    loginDialog._handleLogin = function () {
        this._clearErrorList();
        var username = document.getElementById('lleo_loginUsername').value;
        var password = document.getElementById('lleo_loginPassword').value;

        if (this._isDataValid(username, password)) {
            this.addClassName('lleo_loading');
            document.getElementById('lleo_loginButton').setAttribute('disabled', 'disabled');

            var self = this;
            kango.invokeAsyncCallback(
                'window.lingualeo.loginUser',
                username,
                password,
                function (result) {
                    self.removeClassName('lleo_loading');
                    document.getElementById('lleo_loginButton').removeAttribute('disabled');
                    if (result.error_msg) {
                        self._addErrorToList(result.error_code == 403 ? i18n.getLocaleMessage('loginDialogEmailIncorrect') : result.error_msg);
                    }
                    else {
                        self.hide(true);
                    }
                }
            );
        }
    };
	
	loginDialog._hideCallback = hideCallback;
    loginDialog.init(function () {
        loginDialog.show();
        setTimeout(function() {
            var inpt = document.getElementById('lleo_loginUsername');
            if (inpt) {
                inpt.focus();
            }
        }, 800);
    });
};


(function () {
    if (lingualeoHelper.isTopWindow()) {
        kango.addMessageListener('showLoginForm', showLoginDialog);
    }
})();








