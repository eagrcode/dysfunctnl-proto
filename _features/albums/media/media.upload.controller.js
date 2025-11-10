const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const uploadConfig = require("../../../_shared/utils/uploadConfig");
const { addMedia } = require("./media.model");
const {
  UploadError,
  FileTooLargeError,
  InvalidFileTypeError,
} = require("../../../_shared/utils/errors");

let dirsReady = false;

const checkOrCreateDirs = async () => {
  try {
    await Promise.all(
      Object.values(uploadConfig.subdirs).map(async (subDir) => {
        const dirPath = path.join(uploadConfig.basePath, subDir);
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Upload directory ready: ${dirPath}`);
      })
    );

    await fs.mkdir(uploadConfig.tempPath, { recursive: true });
    console.log(`Temp directory ready: ${uploadConfig.tempPath}`);

    dirsReady = true;
    console.log("All directories ready =", dirsReady);
  } catch (error) {
    console.error("Failed to create upload directories:", error);
    console.error("Upload functionality will be disabled");
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

  console.log(`Processing upload: ${tempFile.originalname}`);
  console.log(`Size: ${(tempFile.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Storage: ${uploadConfig.basePath}`);

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

  // Insert metadata into DB
  const media = await addMedia(
    groupId,
    albumId,
    userId,
    "image",
    "image/jpeg",
    stats.size,
    filename
  );

  // Delete temp file
  await fs.unlink(tempFilePath);

  res.status(201).json({
    success: true,
    data: {
      ...media,
      urls: {
        thumb: uploadConfig.getUrl("thumbs", `${filename}.jpg`),
        display: uploadConfig.getUrl("display", `${filename}.jpg`),
        original: uploadConfig.getUrl("original", `${filename}.jpg`),
      },
    },
  });
};

module.exports = {
  upload: upload.single("image"),
  handlePhotoUpload,
};
