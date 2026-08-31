const path = require("path");

const uploadConfig = {
  basePath: process.env.UPLOAD_PATH || "./uploads",
  tempPath:
    process.env.NODE_ENV === "production"
      ? "/tmp/app-uploads"
      : path.join(process.cwd(), "tmp", "uploads"),
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
    image: 20 * 1024 * 1024, // 20MB
    video: 100 * 1024 * 1024, // 100MB
  },

  allowedTypes: {
    image: ["image/jpeg", "image/png", "image/heic", "image/webp"],
    video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  },

  getUrl(subdir, filename) {
    return `/media/${this.subdirs[subdir]}/${filename}`;
  },
};

module.exports = uploadConfig;
