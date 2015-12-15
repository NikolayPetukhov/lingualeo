
var LinguaLeoContextMenu = function () {

    return {
        transItemId: null,

        _generateId: function () {
            return ('lleo_menu_id_' + Math.random()).toString()
        },

        setItemVisibility: function(itemId, isVisible) {
            llContextMenu.setItemVisibility(itemId, isVisible);
        },

        createTranslationItem: function(callback) {
            this.transItemId = this._generateId();
            llContextMenu.addItem(
                this.transItemId,
                kango.i18n.getMessage('contextAddToDict'),
                'all',
                callback
            );
        },

        setTranslationItemVisibility: function(isVisible) {
            lingualeo.contextMenu.setItemVisibility(lingualeo.contextMenu.transItemId, isVisible);
        }
    };
};