var extensionInfo = require('kango/extension_info'),
    utils = require('kango/utils'),
    core = require('kango/core'),
    object = utils.object,
    func = utils.func,
    array = utils.array,
    chromeWindows = require('kango/chrome_windows'),
    io = require('kango/io'),
    EventTarget = utils.EventTarget;

function ContextMenuItem(item) {
    EventTarget.call(this);
    this._items = {};
    this.init();
}

ContextMenuItem.prototype = object.extend(EventTarget, {

    event: {
        CLICK: 'click'
    },

    init: function() {
        chromeWindows.addEventListener(chromeWindows.event.WINDOW_LOAD, func.bind(function(event) {
            this._addItems(event.window);
        }, this));

        chromeWindows.addEventListener(chromeWindows.event.WINDOW_UNLOAD, func.bind(function(event) {
            this._removeItems(event.window);
        }, this))
    },

    addItem: function(id, itemName, context, clickCallback) {
        log('Add item ' + id);
        var isVisible = true;
        array.forEach(chromeWindows.getLoadedChromeWindows(), function(chromeWindow) {
            this._addItem(chromeWindow, id, itemName, context || 'all', clickCallback, isVisible);
        }, this);
        this._items[id] = {itemName: itemName, context: context, clickCallback: clickCallback, isVisible: isVisible};
    },

    removeItem: function(id) {
        array.forEach(chromeWindows.getLoadedChromeWindows(), function(chromeWindow) {
            this._removeItem(chromeWindow, id);
        }, this);
        delete this._items[id];
    },

    _addItems: function(chromeWindow) {
        object.forEach(this._items, function(item, id) {
            this._addItem(chromeWindow, id, item.itemName, item.context, item.clickCallback, item.isVisible);
        }, this);
    },

    _removeItems: function(chromeWindow) {
        object.forEach(this._items, function(_, id) {
            this._removeItem(chromeWindow, id);
        }, this);
    },

    dispose: function() {
        this.removeAllEventListeners();
        array.forEach(chromeWindows.getLoadedChromeWindows(), function(chromeWindow) {
            this._removeItems(chromeWindow);
        }, this);
    },

    _addItem: function(chromeWindow, id, itemName, context, cb) {
        var doc = chromeWindow.document;
        var menupopup = doc.getElementById('contentAreaContextMenu');
        var itemElem = doc.createElement('menuitem');
        itemElem.setAttribute('id', id);
        itemElem.setAttribute('label', itemName);
        itemElem.setAttribute('class', 'menuitem-iconic');
        itemElem.setAttribute('image', io.getExtensionFileUrl('icons/button.png'));
        itemElem.addEventListener('command', func.bind(function(event) {
            var element = doc.popupNode;
            var e = {
                srcUrl: element.src,
                linkUrl: element.href
            };
            this.fireEvent(this.event.CLICK, e);
            cb && cb(e);

            event.preventDefault();
        }, this), false);
        menupopup.appendChild(itemElem);
        var popupShowingListener = function() {
            var menuitem = doc.getElementById(id);
            if (menuitem != null) {
                if (context == 'image') {
                    menuitem.hidden = !(chromeWindow.gContextMenu.onImage);
                }
            }
        };
        menupopup.addEventListener('popupshowing', popupShowingListener, false);
        chromeWindows.registerContainerUnloader(function() {
            menupopup.removeEventListener('popupshowing', popupShowingListener, false);
        }, chromeWindow);
    },

    _removeItem: function(chromeWindow, id) {
        var doc = chromeWindow.document;
        var item = doc.getElementById(id);
        if (item != null) {
            item.parentNode.removeChild(item);
        }
    },

    _setItemVisibility: function(chromeWindow, id, isVisible) {
        var el = chromeWindow.document.getElementById(id);
        if (el) {
            el.hidden = !isVisible;
        }
    },

    setItemVisibility: function(id, isVisible) {
        if (this._items[id]) {
            array.forEach(chromeWindows.getLoadedChromeWindows(), function(chromeWindow) {
                this._setItemVisibility(chromeWindow, id, isVisible);
            }, this);
            this._items[id].isVisible = isVisible; 
        }
    }
});

module.exports = new ContextMenuItem();

function createApi() {
    return {
        obj: module.exports,
        clear: function() {}
    };
}

core.registerApiFactory('llContextMenu', createApi);
