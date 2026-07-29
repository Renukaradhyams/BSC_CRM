import { query } from './config/db';
import pool from './config/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clear all tables (in FK-safe order)
  await query('DELETE FROM DivertUpdate');
  await query('DELETE FROM Divert');
  await query('DELETE FROM DivertReason');
  await query('DELETE FROM CallQueue');
  await query('DELETE FROM Feedback');
  await query('DELETE FROM FeedbackQuestion');
  await query('DELETE FROM DailySummary');
  await query('DELETE FROM FootfallEntry');
  await query('DELETE FROM Section');
  await query('DELETE FROM VMSubmissionEntry');
  await query('DELETE FROM VMSubmission');
  await query('DELETE FROM VMChecklistPoint');
  await query('DELETE FROM VMUser');
  await query('DELETE FROM User');
  await query('DELETE FROM Settings');

  // 2. Seed Settings
  await query(
    `INSERT INTO Settings (companyName, companyLogoUrl, operatingStart, operatingEnd,
       footfallGraceMin, footfallEditCutoff, derEmail, derWhatsappNote, setupComplete)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      'BSC Textiles Belagavi',
      'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg',
      '10:00', '22:00', 30, '10:30',
      'manager@bsctextiles.com',
      'Day summary details are compiled.'
    ]
  );
  console.log('✅ Settings seeded');

  // 3. Seed Super Admin User
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  await query(
    `INSERT INTO User (name, email, password, role, sectionsAssigned, isActive) VALUES (?, ?, ?, 'super_admin', 'ALL', TRUE)`,
    ['Admin Manager', 'admin@store.com', adminPasswordHash]
  );
  console.log('✅ Default Admin User created (admin@store.com / password123)');

  // 4. Seed Sections
  const sections = [
    ['S1', 'Sarees Division', 'sales', 'Nitin Manager', 'nitin@store.com'],
    ['S2', 'Mens Suitings', 'sales', 'Sachin PM', 'sachin@store.com'],
    ['S3', 'Kids Wear', 'sales', 'Anil PM', 'anil@store.com'],
    ['S4', 'Billing Counter', 'non_sales', null, null]
  ];
  for (const s of sections) {
    await query(
      'INSERT INTO Section (sectionId, sectionName, type, managerName, managerEmail) VALUES (?, ?, ?, ?, ?)',
      s
    );
  }
  console.log('✅ Department Sections seeded');

  // 5. Seed VM Users
  const vmUsers = [
    ['DURGAPPA', '1111', 'staff'],
    ['PRASHANT', '2222', 'staff'],
    ['NITIN', '3333', 'staff'],
    ['VM_MANAGER', '9999', 'admin']
  ];
  for (const u of vmUsers) {
    await query('INSERT INTO VMUser (name, pin, role, isActive) VALUES (?, ?, ?, TRUE)', u);
  }
  console.log('✅ VM Users seeded');

  // 6. Seed VM Checklist Points
  const checklistPoints = [
    [1, 'Mannequin Styling', 'Check if mannequins are styled according to current theme.', 'overall', 'Daily'],
    [2, 'Display Alignment', 'Verify that hanger displays are aligned neatly.', 'overall', 'Daily'],
    [3, 'Ironing & Pressing', 'Ensure displayed dresses are ironed properly without wrinkles.', 'floor', 'Daily'],
    [4, 'Lighting Check', 'Verify spot lights focus on lead designs.', 'floor', 'Weekly']
  ];
  for (const p of checklistPoints) {
    await query(
      'INSERT INTO VMChecklistPoint (pointNo, aspect, point, type, frequency) VALUES (?, ?, ?, ?, ?)', p
    );
  }
  console.log('✅ VM Checklist Points seeded');

  // 7. Seed Feedback Questions
  const feedbackQuestions = [
    ['Q0', 'How do you rate our service quality?', JSON.stringify(['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']), 1, 1],
    ['Q1', 'Would you recommend us to friends?', JSON.stringify(['Yes, Definitely', 'Maybe', 'No']), 1, 2]
  ];
  for (const q of feedbackQuestions) {
    await query(
      'INSERT INTO FeedbackQuestion (qId, qText, options, isMandatory, displayOrder) VALUES (?, ?, ?, ?, ?)', q
    );
  }
  console.log('✅ Feedback Questions seeded');

  // 8. Seed Customer Feedback
  const todayStr = new Date().toLocaleDateString('en-GB');
  const [f1Result]: any = await query(
    `INSERT INTO Feedback (date, source, area, yourVoice, custName, custMobile, q0, q1, status)
     VALUES (?, 'staff', 'Ground Floor', ?, ?, '9876543210', 'Excellent', 'Yes, Definitely', 'new')`,
    [todayStr, 'Outstanding service, great collections!', 'Amit Kumar']
  );
  const [f2Result]: any = await query(
    `INSERT INTO Feedback (date, source, area, yourVoice, custName, custMobile, q0, q1, status)
     VALUES (?, 'qr_self', '1st Floor', ?, ?, '9123456789', 'Poor', 'No', 'new')`,
    [todayStr, 'Waited 20 minutes at counter, billing is very slow.', 'Sunita Deshpande']
  );
  const f2Id = f2Result.insertId;
  await query(
    "INSERT INTO CallQueue (feedbackId, callType, callAttempts, isDone) VALUES (?, 'negative', 0, FALSE)",
    [f2Id]
  );
  console.log('✅ Customer Feedbacks & Call Queue seeded');

  // 9. Seed Divert Reasons
  const reasons = [
    ['R1', 'Fabric out of stock'],
    ['R2', 'Color variant unavailable'],
    ['R3', 'Size variation mismatch']
  ];
  for (const r of reasons) {
    await query('INSERT INTO DivertReason (reasonId, reasonText) VALUES (?, ?)', r);
  }
  await query(
    `INSERT INTO Divert (divertId, date, sectionId, sectionName, productWanted, qty, priceRange,
       reasonCode, comingBack, custName, custMobile, raisedBy, status)
     VALUES ('DIV-1001', ?, 'S1', 'Sarees Division', 'Banarasi Silk Saree Green color', 2,
       '₹8,000 - ₹12,000', 'R2', 'Yes', 'Rajesh Patil', '9845012345', 'Admin Manager', 'open')`,
    [todayStr]
  );
  console.log('✅ Sourcing Divert items seeded');

  console.log('🌱 Seeding process complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await pool.end(); });
