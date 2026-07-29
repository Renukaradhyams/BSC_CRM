import { Request, Response } from 'express';
import prisma from '../config/db';

// Get active counters and cashiers
export const getMaster = async (req: Request, res: Response) => {
  try {
    // Preset fallback IDs and Cashier Names (can be extended to dynamic database tables)
    const counterIds = ["CS1", "CS2", "CS3", "CS4", "CS5", "CS6", "CS7", "CS8"];
    const cashierNames = ["DURGAPPA", "PRASHANT", "NITIN", "SHRIDAR", "SACHIN", "ANIL", "PRAKASH", "CASHIER2"];

    return res.json({
      ok: true,
      counterIds,
      cashierNames
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Save Cash Settlement & Counter Reports
export const saveSettlement = async (req: Request, res: Response) => {
  try {
    const { date, saleAmount, billsCount, abv, cashTotal, cardTotal, upiTotal, cashDiff, cardDiff, upiDiff, counters } = req.body;

    if (!date || saleAmount === undefined || billsCount === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing settlement data parameters' });
    }

    // Wrap in a transaction to ensure atomic execution
    const settlement = await prisma.$transaction(async (tx) => {
      // 1. Delete previous counter reports if existing
      const existing = await tx.cashSettlement.findUnique({
        where: { date }
      });
      if (existing) {
        await tx.cashCounterReport.deleteMany({
          where: { settlementId: existing.id }
        });
      }

      // 2. Upsert master settlement record
      const master = await tx.cashSettlement.upsert({
        where: { date },
        update: {
          saleAmount,
          billsCount: parseInt(billsCount, 10),
          abv,
          cashTotal,
          cardTotal,
          upiTotal,
          cashDiff,
          cardDiff,
          upiDiff
        },
        create: {
          date,
          saleAmount,
          billsCount: parseInt(billsCount, 10),
          abv,
          cashTotal,
          cardTotal,
          upiTotal,
          cashDiff,
          cardDiff,
          upiDiff
        }
      });

      // 3. Create counter report entries
      if (counters && Array.isArray(counters)) {
        for (const row of counters) {
          await tx.cashCounterReport.create({
            data: {
              settlementId: master.id,
              counterId: row.counterId,
              cashierName: row.cashierName,
              cashDiff: row.cashDiff || 0,
              cardDiff: row.cardDiff || 0,
              upiDiff: row.upiDiff || 0,
              staffDisc: row.staffDisc || 0,
              custDisc: row.custDisc || 0
            }
          });
        }
      }

      return master;
    });

    return res.json({ ok: true, settlement });
  } catch (err: any) {
    console.error('Settlement save error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
