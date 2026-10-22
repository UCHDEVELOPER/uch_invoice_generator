import fs from "fs";
import XLSX from "xlsx";
import { parse } from "fast-csv";

export async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(
        parse({
          headers: (headers) =>
            headers.map((header) => {
              const normalized = header.trim();
              return normalized === "Docket No" ? "Docket" : normalized;
            }),
          trim: true,
        }),
      )
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

export function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}
