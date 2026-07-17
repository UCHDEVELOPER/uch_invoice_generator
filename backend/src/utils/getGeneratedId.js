import { prisma } from "../config/prismaClient.js";

const STARTING_ID = 400000;

export async function getGeneratedId(module = "main") {
  const [lastInvoice, lastSelfInvoice] = await Promise.all([
    prisma.invoice.findFirst({
      orderBy: { generated_id: "desc" },
      select: { generated_id: true },
    }),
    prisma.selfInvoice.findFirst({
      orderBy: { generated_id: "desc" },
      select: { generated_id: true },
    }),
  ]);

  const maxInvoiceId = lastInvoice?.generated_id ?? 0;
  const maxSelfInvoiceId = lastSelfInvoice?.generated_id ?? 0;

  const currentMax = Math.max(maxInvoiceId, maxSelfInvoiceId);

  if (module === "main" || module === "self") {
    return currentMax > 0 ? currentMax + 1 : STARTING_ID;
  }

  throw new Error(`Unknown module type: "${module}"`);
}