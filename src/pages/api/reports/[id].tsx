import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import corsHandler from "../../../lib/cors";
import { IncomingForm } from "formidable";

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

export default async function reportHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    corsHandler(req, res);

    const { method } = req;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "ID laporan wajib disertakan" });
    }

    switch (method) {
      case "GET": {
        const report = await prisma.report.findUnique({
          where: { id: Number(id) },
          include: {
            program: true,
          },
        });

        if (!report) {
          return res.status(404).json({ message: "Laporan tidak ditemukan" });
        }

        return res.status(200).json(report);
      }

      case "PUT": {
        const form = new IncomingForm({ keepExtensions: true, uploadDir: uploadDirectory });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        form.parse(req, async (err, fields, files) => {
          if (err) {
            return res.status(500).json({ message: "Terjadi kesalahan saat parsing form", error: err.message });
          }

          const { status, programId, recipientCount, region, distributionDate, note } = fields;

          const reportToUpdate = await prisma.report.findUnique({
            where: { id: Number(id) },
          });

          if (!reportToUpdate) {
            return res.status(404).json({ message: "Laporan tidak ditemukan" });
          }
          const updatedReport = await prisma.report.update({
            where: { id: Number(id) },
            data: {
              programId: programId ? Number(programId) : reportToUpdate.programId,
              recipientCount: recipientCount ? Number(recipientCount) : reportToUpdate.recipientCount,
              region: region ? region.toString() : reportToUpdate.region,
              distributionDate: distributionDate ? new Date(distributionDate.toString()) : reportToUpdate.distributionDate,
              note: note ? note.toString() : reportToUpdate.note,
              status: status ? status.toString() : reportToUpdate.status,
            },
          });

          return res.status(200).json(updatedReport);
        });

        break;
      }

      case "DELETE": {
        const reportToDelete = await prisma.report.findUnique({
          where: { id: Number(id) },
        });

        if (!reportToDelete) {
          return res.status(404).json({ message: "Laporan tidak ditemukan" });
        }

        await prisma.report.delete({
          where: { id: Number(id) },
        });

        return res.status(200).json({ message: "Laporan berhasil dihapus" });
      }

      default:
        return res.status(405).json({ message: "Metode tidak diizinkan" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server", error: (error as Error).message });
  }
}
