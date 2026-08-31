const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const uploadConfig = require("../../../config/upload-config");
const { logger } = require("../../../lib/logger");
const { addMedia } = require("./media.model");
const {
  UploadError,
  FileTooLargeError,
  InvalidFileTypeError,
} = require("../../../lib/errors");

let dirsReady = false;

const checkOrCreateDirs = async () => {
  try {
    await Promise.all(
      Object.values(uploadConfig.subdirs).map(async (subDir) => {
        const dirPath = path.join(uploadConfig.basePath, subDir);
        await fs.mkdir(dirPath, { recursive: true });
        logger.info("Upload directory ready", { dirPath });
      })
    );

    await fs.mkdir(uploadConfig.tempPath, { recursive: true });
    logger.info("Temporary upload directory ready", { tempPath: uploadConfig.tempPath });

    dirsReady = true;
    logger.info("Upload storage initialised");
  } catch (error) {
    logger.error("Failed to initialise upload storage; uploads are disabled", { error });
  }
};

checkOrCreateDirs(); // Initialise on startup - failure will disable uploads

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadConfig.tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = uploadConfig.allowedTypes.image;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new InvalidFileTypeError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: uploadConfig.limits.image,
  },
  fileFilter: fileFilter,
});

// UPLOAD HANDLER
const handlePhotoUpload = async (req, res) => {
  if (!dirsReady) {
    throw new UploadError("Upload service temporarily unavailable", 503);
  }

  if (!req.file) {
    throw new UploadError("No file uploaded");
  }

  const { groupId, albumId } = req.params;
  const userId = req.user.id;
  const tempFile = req.file;
  const tempFilePath = tempFile.path;
  const filename = `${Date.now()}-${crypto.randomUUID()}`;

  logger.info("Processing upload", {
    fileSize: `${(tempFile.size / 1024 / 1024).toFixed(2)}MB`,
    processedFilename: filename,
  });

  // Image processing
  await Promise.all([
    // Thumbnail (200x200)
    sharp(tempFilePath)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(path.join(uploadConfig.getPath("thumbs"), `${filename}.jpg`)),

    // Display version (1200px max)
    sharp(tempFilePath)
      .resize(1200, 1200, { fit: "inside" })
      .jpeg({ quality: 85, progressive: true })
      .toFile(path.join(uploadConfig.getPath("display"), `${filename}.jpg`)),

    // Compressed original
    sharp(tempFilePath)
      .jpeg({ quality: 92, progressive: true })
      .toFile(path.join(uploadConfig.getPath("original"), `${filename}.jpg`)),
  ]);

  // Get original file stats
  const stats = await fs.stat(path.join(uploadConfig.getPath("original"), `${filename}.jpg`));

  if (stats.size > uploadConfig.limits.image) {
    throw new FileTooLargeError(
      `File size too large, must not exceed ${uploadConfig.limits.image / 1024 / 1024}MB`,
      tempFilePath
    );
  }

  const urls = {
    thumb: uploadConfig.getUrl("thumbs", `${filename}.jpg`),
    display: uploadConfig.getUrl("display", `${filename}.jpg`),
    original: uploadConfig.getUrl("original", `${filename}.jpg`),
  };

  // Insert metadata into DB
  const media = await addMedia(
    groupId,
    albumId,
    userId,
    "image",
    "image/jpeg",
    stats.size,
    filename,
    urls
  );

  // Delete temp file
  await fs.unlink(tempFilePath);

  res.status(201).json(media);
};

module.exports = {
  upload: upload.single("image"),
  handlePhotoUpload,
};
