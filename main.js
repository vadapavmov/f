const app = angular.module('application', []);
const backendUrl = 'https://nl1.dhokla.net' // allowed values are

app.filter('truncate', function () {
    return function (input, maxLength) {
        if (input.length <= maxLength) return input
        else return input.substring(0, maxLength) + '...';
    };
});

// app.config(['$locationProvider', function ($locationProvider) { $locationProvider.html5Mode(true) }]);

app.controller('controller', ['$scope', 'FMService', '$location', '$timeout', function ($scope, FMService, $location, $timeout) {

    $scope.query = ''; // Reset the search field
    $scope.breadcrumbs = [];
    $scope.directory = { files: [] };
    $scope.baseURL = backendUrl || $location.protocol() + '://' + $location.host() + ':' + $location.port();

    $scope.updateBreadcrumbs = function (directory) {
        // If directory is root, reset breadcrumbs
        if (!directory.id || directory.id === '11111111-1111-1111-1111-111111111111') {
            $scope.breadcrumbs = [];
            $scope.query = ''; // Reset the search field
        } else {
            // Find the breadcrumb index
            const existingIndex = $scope.breadcrumbs.findIndex(b => b.id === directory.id);
            if (existingIndex !== -1) $scope.breadcrumbs = $scope.breadcrumbs.slice(0, existingIndex + 1);
            else $scope.breadcrumbs.push({ name: directory.name, id: directory.id });
        }
    };

    $scope.loadDirectory = function (id) {
        $scope.loading = true;
        FMService.getDir(id).then((directory) => {
            $scope.$apply(() => {
                $scope.directory = directory;
                $scope.updateBreadcrumbs(directory);
                $scope.loading = false;
            });
        });
    };

    $scope.search = async function(name) {
        if (!name || name.length < 4) return; // Check for minimum length
        $scope.loading = true;
        try {
            const files = await FMService.search(name);
            $scope.$apply(() => {
                $scope.directory = { files: files };
                $scope.breadcrumbs = []; // Reset breadcrumbs on search
                $scope.loading = false;
            });
        } catch (error) {
            console.error("Search error:", error);
            $scope.loading = false;
        }
    };

    $scope.load = function (id) {
        $location.path('/').hash(id);
        $scope.loadDirectory(id);
    };

    $scope.$on("$locationChangeSuccess", function () {
        const path = $location.path('/').hash();
        $scope.loadDirectory(path);
    });

    $scope.download = function (file) {
        triggerDownload(`${$scope.baseURL}/f/${file.id}`)
    }
    $scope.copyLink = function (file) {
        copyTextToClipboard(`${$scope.baseURL}/f/${file.id}`)
    }
    $scope.discord = function () {
        window.open('https://discord.gg/MYAtstN8bS', '_blank')
    }
}]);

app.service('FMService', ['$http', function ($http) {
    return {
        getDir: async function (id) {
            const endpoint = id ? '/api/d/' + id : '/api/d'
            const {data: {data: dir}} = await $http.get(backendUrl + endpoint)
            dir.files = dir.files.map(f => {
                return {...f, size: f.dir ? 'folder' : humanReadableSize(f.size), selected: false}
            })
            return dir
        },
        search: async function(name) {
            const endpoint = '/api/s/' + encodeURI(name)
            let {data: {data: files}} = await $http.get(backendUrl + endpoint)
            files = files.map(f => {
                return {...f, size: f.dir ? 'folder' : humanReadableSize(f.size), selected: false}
            })
            return files
        }
    };
}]);

function humanReadableSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024

    if (Math.abs(bytes) < thresh) {
        return `${bytes} B`
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    let u = -1
    const r = 10 ** dp

    do {
        bytes /= thresh
        u += 1
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)

    return `${bytes.toFixed(dp)} ${units[u]}`
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.setSelectionRange(0, text.length); // Set selection range for mobile devices
    document.execCommand('copy');
    document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopyTextToClipboard(text));
    } else fallbackCopyTextToClipboard(text);
}

function triggerDownload(url) {
    const link = document.createElement('a');
    link.href = url;
    link.click();
}