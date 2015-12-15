var LinguaLeoTracer = function () {

    var stack = {};
    var counter = 0;
    var lockedSections = {};
    var idPrefix = new Date().getTime() + '_';


    /**************************************************/

    function getUID () {
        return idPrefix + (counter++);
    }


    /**********************************************************************************/
    /*** Public methods                                                             ***/
    /**********************************************************************************/

    function doAddAction (sectionName, actionName, actionData) {
        if (!stack[sectionName]) {
            stack[sectionName] = [];
        }
        var item = {
            id: getUID(),
            name: actionName,
            data: actionData
        };
        if (sectionName in lockedSections) {
            item.groupId = lockedSections[sectionName];
        }

        stack.push(item);
        return this;
    }


    function doLockSection (sectionName) {
        if (!lockedSections[sectionName]) {
            lockedSections[sectionName] = new Date().getTime();
        }
        return this;
    }


    function doUnlockSection (sectionName) {
        if (lockedSections[sectionName]) {
            delete lockedSections[sectionName];
        }
        return this;
    }


    /**********************************************************************************/
    /*** Expose methods                                                             ***/
    /**********************************************************************************/

    return {

        addAction: doAddAction,
        lockSection: doLockSection,
        unlockSection: doUnlockSection

    };
};