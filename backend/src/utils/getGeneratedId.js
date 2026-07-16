import { prisma } from "../config/prismaClient.js";
/**
 * Returns the next globally unique generated invoice ID
 * by checking both Invoice and SelfInvoice tables.
 */
export async function getGeneratedId() {
  const [lastInvoice, lastSelfInvoice] = await Promise.all([
    prisma.invoice.findFirst({
      orderBy: {
        generated_id: "desc",
      },
      select: {
        generated_id: true,
      },
    }),

    prisma.selfInvoice.findFirst({
      orderBy: {
        generated_id: "desc",
      },
      select: {
        generated_id: true,
      },
    }),
  ]);

  console.log('=============================');
  
  console.log(lastInvoice);

  console.log(lastSelfInvoice);

  console.log('=============================');
  

  const maxInvoiceId = lastInvoice?.generated_id ?? 0;
  const maxSelfInvoiceId = lastSelfInvoice?.generated_id ?? 0;

  return Math.max(maxInvoiceId, maxSelfInvoiceId) + 1;
}