const path = require("path");

const uploadConfig = {
  basePath: process.env.UPLOAD_PATH || "./uploads",
  tempPath: "/tmp/uploads",
  subdirs: {
    thumbs: "thumbs",
    display: "display",
    original: "original",
    videos: "videos",
    videoThumbs: "video-thumbs",
  },
  getPath(subdir) {
    return path.join(this.basePath, this.subdirs[subdir]);
  },
  limits: {
    photo: 20 * 1024 * 1024, // 20MB
    video: 100 * 1024 * 1024, // 100MB
  },
};

module.exports = uploadConfig;
