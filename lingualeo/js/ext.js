var LinguaLeoExt = function () {

    var notificationId = 0;

    return {

        notificationHandlers: {},

        showNotification: function (data) {
            if (!lingualeo.currentOptions.showBrowserPopups && !data.forceShowing) {
                return;
            }

            var notificationData = {
                id: 'lleo_Notification' + (notificationId++),
                contentData: {
                    text: data.text,
                    title: data.title,
                    mainImageUrl: data.mainImageUrl ? 'https://' + data.mainImageUrl : lingualeo.config.path.images + '/i48.png'
                },
                hideTimeout: data.hideTimeout == null ? lingualeo.config.notificationTimeout : data.hideTimeout
            };

            if (window.Notification) {
                if (Notification.permission !== 'granted') {
                    Notification.requestPermission(function (status) {
                        if (Notification.permission !== status) {
                            Notification.permission = status;
                        }
                    });
                }
                var notification = new Notification(notificationData.contentData.title, {
                    tag: notificationData.id,
                    body: notificationData.contentData.text,
                    icon: lingualeo.getTranslationImageUrl(data.originalText) || notificationData.contentData.mainImageUrl
                });
                notification.onclick = data.handler;
                notification.onshow = function () {
                    // Set notification timeout.
                    // Chrome doesn't close them automatically in current version.
                    setTimeout(function () {
                        notification.close();
                    }, notificationData.hideTimeout);
                };

            }
            else if (window.webkitNotifications) {
                var notification = webkitNotifications.createNotification(
                    notificationData.contentData.mainImageUrl,
                    notificationData.contentData.title,
                    notificationData.contentData.text
                );
                notification.onclick = data.handler;
                notification.show();

                if (notificationData.hideTimeout !== 0) {
                    setTimeout(function () {
                        notification.cancel();
                    }, notificationData.hideTimeout);
                }
            }
        },


        showNotificationForTranslation: function (originalText, translatedText, forceShowing, handler) {
            this.showNotification({
                text: originalText + ' — ' + translatedText,
                title: kango.i18n.getMessage('dictUpdated'),
                originalText: originalText,
                forceShowing: false,
                handler: handler
            });
        },


        setStateHints: function (title, badgeText, badgeColor) {
            kango.ui.browserButton.setBadgeValue(badgeText || '');
            if (title) {
                kango.ui.browserButton.setTooltipText(title);
            }
        },


        setUntrainedWordsCount: function (count) {
            if (lingualeo.currentOptions.showUntrainedWordsCount && count) {
                lingualeo.untrainedWordsCount = +count;
                lingualeo.ext.setStateHints(kango.i18n.getMessage('untrainedWords').replace(/\$1/, count), count.toString());
            }
            else {
                lingualeo.ext.setStateHints(lingualeo.browserButtonDefaultHint, null);
            }
        },


        setAuthState: function (isAuthorized) {
            lingualeo.isAuth = !!isAuthorized;
            if (isAuthorized) {
                kango.ui.browserButton.setIcon('lingualeo/images/i19.png');
                lingualeo.ext.setStateHints(lingualeo.browserButtonDefaultHint, null);
            }
            else {
                kango.ui.browserButton.setIcon('lingualeo/images/i19bw.png');
                lingualeo.ext.setStateHints(kango.i18n.getMessage('notAuthStatus'), null);
                lingualeo.clearUserData();
            }
            //lingualeo.contextMenu.setTranslationItemVisibility(isAuthorized);
            //lingualeo.contextMenu.setLoginItemVisibility(!isAuthorized);
        }

    };
};