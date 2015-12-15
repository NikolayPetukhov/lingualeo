KangoAPI.onReady(function () {

    var extensionInfo;
    var templateNames = ['options/content', 'options/custom-checkbox'];

    var $content = $('#content');
    var templates;


    function initCheckboxes (handlers) {
        $content
            .on('click', '.control-checkbox', function (e) {
                var $this = $(this);
                if ($this.attr('disabled')) {
                    return;
                }
                var $checkbox = $this.find('> .custom-checkbox');
                $this.trigger($checkbox.hasClass('checked') ? 'setUnchecked' : 'setChecked');
                if (handlers.onClick) {
                    handlers.onClick();
                }
            })
            .on('updateState', '.control', function () {
                var $this = $(this);
                if (!$this.hasClass('sub-control')) {
                    $this.parent('.controls-group').find('.sub-control').not($this).trigger($this.attr('checked') ? 'setEnabled' : 'setDisabled');
                }
                $this.trigger('sceneChange', {checked: !!$this.attr('checked')});
            })
            .on('setDisabled', '.control-checkbox', function () {
                $(this).addClass('disabled').attr('disabled', true);
            })
            .on('setEnabled', '.control-checkbox', function () {
                $(this).removeClass('disabled').removeAttr('disabled');
            })
            .on('setChecked', '.control-checkbox', function () {
                var $this = $(this);
                var $checkbox = $this.find('> .custom-checkbox');
                $checkbox.addClass('checked');
                $this.addClass('checked').attr('checked', true);
                $this.trigger('updateState');
            })
            .on('setUnchecked', '.control-checkbox', function () {
                var $this = $(this);
                var $checkbox = $this.find('> .custom-checkbox');
                $checkbox.removeClass('checked');
                $this.removeClass('checked').removeAttr('checked');
                $this.trigger('updateState');
            })
            .on('sceneChange', '.control-checkbox', function (event, data) {
                var $this = $(this);
                if (handlers.onSceneChange) {
                    var sceneChecked = $this.data('sceneChecked');
                    var sceneUnchecked = $this.data('sceneUnchecked');
                    if (sceneChecked) {
                        handlers.onSceneChange({
                            enable: data.checked,
                            page: $this.data('page'),
                            scene: sceneChecked
                        });
                    }
                    if (sceneUnchecked) {
                        handlers.onSceneChange({
                            enable: !data.checked,
                            page: $this.data('page'),
                            scene: sceneUnchecked
                        });
                    }
                }
            })
            .find('.control-checkbox').trigger('updateState');
    }


    function initControls () {
        if (browserDetector.isFirefox()) {
            $('#demoGroupPaper').addClass('group-paper-mozilla');
        }
        var $demoContainer = $('#demoContainer');
        initCheckboxes({
            onSceneChange: function (data) {
                var $page = $demoContainer.find('[data-page="' + data.page + '"]');
                if (data.enable) {
                    $page.addClass(data.scene);
                }
                else {
                    $page.removeClass(data.scene);
                }
            },
            onClick: function () {
                saveOptions();
            }
        });

        $('#releaseNotesButton').click(function () {
            showReleaseNotes(false);
        });
        $('#btnOptions').click(hideReleaseNotes);
        $('#btnClosePage').click(function () {
            window.close();
        });


        $('#btnCreateAccount').click(function () {
            kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'registerViaExtension', {utm_campaign: 'options'});
        });
        $('#btnLogin').click(function () {
            kango.invokeAsync('window.lingualeo.openLinguaLeoPage', 'login');
        });
    }


    function initContent () {
        i18n.localizeDom($('#container').get(0));
        var html = stringHelper.formatStrExt(templates['options/content'], {
            'custom-checkbox': templates['options/custom-checkbox']
        });
        $content.html(html);

        if (window.navigator.userAgent.toLowerCase().indexOf('macintosh') > -1) {
            $('#ctrlKeyText').hide();
        }
        else {
            $('#cmdKeyText').hide();
        }
    }


    function showReleaseNotes(noAnimation) {
        $('#releaseNotes').show();
        var cntX = 5;
        var cntY = 5;
        var $blocksContainer = $('#releaseNotesBlocksContainer');
        for (var i = 0; i < cntX; i++) {
            for (var j = 0; j < cntY; j++) {
                if (noAnimation) {
                    $('<div class="block show"></div>').appendTo($blocksContainer);
                }
                else {
                    var delay = (i + j) * 70 + 'ms';
                    $('<div class="block"></div>').css({
                        'webkitTransitionDelay': delay,
                        'mozTransitionDelay': delay,
                        'msTransitionDelay': delay,
                        'transitionDelay': delay
                    }).appendTo($blocksContainer);
                }
            }
        }

        if (!noAnimation) {
            setTimeout(function () {
                var $blocks = $blocksContainer.find('.block');
                for (var i = 0; i < $blocks.size(); i++) {
                    $blocks.eq(i).addClass('show');
                }
            }, 10);
        }

        setTimeout(function () {
            $('#releaseNotes').addClass('show');
        }, 300);
    }


    function hideReleaseNotes() {
        $('#releaseNotes').hide().removeClass('show');
        $('#releaseNotesBlocksContainer').empty();
        window.location.hash = '';
    }


    function loadOptions() {
        function setValue(controlId, value) {
            $('#' + controlId).trigger(value ? 'setChecked' : 'setUnchecked');
        }
        kango.invokeAsync('window.lingualeo.getExtensionOptions', function (options) {
            setValue('controlUseDblClick', options.useDblClick);
            setValue('controlUseDblClickWithCtrl', options.dblClickWithCtrl);
            setValue('controlUseDblClickWithAlt', options.dblClickWithAlt);
            setValue('controlShowPicture', options.showPicture);
            setValue('controlShowContext', options.showContext);
            setValue('controlAutoTranslateContext', options.autoTranslateContext);
            setValue('controlAutoplaySound', options.autoplaySound);
            setValue('controlShowUntrainedWordsCount', options.showUntrainedWordsCount);
            setValue('controlShowBrowserPopups', options.showBrowserPopups);
            setValue('controlShowHints', options.wizardsEnabled);
        });
    }


    function saveOptions() {
        function getValue (controlId) {
            return $('#' + controlId).attr('checked') ? 1 : 0
        }
        var options = new LinguaLeoDefaultOptions();
        options.useDblClick = getValue('controlUseDblClick');
        options.dblClickWithCtrl = getValue('controlUseDblClickWithCtrl');
        options.dblClickWithAlt = getValue('controlUseDblClickWithAlt');
        options.showPicture = getValue('controlShowPicture');
        options.showContext = getValue('controlShowContext');
        options.autoTranslateContext = getValue('controlAutoTranslateContext');
        options.autoplaySound = getValue('controlAutoplaySound');
        options.showUntrainedWordsCount = getValue('controlShowUntrainedWordsCount');
        options.showBrowserPopups = getValue('controlShowBrowserPopups');
        options.wizardsEnabled = getValue('controlShowHints');

        kango.invokeAsync('window.lingualeo.setExtensionOptions', options);
    }


    function init () {
        var isChangelog = (window.location.hash === '#changelog');

        initContent();
        initControls();
        loadOptions();

        $('#extVersion').text('v' + kango.getExtensionInfo().version);

        if (isChangelog) {
            showReleaseNotes(true);
        }

        // Show "Create account" or "Login" button
        kango.invokeAsync('window.lingualeo.isAuthorized', function (isAuth) {
            if (!isAuth) {
                kango.invokeAsync('window.lingualeo.isUserHasAccount', function (hasAccount) {
                    $(hasAccount ? '#btnLogin' : '#btnCreateAccount').css('display', 'block');
                });
                $('#registerContainer').show();
            }
        });
    }


    /*********************************************************/
    //
    //   Initialization
    //
    /*********************************************************/

    i18n.updateLocaleMessages(true, function () {
        kango.invokeAsync('kango.getExtensionInfo', function (info) {
            extensionInfo = info;
            lingualeoHelper.getTemplates(templateNames, true, function (htmls) {
                templates = htmls;
                init();
            });
        });
    })

});


























