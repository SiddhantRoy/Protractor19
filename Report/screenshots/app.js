var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "This app will add 2 number|This is test2 test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f7892ff4ce16df4980542543664d747a",
        "instanceId": 14768,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559315666386,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://juliemr.github.io/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1559315670578,
                "type": ""
            }
        ],
        "screenShotFile": "00660079-00d2-001a-0045-00a500e6004b.png",
        "timestamp": 1559315666964,
        "duration": 6550
    },
    {
        "description": "This app will add 2 number|This is test2 test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "337bfec719174eb9edf2d05417f60a2f",
        "instanceId": 17488,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559317844666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://juliemr.github.io/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1559317854641,
                "type": ""
            }
        ],
        "screenShotFile": "002a0043-006c-0032-0054-00db005e0040.png",
        "timestamp": 1559317849007,
        "duration": 14658
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f351d2a6aec525dbd852f42f4fb30174",
        "instanceId": 19676,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559673737661,
                "type": ""
            }
        ],
        "screenShotFile": "00590086-00ed-00ba-0039-00cb00fb0016.png",
        "timestamp": 1559673749760,
        "duration": 14188
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0eee573f7e891b4c5b5c6b7abcfca037",
        "instanceId": 11868,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559674617310,
                "type": ""
            }
        ],
        "screenShotFile": "00e30023-0056-00e1-0010-006d0010004e.png",
        "timestamp": 1559674628059,
        "duration": 8487
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4558102196197c40c4bb52dff664daf5",
        "instanceId": 8792,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559676679257,
                "type": ""
            }
        ],
        "screenShotFile": "003b0004-0043-0057-0001-0047003400e9.png",
        "timestamp": 1559676682748,
        "duration": 23601
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "27ec1be7771bd34fff7f1f6dc3e3a0d9",
        "instanceId": 8344,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": [
            "Failed: size is not defined"
        ],
        "trace": [
            "ReferenceError: size is not defined\n    at C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:11:16\n    at ManagedPromise.invokeCallback_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Test Angularjs app\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:4:2)\n    at addSpecsToSuite (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559676821005,
                "type": ""
            }
        ],
        "screenShotFile": "00cb00f5-0060-0053-004f-009e00100044.png",
        "timestamp": 1559676821220,
        "duration": 8169
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2fe18ecfd26d17e76048c3ef28defc6a",
        "instanceId": 16084,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559676955248,
                "type": ""
            }
        ],
        "screenShotFile": "008100cf-00e5-0064-00b8-00b500af00e9.png",
        "timestamp": 1559676955512,
        "duration": 13698
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6237e75037d3f0857dcc1f3519bd7c16",
        "instanceId": 18280,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": [
            "Failed: size is not defined"
        ],
        "trace": [
            "ReferenceError: size is not defined\n    at C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:30:16\n    at ManagedPromise.invokeCallback_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Test Angularjs app\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:4:2)\n    at addSpecsToSuite (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559677341484,
                "type": ""
            }
        ],
        "screenShotFile": "0049007b-0033-0085-0030-00c600640005.png",
        "timestamp": 1559677341655,
        "duration": 8855
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "37ec413620a951307a243f9bfbee41c9",
        "instanceId": 15320,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": [
            "Failed: size is not defined"
        ],
        "trace": [
            "ReferenceError: size is not defined\n    at C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:30:16\n    at ManagedPromise.invokeCallback_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Test Angularjs app\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:4:2)\n    at addSpecsToSuite (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559677439583,
                "type": ""
            }
        ],
        "screenShotFile": "00f10079-0038-00c8-00f9-006100200060.png",
        "timestamp": 1559677439828,
        "duration": 7220
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4a721b345c8bb1c91896574584db492b",
        "instanceId": 2816,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": [
            "Failed: size is not defined"
        ],
        "trace": [
            "ReferenceError: size is not defined\n    at C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:30:16\n    at ManagedPromise.invokeCallback_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Test Angularjs app\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:4:2)\n    at addSpecsToSuite (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559677483079,
                "type": ""
            }
        ],
        "screenShotFile": "004e0051-0095-00e3-0049-00ef00cd00d3.png",
        "timestamp": 1559677483425,
        "duration": 10619
    },
    {
        "description": "Test Angularjs app|This is new test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "436e81aa4a6ae26186889a7bfbf8d37b",
        "instanceId": 11180,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.169"
        },
        "message": [
            "Failed: size is not defined"
        ],
        "trace": [
            "ReferenceError: size is not defined\n    at C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:30:16\n    at ManagedPromise.invokeCallback_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Test Angularjs app\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:4:2)\n    at addSpecsToSuite (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\siddhant sankar\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\siddhant sankar\\Neweclipse-workspace\\Protracter19\\BrowserCommand.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "deprecation - HTML Imports is deprecated and will be removed in M73, around March 2019. Please use ES modules instead. See https://www.chromestatus.com/features/5144752345317376 for more details.",
                "timestamp": 1559677707865,
                "type": ""
            }
        ],
        "screenShotFile": "005200cf-0032-00e0-00c8-002900cc00c0.png",
        "timestamp": 1559677708263,
        "duration": 13963
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

