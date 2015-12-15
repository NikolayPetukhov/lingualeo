/** @preserve
// ==UserScript==
// @name LinguaLeoStringHelper
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

var stringHelper = {

    formatStrWithEscaping: function (str, data) {
        for (var paramName in data) {
            if (data.hasOwnProperty(paramName)) {
                str = str.replace(new RegExp('{' + paramName + '}', 'g'), htmlHelper.escapeHTML(data[paramName]));
            }
        }
        return str;
    },

    formatStr: function (str, data) {
        for (var paramName in data) {
            if (data.hasOwnProperty(paramName)) {
                str = str.replace(new RegExp('{' + paramName + '}', 'g'), data[paramName]);
            }
        }
        return str;
    },

    formatStrExt: function (str, data) {
        for (var paramName in data) {
            str = str.replace(new RegExp('{'+paramName+'\\?(.*?)\\:(.*?)}', 'g'), data[paramName] ? '$1' : '$2');
        }
        return stringHelper.formatStr(str, data);
    },

    wrapWordWithTag: function (text, word, tagName) {
        return text.replace(new RegExp('(^|\\s)(' + word + ')(\\s|$)', 'gi'), '$1<' + tagName + '>$2</' + tagName + '>$3');
    },

    trimText: function (text) {
        return text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/, '');
    }

};