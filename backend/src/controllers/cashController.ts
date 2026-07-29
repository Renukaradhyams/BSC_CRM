import { Request, Response } from 'express';
import { query, transaction } from '../config/db';
import mysql from 'mysql2/promise';

// Get active counters and cashiers (preset values)
export const getMaster = async (req: Request, res: Response) => {
  try {
    const counterIds = ["CS1", "CS2", "CS3", "CS4", "CS5", "CS6", "CS7", "CS8"];
    const cashierNames = ["DURGAPPA", "PRASHANT", "NITIN", "SHRIDAR", "SACHIN", "ANIL", "PRAKASH", "CASHIER2"];
    return res.json({ ok: true, counterIds, cashierNames });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Save Cash Settlement & Counter Reports inside a transaction
export const saveSettlement = async (req: Request, res: Response) => {
  try {
    const { date, saleAmount, billsCount, abv, cashTotal, cardTotal, upiTotal,
      cashDiff, cardDiff, upiDiff, counters } = req.body;

    if (!date || saleAmount === undefined || billsCount === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing settlement data parameters' });
    }

    const settlement = await transaction(async (conn: mysql.PoolConnection) => {
      // 1. Find existing settlement
      const [existingRows] = await conn.execute(
        'SELECT id FROM CashSettlement WHERE date = ? LIMIT 1', [date]
      ) as any;
      const existing = (existingRows as any[])[0];

      if (existing) {
        // Delete old counter reports
        await conn.execute('DELETE FROM CashCounterReport WHERE settlementId = ?', [existing.id]);
        // Update settlement record
        await conn.execute(
          `UPDATE CashSettlement SET saleAmount=?, billsCount=?, abv=?, cashTotal=?, cardTotal=?,
           upiTotal=?, cashDiff=?, cardDiff=?, upiDiff=? WHERE id=?`,
          [saleAmount, parseInt(billsCount, 10), abv, cashTotal, cardTotal, upiTotal,
            cashDiff, cardDiff, upiDiff, existing.id]
        );
        // Insert counter reports
        if (counters && Array.isArray(counters)) {
          for (const row of counters) {
            await conn.execute(
              `INSERT INTO CashCounterReport (settlementId, counterId, cashierName, cashDiff, cardDiff, upiDiff, staffDisc, custDisc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [existing.id, row.counterId, row.cashierName, row.cashDiff || 0, row.cardDiff || 0,
                row.upiDiff || 0, row.staffDisc || 0, row.custDisc || 0]
            );
          }
        }
        return { id: existing.id, date };
      } else {
        // Create new settlement record
        const [result] = await conn.execute(
          `INSERT INTO CashSettlement (date, saleAmount, billsCount, abv, cashTotal, cardTotal,
             upiTotal, cashDiff, cardDiff, upiDiff) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, saleAmount, parseInt(billsCount, 10), abv, cashTotal, cardTotal, upiTotal,
            cashDiff, cardDiff, upiDiff]
        ) as any;
        const masterId = (result as any).insertId;
        // Insert counter reports
        if (counters && Array.isArray(counters)) {
          for (const row of counters) {
            await conn.execute(
              `INSERT INTO CashCounterReport (settlementId, counterId, cashierName, cashDiff, cardDiff, upiDiff, staffDisc, custDisc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [masterId, row.counterId, row.cashierName, row.cashDiff || 0, row.cardDiff || 0,
                row.upiDiff || 0, row.staffDisc || 0, row.custDisc || 0]
            );
          }
        }
        return { id: masterId, date };
      }
    });

    return res.json({ ok: true, settlement });
  } catch (err: any) {
    console.error('Settlement save error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
