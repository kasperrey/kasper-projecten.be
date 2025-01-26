window.versions = {
    "getVersions": function (f) {
        fetch("versions.json")
            .then(response => response.json())
            .then(data => data.versions)
            .then(data => f(data));
    },
    "getImages": function (versions) {
        var imagesPerVersion = new Map();
        versions.forEach(version => {
            var images = [];
            var image1 = document.createElement("img");
            image1.src = "./images/"+version+"/image1.png";
            images.push(image1);
            var image2 = document.createElement("img");
            image2.src = "./images/"+version+"/image2.png";
            images.push(image2);
            var video = document.createElement("video");
            video.src = "./images/"+version+"/video.mp4";
            video.setAttribute("controls", "controls");
            images.push(video);
            imagesPerVersion.set(version, images);
        });
        return imagesPerVersion;
    },
    "getDownloads": function (versions) {
        var downloadsPerVersion = new Map();
        versions.forEach(version => {
            var downloads = [];
            downloads.push("./downloads/"+version+"linux.x86_64");
            downloads.push("./downloads/"+version+"windows.zip");
            downloads.push("./downloads/"+version+"macOs.app.zip");
            downloadsPerVersion.set(version, downloads);
        });
        return downloadsPerVersion;
    },
    "getAll": function (versions) {
        var allOfVersion = new Map();
        var imagesPerVersion = window.versions.getImages(versions)
        var downloadsPerVersion = window.versions.getDownloads(versions)
        versions.forEach(version => {
            allOfVersion.set(version, {"images": imagesPerVersion.get(version), "downloads": downloadsPerVersion.get(version)});
        });
        return allOfVersion;
    }
}
