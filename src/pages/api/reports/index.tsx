import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import corsHandler from "../../../lib/cors";

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

const uploadDirectory = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

export default async function reportsHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    corsHandler(req, res);

    const { method } = req;

    switch (method) {
      case "GET": {
        const { region } = req.query;

        if (region) {
          const reportsByRegion = await prisma.report.findMany({
            where: { region: region.toString() },
            include: {
              program: true,
            },
          });

          return res.status(200).json(reportsByRegion);
        } else {
          const reports = await prisma.report.findMany({
            include: {
              program: true,
            },
          });

          return res.status(200).json(reports);
        }
      }

      case "POST": {
        const form = new IncomingForm({ uploadDir: uploadDirectory, keepExtensions: true });

        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("Error saat parsing form:", err);
            return res.status(500).json({ message: "Error saat upload file" });
          }

          const file = Array.isArray(files.proof) ? files.proof[0] : files.proof;

          if (!file || !file.filepath) {
            console.error("Properti file tidak valid:", file);
            return res.status(400).json({ message: "File bukti tidak ditemukan atau tidak valid" });
          }

          const fileName = file.originalFilename || `upload_${Date.now()}`;
          const filePath = path.join(uploadDirectory, fileName);

          try {
            fs.renameSync(file.filepath, filePath);
          } catch (moveError) {
            console.error("Error saat memindahkan file:", moveError);
            return res.status(500).json({ message: "Gagal menyimpan file" });
          }

          const { programId, recipientCount, region, distributionDate, note } = fields;

          if (!programId || !recipientCount || !region || !distributionDate) {
            return res.status(400).json({ message: "Semua field wajib diisi" });
          }

          const newReport = await prisma.report.create({
            data: {
              programId: Number(programId),
              recipientCount: Number(recipientCount),
              region: region.toString(),
              distributionDate: new Date(distributionDate.toString()),
              proof: `/uploads/${fileName}`,
              note: note ? note.toString() : null,
            },
          });

          return res.status(201).json(newReport);
        });
        break;
      }

      default:
        return res.status(405).json({ message: "Metode tidak diizinkan" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server", error: (error as Error).message });
  }
}
