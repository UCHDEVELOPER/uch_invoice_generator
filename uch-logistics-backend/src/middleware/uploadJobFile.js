import multer from "multer";

const upload = multer({
  dest: "src/public/uploads/jobs/",
  limits: { fileSize: 10 * 1024 * 1024 } 
});

export const uploadJobFile = upload.single("file");
