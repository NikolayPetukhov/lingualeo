var NodeWordsWrapper = function (params) {

    var defaultParams = {
        locale: "en",
        re: {
            chars: {
                delims: '€£\\$\\s,.…!\\?:;\\|\\“\\”«»"\\[\\]\\(\\)\\{\\}‘’',
                wrappingWordAdd: '\-\–`\'’0-9'
            },
            localeChars: {
                en: {
                    wrappingWord: 'a-z'
                },
                ru: {
                    wrappingWord: 'а-я'
                }
            }
        }
    };

    this.params = $.extend({}, defaultParams, params);
    $.extend(this.params.re.chars, this.params.re.localeChars[this.params.locale]);
    $.extend(this.params.re, {
        expressions: {
            correctWordForWrapping: new RegExp('^([' + this.getWordCharacters() + this.getWordAddCharacters() + ']+)$', 'i'),
            onlyAddWordChars: new RegExp('^[' + this.getWordAddCharacters() + ']+$', 'i'),
            delimiter: new RegExp('[' + this.getDelimCharacters() + ']+', 'gi')
        }
    });
};

NodeWordsWrapper.prototype = {
    
    unwrapTranElements: function (element) {
        var $trans = $(element).find('tran'),
            transCnt = $trans.length;

        $trans.each(function () {
            $(this).contents().insertAfter(this);
        });
        $trans.remove();
        return transCnt;
    },

    wrapElementWordsAndCheckIntegrity: function (element) {
        // оборачиваем слова ноды в tran и проверяем целостность:
        // количество обёрнутых слов должно быть равно
        // количеству обёрнутых слов в чистом тексте (без html-тегов)

        var self = this,
            $element = $(element),
            $clone = $element,
            $clearClone = $clone.clone();

        $clearClone.find('.no-tran').remove();
        $clearClone.hide().insertBefore(element);
        $clearClone.each(function () { $(this).text(self.getNodeText(this)); });

        this.wrapNodeWords($clone);
        this.wrapNodeWords($clearClone);

        var $cloneWords = $clone.find('tran'),
            $clearCloneWords = $clearClone.find('tran');
        var isIntergal = $cloneWords.length == $clearCloneWords.length;

        return {
            isIntegral: isIntergal,
            $clearCloneWords: $clearCloneWords,
            $clearClone: $clearClone,
            $words: $cloneWords,
            $container: $clone
        };
    },

    fixIntegrity: function (integrityInfo) {
        // пытаемся поправить целостность для tran:
        // ищем несовпадающие с чистым образцом теги tran
        // и пытаемся их восстановить путём слияния последующих тегов

        var $clearWords = integrityInfo.$clearCloneWords,
            $words = integrityInfo.$words,
            delta = 0,
            fixed = true;

        for (var idx = 0; idx < $clearWords.length; idx++) {
            var $clearWord = $clearWords.eq(idx),
                $word = $words.eq(idx + delta),
                joinInfo = {};

            if ($word.text() == $clearWord.text()) {
                continue;
            }

            // <lov> <ed> != <loved> <Jenny>
            // джойним последующие теги до тех пор, пока текст не будет совпадать
            // не забываем учесть разницу в индексах при слиянии
            while ($word.text() != $clearWord.text() && $word.text().length < $clearWord.text().length && delta < $words.length) {
                joinInfo = this.joinSiblingTrans($word, $words.eq(idx + 1 + delta));
                if (!joinInfo.joined) {
                    fixed = false;
                    break;
                }
                $word = joinInfo.$word;
                delta += joinInfo.addDelta;
            }

            if (delta >= $words.length ||
                delta == 0 ||
                $word.text() != $clearWord.text()) {
                // какая-то хитрая загогулина в вёрстке, не позволяющая слить элементы
                fixed = false;
            }

            if (!fixed) {
                // т.к. мы периодически будем сюда попадать из-за неучтённых нюансов врапинга слов,
                // нужно иметь возможность выяснить причины поломки
                // для того, чтобы на лету порекомендовать контентщикам метод исправления ошибки
                // например, исправления символа на другой
                //LEO.debug('NodeWordsWrapper: integrity fixing failed. test value: "%s", real value: "%s"', $clearWord.text(), $word.text());
                break;
            }
        }

        return $.extend({}, integrityInfo, {fixed: fixed});
    },

    joinSiblingTrans: function ($tranA, $tranB) {
        // слияние двух "соседних" тегов tran, имеющих разных родителей:
        // <t>tranA</t><b><t>tranB</t></b> ==> <t>tranA<b>tranB</b></t>
        // append $tranB element to $tranA
        // or
        // prepend $tranA element to $tranB
        if (!($tranA.length && $tranB.length)) {
            return {joined: false}
        }

        var $newParent =  $tranA,
            sibMethod = 'getNodeLeftSibling',
            moveMethod = 'append',
            $oldParent = $tranB,
            $aParents = $tranA.parents(),
            $bParents = $tranB.parents(),
            joined = false,
            addDelta = undefined;


        // кто выше (у кого меньше родителей), тот и папа
        if ($aParents.length > $bParents.length) {
            $newParent = $tranB;
            $oldParent = $tranA;
            sibMethod = 'getNodeRightSibling';
            moveMethod = 'prepend';

        } else if ($aParents.length == $bParents.length) {
            // <b><t>tranA</t></b><b><t>tranB</t></b>
            // <t><b>tranA</t>
            var $parentA = $tranA,
                $parentB = $tranB;

            // search sibling parents for tranA and tranB
            while ($parentA && $parentB && !this.getNodeRightSibling($parentA).is($parentB)) {
                $parentA = this.getNodeParent($parentA);
                $parentB = this.getNodeParent($parentB);
            }
            if ($parentA && $parentB) {
                $newParent = $('<tran>').insertBefore($parentA);
                $newParent.append($parentA).append($parentB);
                joined = true;
                addDelta = $newParent.find('tran').length - 1;
            }
        }

        if (!joined) {
            while ($oldParent && !this[sibMethod]($oldParent).is($newParent)) {
                $oldParent = this.getNodeParent($oldParent);
            }
            if ($oldParent) {
                $newParent[moveMethod]($oldParent);
                joined = true;
            }
        }
        if (joined) {
            var transCnt = this.unwrapTranElements($newParent);
            if (addDelta === undefined) {
                addDelta = transCnt;
            }

        }
        return {
            joined: joined,
            $word: $newParent,
            addDelta: addDelta
        }
    },

    getNodeParent: function (node) {
        var $parent = $(node).parent();
        return $parent && $parent.length ? $parent : null;
    },

    getNodeRightSibling: function (node) {
        var $node = $(node), right = $node[0].nextSibling;
        return $(right);
    },

    getNodeLeftSibling: function (node) {
        var $node = $(node), left = $node[0].previousSibling;
        return $(left);
    },

    replaceNodeWith: function (node, nodes, noRemove) {
        // vanilla-js for eliminate broken jQuery (1.8->1.9) functionality (replaceWith)
        var parentNode = node.parentNode;
        if (!(nodes instanceof Array)) {
            nodes = [nodes];
        }
        nodes.forEach(function (newNode) {
            parentNode.insertBefore(newNode, node);
        });
        if (!noRemove) {
            node.parentNode.removeChild(node);
        }
    },

    getNodeText: function (node) {
        // продвинутый node.text():
        // вставляет пробелы между не-инлайновыми тегами
        var $node = $(node),
            $clone = $node.clone().hide(),
            customDelimitersForTags = {
                "BR": "\n"
            },
            texts = [];

        //для проверки, inline элемент или нет необходимо, чтобы нода была прикреплена к DOM-дереву
        if ($node.closest('html').length) {
            $clone.insertBefore(node);
        } else {
            $clone.appendTo('body');
        }

        $clone.each(function () {
            var $cloneElement = $(this);
            $cloneElement.find('*').each(function () {
                var node = this,
                    display = getComputedStyle(node).display,
                    delimiter = customDelimitersForTags[node.nodeName] || display != "inline" ? " " : undefined;

                if (delimiter && display != "none") {
                    if (node.nextSibling) {
                        node.parentNode.insertBefore(document.createTextNode(delimiter), node.nextSibling);
                    }
                    if (node.previousSibling) {
                        node.parentNode.insertBefore(document.createTextNode(delimiter), node);
                    }
                }
            });
            texts.push($cloneElement.text().trim());
        });
        $clone.remove();
        return texts.join('\n\n');
    },

    filterChildren: function ($nodes) {
        // отсеивает элементы $nodes, которые являются дочерними других элементов $nodes
        return $nodes.not($nodes.children());
    },

    wrapNodeWords: function (node) {
        var self = this,
            $node = this.filterChildren($(node));

        if ($node.hasClass('no-tran')) {
            return;
        }
        $node.contents().each(function () {
            var node = this;
            self.isTextNode(node) ? self.wrapTextNodeWords(node)
                                  : self.wrapNodeWords(node);
        });
    },

    isTextNode: function (node) {
        return node.nodeType === 3;
    },

    wrapTextNodeWords: function (node) {
        var nodes = this.mkWrappedNodesArray(node.data);
        this.replaceNodeWith(node, nodes);
    },

    getWordCharacters: function () {
        return this.params.re.chars.wrappingWord;
    },

    getWordAddCharacters: function () {
        return this.params.re.chars.wrappingWordAdd;
    },

    getDelimCharacters: function () {
        return this.params.re.chars.delims;
    },

    isWordForWrapping: function (word) {
        // это должно быть слово,
        // но оно не доллжно состоять только из доп. символов
        var correctWordRe = this.params.re.expressions.correctWordForWrapping,
            onlyAddCharsRe = this.params.re.expressions.onlyAddWordChars;

        return correctWordRe.test(word) && !onlyAddCharsRe.test(word);
    },

    mkWordNode: function (word, tagName) {
        var node;
        if (tagName) {
            node = document.createElement(tagName);
            node.innerHTML = word;
        } else {
            node = document.createTextNode(word);
        }
        return node;
    },

    mkWrappedNodesArray: function (text, callback) {
        // text ==> [(DOMElement|TextNode)]
        var self = this,
            delimRe = this.params.re.expressions.delimiter,
            delims = text.match(delimRe) || [],
            words = text.split(delimRe) || [],
            nodes = [];

        words = words.map(function (word) {
            return self.mkWordNode(word, self.isWordForWrapping(word) ? 'tran' : undefined);
        });
        while (words.length) {
            nodes.push(words.shift(),
                       this.mkWordNode(delims.shift() || ''));
        }
        if (delims.length) {
            // что-то пошло не так: при восстановлении текста остались разделители.
            // вернём тогда то, что было до этого
            nodes = [this.mkWordNode(text)];
        }
        nodes = nodes.filter(function (node) { return node.data || node.innerHTML; });

        if (callback) {
            callback(nodes);
        }
        else {
            return nodes;
        }
    },

    wrapElementWordsWithIntegrityFixing: function (element, callback) {
        var integrityInfo = this.wrapElementWordsAndCheckIntegrity(element);
        if (!integrityInfo.isIntegral) {
            integrityInfo = this.fixIntegrity(integrityInfo);
        }
        integrityInfo.$clearClone.remove();
        var wrapped = integrityInfo.isIntegral || integrityInfo.fixed;
        if (!wrapped) {
            this.unwrapTranElements(element);
        }

        var res = $.extend({}, integrityInfo, {
            wrapped: wrapped
        });

        if (callback) {
            callback(res);
        }
        else {
            return res;
        }
    }
};