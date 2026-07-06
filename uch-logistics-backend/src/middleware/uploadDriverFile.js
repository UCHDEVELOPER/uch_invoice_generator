import multer from "multer";

const upload = multer({
  dest: "src/public/uploads/driver/CSV",
  limits: { fileSize: 10 * 1024 * 1024 } 
});

export const uploadDriverFile = upload.single("file");
