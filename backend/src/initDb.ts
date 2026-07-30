import { query } from './config/db';
import bcrypt from 'bcryptjs';

export async function initDb() {
  console.log('🗄️  Initializing database tables...');

  await query(`CREATE TABLE IF NOT EXISTS \`Settings\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`companyName\` VARCHAR(255) DEFAULT 'Retail CRM',
    \`companyLogoUrl\` VARCHAR(500) NULL,
    \`operatingStart\` VARCHAR(50) DEFAULT '10:00',
    \`operatingEnd\` VARCHAR(50) DEFAULT '22:00',
    \`footfallGraceMin\` INT DEFAULT 30,
    \`footfallEditCutoff\` VARCHAR(50) DEFAULT '10:30',
    \`derEmail\` VARCHAR(255) NULL,
    \`derWhatsappNote\` VARCHAR(500) NULL,
    \`tvBoardPin\` VARCHAR(50) DEFAULT '9911',
    \`cashSettlementPin\` VARCHAR(50) DEFAULT '1234',
    \`vmChecklistPin\` VARCHAR(50) DEFAULT '5678',
    \`feedbackQ0Label\` VARCHAR(500) DEFAULT 'How was your shopping experience overall?',
    \`feedbackQ1Label\` VARCHAR(500) DEFAULT 'Would you recommend BSC Belagavi to friends & family?',
    \`feedbackQ2Label\` VARCHAR(500) DEFAULT 'How satisfied are you with our staff assistance & service?',
    \`feedbackQ3Label\` VARCHAR(500) DEFAULT 'Any additional comments or product requirements?',
    \`allowSelfRegister\` BOOLEAN DEFAULT TRUE,
    \`defaultRegisterRole\` VARCHAR(50) DEFAULT 'crm_staff',
    \`requireAdminApproval\` BOOLEAN DEFAULT FALSE,
    \`setupComplete\` BOOLEAN DEFAULT FALSE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  // Safe migrations for Settings columns
  try { await query("ALTER TABLE `Settings` ADD COLUMN `tvBoardPin` VARCHAR(50) DEFAULT '9911'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `cashSettlementPin` VARCHAR(50) DEFAULT '1234'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `vmChecklistPin` VARCHAR(50) DEFAULT '5678'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `feedbackQ0Label` VARCHAR(500) DEFAULT 'How was your shopping experience overall?'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `feedbackQ1Label` VARCHAR(500) DEFAULT 'Would you recommend BSC Belagavi to friends & family?'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `feedbackQ2Label` VARCHAR(500) DEFAULT 'How satisfied are you with our staff assistance & service?'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `feedbackQ3Label` VARCHAR(500) DEFAULT 'Any additional comments or product requirements?'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `allowSelfRegister` BOOLEAN DEFAULT TRUE"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `defaultRegisterRole` VARCHAR(50) DEFAULT 'crm_staff'"); } catch (_) {}
  try { await query("ALTER TABLE `Settings` ADD COLUMN `requireAdminApproval` BOOLEAN DEFAULT FALSE"); } catch (_) {}

  await query(`CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(255) NOT NULL,
    \`email\` VARCHAR(255) UNIQUE NOT NULL,
    \`password\` VARCHAR(255) NOT NULL,
    \`role\` ENUM('super_admin','admin','crm_manager','crm_staff','purchase_manager','telecaller','vm','pm','hr','greeter') NOT NULL,
    \`sectionsAssigned\` VARCHAR(255) DEFAULT 'ALL',
    \`pin\` VARCHAR(10) NULL,
    \`plainPassword\` VARCHAR(255) NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  // Add new columns to existing User table if they don't exist yet (safe migration)
  try { await query("ALTER TABLE `User` ADD COLUMN `pin` VARCHAR(10) NULL"); } catch (_) {}
  try { await query("ALTER TABLE `User` ADD COLUMN `plainPassword` VARCHAR(255) NULL"); } catch (_) {}
  try { await query("ALTER TABLE `User` MODIFY COLUMN `role` ENUM('super_admin','admin','crm_manager','crm_staff','purchase_manager','telecaller','vm','pm','hr','greeter') NOT NULL"); } catch (_) {}

  await query(`CREATE TABLE IF NOT EXISTS \`Section\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`sectionId\` VARCHAR(50) UNIQUE NOT NULL,
    \`sectionName\` VARCHAR(255) NOT NULL,
    \`type\` VARCHAR(100) NOT NULL,
    \`managerName\` VARCHAR(255) NULL,
    \`managerEmail\` VARCHAR(255) NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`FootfallEntry\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` VARCHAR(50) NOT NULL,
    \`slotStart\` INT NOT NULL,
    \`slotEnd\` INT NOT NULL,
    \`count\` INT NOT NULL,
    \`remarks\` VARCHAR(500) NULL,
    \`submittedBy\` VARCHAR(255) NOT NULL,
    \`editedBy\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL,
    UNIQUE KEY \`idx_date_slot\` (\`date\`, \`slotStart\`)
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`DailySummary\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` VARCHAR(50) UNIQUE NOT NULL,
    \`billsCount\` INT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`FeedbackQuestion\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`qId\` VARCHAR(50) UNIQUE NOT NULL,
    \`qText\` TEXT NOT NULL,
    \`options\` JSON NOT NULL,
    \`isMandatory\` BOOLEAN DEFAULT TRUE,
    \`displayOrder\` INT DEFAULT 1,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`Feedback\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` VARCHAR(50) NOT NULL,
    \`source\` VARCHAR(100) NOT NULL,
    \`area\` VARCHAR(255) NOT NULL,
    \`yourVoice\` TEXT NULL,
    \`custName\` VARCHAR(255) NULL,
    \`custMobile\` VARCHAR(50) NULL,
    \`custDob\` VARCHAR(50) NULL,
    \`q0\` VARCHAR(255) NULL, \`q0_other\` VARCHAR(255) NULL,
    \`q1\` VARCHAR(255) NULL, \`q1_other\` VARCHAR(255) NULL,
    \`q2\` VARCHAR(255) NULL, \`q2_other\` VARCHAR(255) NULL,
    \`q3\` VARCHAR(255) NULL, \`q3_other\` VARCHAR(255) NULL,
    \`q4\` VARCHAR(255) NULL, \`q4_other\` VARCHAR(255) NULL,
    \`q5\` VARCHAR(255) NULL, \`q5_other\` VARCHAR(255) NULL,
    \`q6\` VARCHAR(255) NULL, \`q6_other\` VARCHAR(255) NULL,
    \`q7\` VARCHAR(255) NULL, \`q7_other\` VARCHAR(255) NULL,
    \`status\` VARCHAR(50) DEFAULT 'new',
    \`actionTaken\` TEXT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`CallQueue\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`feedbackId\` INT UNIQUE NOT NULL,
    \`callType\` VARCHAR(100) NOT NULL,
    \`callStatus\` VARCHAR(100) NULL,
    \`callNote\` TEXT NULL,
    \`callAttempts\` INT DEFAULT 0,
    \`escalated\` BOOLEAN DEFAULT FALSE,
    \`followupDate\` VARCHAR(50) NULL,
    \`isDone\` BOOLEAN DEFAULT FALSE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL,
    FOREIGN KEY (\`feedbackId\`) REFERENCES \`Feedback\`(\`id\`) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`DivertReason\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`reasonId\` VARCHAR(50) UNIQUE NOT NULL,
    \`reasonText\` TEXT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`Divert\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`divertId\` VARCHAR(100) UNIQUE NOT NULL,
    \`date\` VARCHAR(50) NOT NULL,
    \`sectionId\` VARCHAR(50) NOT NULL,
    \`sectionName\` VARCHAR(255) NOT NULL,
    \`productWanted\` VARCHAR(255) NOT NULL,
    \`qty\` INT NULL,
    \`priceRange\` VARCHAR(255) NULL,
    \`fabricOccasion\` VARCHAR(255) NULL,
    \`reasonCode\` VARCHAR(50) NOT NULL,
    \`detailedRemarks\` TEXT NULL,
    \`comingBack\` VARCHAR(50) NOT NULL,
    \`custName\` VARCHAR(255) NULL,
    \`custMobile\` VARCHAR(50) NULL,
    \`expectedDate\` VARCHAR(50) NULL,
    \`raisedBy\` VARCHAR(255) NOT NULL,
    \`status\` VARCHAR(50) DEFAULT 'open',
    \`pmAction\` TEXT NULL,
    \`adminRemark\` TEXT NULL,
    \`closedAt\` DATETIME NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`DivertUpdate\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`divertId\` INT NOT NULL,
    \`updatedBy\` VARCHAR(255) NOT NULL,
    \`userId\` INT NOT NULL,
    \`role\` VARCHAR(100) NOT NULL,
    \`note\` TEXT NOT NULL,
    \`newStatus\` VARCHAR(100) NULL,
    \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`divertId\`) REFERENCES \`Divert\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`CashSettlement\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` VARCHAR(50) UNIQUE NOT NULL,
    \`saleAmount\` DECIMAL(12,2) NOT NULL,
    \`billsCount\` INT NOT NULL,
    \`abv\` DECIMAL(12,2) NOT NULL,
    \`cashTotal\` DECIMAL(12,2) NOT NULL,
    \`cardTotal\` DECIMAL(12,2) NOT NULL,
    \`upiTotal\` DECIMAL(12,2) NOT NULL,
    \`cashDiff\` DECIMAL(12,2) NOT NULL,
    \`cardDiff\` DECIMAL(12,2) NOT NULL,
    \`upiDiff\` DECIMAL(12,2) NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`CashCounterReport\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`settlementId\` INT NOT NULL,
    \`counterId\` VARCHAR(50) NOT NULL,
    \`cashierName\` VARCHAR(255) NOT NULL,
    \`cashDiff\` DECIMAL(12,2) NOT NULL,
    \`cardDiff\` DECIMAL(12,2) NOT NULL,
    \`upiDiff\` DECIMAL(12,2) NOT NULL,
    \`staffDisc\` DECIMAL(12,2) NOT NULL,
    \`custDisc\` DECIMAL(12,2) NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL,
    FOREIGN KEY (\`settlementId\`) REFERENCES \`CashSettlement\`(\`id\`) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`VMUser\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(255) UNIQUE NOT NULL,
    \`pin\` VARCHAR(255) NOT NULL,
    \`role\` VARCHAR(100) NOT NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`VMChecklistPoint\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`pointNo\` INT UNIQUE NOT NULL,
    \`aspect\` VARCHAR(255) NOT NULL,
    \`point\` TEXT NOT NULL,
    \`type\` VARCHAR(100) NOT NULL,
    \`frequency\` VARCHAR(100) NOT NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`VMSubmission\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` VARCHAR(50) NOT NULL,
    \`type\` VARCHAR(100) NOT NULL,
    \`floor\` VARCHAR(255) NULL,
    \`submittedBy\` VARCHAR(255) NOT NULL,
    \`score\` DECIMAL(5,2) NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`VMSubmissionEntry\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`submissionId\` INT NOT NULL,
    \`pointNo\` INT NOT NULL,
    \`value\` VARCHAR(50) NOT NULL,
    \`remarks\` TEXT NULL,
    \`photoLink\` VARCHAR(500) NULL,
    \`photoThumb\` VARCHAR(500) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL,
    FOREIGN KEY (\`submissionId\`) REFERENCES \`VMSubmission\`(\`id\`) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`AdminAuditLog\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`actorId\` INT NULL,
    \`actorName\` VARCHAR(255) NOT NULL,
    \`actorRole\` VARCHAR(100) NOT NULL,
    \`action\` VARCHAR(255) NOT NULL,
    \`targetType\` VARCHAR(100) NOT NULL,
    \`targetId\` VARCHAR(255) NULL,
    \`targetName\` VARCHAR(255) NULL,
    \`details\` TEXT NULL,
    \`ipAddress\` VARCHAR(100) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`Notification\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`senderId\` INT NULL,
    \`senderName\` VARCHAR(255) NOT NULL,
    \`senderRole\` VARCHAR(100) NOT NULL,
    \`targetRole\` VARCHAR(100) NOT NULL DEFAULT 'ALL',
    \`title\` VARCHAR(255) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`isRead\` BOOLEAN DEFAULT FALSE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`Employee\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`empNo\` VARCHAR(50) UNIQUE NOT NULL,
    \`name\` VARCHAR(255) NOT NULL,
    \`department\` VARCHAR(100) NOT NULL,
    \`section\` VARCHAR(100) NOT NULL,
    \`designation\` VARCHAR(100) NOT NULL,
    \`phone\` VARCHAR(50) NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL
  )`);

  await query(`CREATE TABLE IF NOT EXISTS \`Attendance\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`empId\` INT NOT NULL,
    \`date\` VARCHAR(50) NOT NULL,
    \`status\` VARCHAR(50) DEFAULT 'present',
    \`checkIn\` VARCHAR(50) NULL,
    \`checkOut\` VARCHAR(50) NULL,
    \`workedMinutes\` INT DEFAULT 0,
    \`remarks\` TEXT NULL,
    \`markedBy\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL,
    UNIQUE KEY \`emp_date_unique\` (\`empId\`, \`date\`),
    FOREIGN KEY (\`empId\`) REFERENCES \`Employee\`(\`id\`) ON DELETE CASCADE
  )`);

  console.log('✅ All database tables ready.');
  await seedIfEmpty();
  await ensureGreeterUsers();
  await ensureSampleEmployees();
}

async function ensureSampleEmployees() {
  try {
    const existing = await query('SELECT id FROM Employee LIMIT 1');
    if (existing.length === 0) {
      console.log('🌱 Seeding initial Employee staff roster...');
      await query(
        `INSERT INTO Employee (empNo, name, department, section, designation, phone) VALUES
         ('EMP-101', 'Rajesh Patil', 'Sales', 'Sarees Division', 'Senior Sales Executive', '9845012345'),
         ('EMP-102', 'Suresh Kumar', 'Sales', 'Mens Suitings', 'Floor Supervisor', '9765432100'),
         ('EMP-103', 'Anitha Rao', 'Billing', 'Cash Counter 1', 'Billing Cashier', '9654321009'),
         ('EMP-104', 'Durgappa K', 'Visual Merchandising', 'Floor 1', 'VM Executive', '9543210098'),
         ('EMP-105', 'Meena Kulkarni', 'Customer Support', 'Helpdesk', 'Greeter', '9432100987')`
      );
      console.log('✅ Sample employees seeded.');
    }
  } catch (err) {
    console.error('Failed to seed sample employees', err);
  }
}

async function ensureGreeterUsers() {
  try {
    const greeters = await query("SELECT id FROM User WHERE role = 'greeter' LIMIT 1");
    if (greeters.length === 0) {
      console.log('🌱 Seeding Greeter staff sample accounts...');
      const greeterHash = await bcrypt.hash('1234', 10);
      await query(
        `INSERT INTO User (name, email, password, role, sectionsAssigned, pin, plainPassword, isActive) VALUES
           (?, ?, ?, 'greeter', 'ALL', ?, ?, TRUE),
           (?, ?, ?, 'greeter', 'ALL', ?, ?, TRUE),
           (?, ?, ?, 'greeter', 'ALL', ?, ?, TRUE)`,
        [
          'Greeter 1 (Main Gate)', 'greeter1@store.com', greeterHash, '1234', '1234',
          'Greeter 2 (North Gate)', 'greeter2@store.com', greeterHash, '5678', '5678',
          'Greeter 3 (VIP Lounge)', 'greeter3@store.com', greeterHash, '4321', '4321'
        ]
      );
      console.log('✅ Greeter sample data successfully seeded (PINs: 1234, 5678, 4321).');
    }
  } catch (err) {
    console.error('Failed to verify/seed greeters', err);
  }
}

async function seedIfEmpty() {
  // Only seed when the database is completely fresh (no settings row)
  const existing = await query('SELECT id FROM Settings LIMIT 1');
  if (existing.length > 0) {
    console.log('ℹ️  Database already has data — skipping seed.');
    return;
  }

  console.log('🌱 First boot detected — seeding sample data...');

  // ── 1. Settings ─────────────────────────────────────────────────────────
  await query(
    `INSERT INTO Settings
       (companyName, companyLogoUrl, operatingStart, operatingEnd,
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

  // ── 2. Super Admin User (Login: admin@store.com / password123) ──────────
  const adminHash = await bcrypt.hash('password123', 10);
  await query(
    `INSERT INTO User (name, email, password, role, sectionsAssigned, plainPassword, isActive)
     VALUES (?, ?, ?, 'super_admin', 'ALL', ?, TRUE)`,
    ['Admin Manager', 'admin@store.com', adminHash, 'password123']
  );

  // ── 3. Extra Staff Users ─────────────────────────────────────────────────
  const crmHash  = await bcrypt.hash('crm123', 10);
  const teleHash = await bcrypt.hash('tele123', 10);
  await query(
    `INSERT INTO User (name, email, password, role, sectionsAssigned, plainPassword, isActive) VALUES
       (?, ?, ?, 'crm_manager', 'ALL', ?, TRUE),
       (?, ?, ?, 'telecaller',  'ALL', ?, TRUE)`,
    [
      'CRM Manager', 'crm@store.com',  crmHash,  'crm123',
      'Telecaller1', 'tele@store.com', teleHash, 'tele123'
    ]
  );

  // ── 3b. Greeter Users (PIN-based login) ─────────────────────────────────
  const greeterHash = await bcrypt.hash('1234', 10);
  await query(
    `INSERT INTO User (name, email, password, role, sectionsAssigned, pin, plainPassword, isActive) VALUES
       (?, ?, ?, 'greeter', 'ALL', ?, ?, TRUE),
       (?, ?, ?, 'greeter', 'ALL', ?, ?, TRUE)`,
    [
      'Greeter1', 'greeter1@store.com', greeterHash, '1234', '1234',
      'Greeter2', 'greeter2@store.com', greeterHash, '5678', '5678'
    ]
  );

  // ── 4. Sections ──────────────────────────────────────────────────────────
  const sections = [
    ['S1', 'Sarees Division',     'sales',     'Nitin Manager', 'nitin@store.com'],
    ['S2', 'Mens Suitings',       'sales',     'Sachin PM',     'sachin@store.com'],
    ['S3', 'Kids and Toys Section','sales',    'Anil PM',       'anil@store.com'],
    ['S4', 'Billing Counter',     'non_sales', null,            null]
  ];
  for (const s of sections) {
    await query(
      'INSERT INTO Section (sectionId, sectionName, type, managerName, managerEmail) VALUES (?, ?, ?, ?, ?)',
      s
    );
  }

  // ── 5. VM Users ──────────────────────────────────────────────────────────
  const vmUsers = [
    ['DURGAPPA',   '1111', 'staff'],
    ['PRASHANT',   '2222', 'staff'],
    ['NITIN',      '3333', 'staff'],
    ['VM_MANAGER', '9999', 'admin']
  ];
  for (const u of vmUsers) {
    await query('INSERT INTO VMUser (name, pin, role, isActive) VALUES (?, ?, ?, TRUE)', u);
  }

  // ── 6. VM Checklist Points ───────────────────────────────────────────────
  const checklistPoints = [
    [1, 'Mannequin Styling',    'Check if mannequins are styled per current theme.',         'overall', 'Daily'],
    [2, 'Display Alignment',    'Verify hanger displays are aligned neatly.',                'overall', 'Daily'],
    [3, 'Ironing & Pressing',   'Ensure displayed dresses are ironed without wrinkles.',     'floor',   'Daily'],
    [4, 'Lighting Check',       'Verify spot lights focus on lead designs.',                 'floor',   'Weekly'],
    [5, 'Signage & POS',        'All price tags and promo boards are correct and visible.',  'overall', 'Daily'],
    [6, 'Floor Cleanliness',    'Floors and shelves are dust-free and presentable.',         'floor',   'Daily']
  ];
  for (const p of checklistPoints) {
    await query(
      'INSERT INTO VMChecklistPoint (pointNo, aspect, point, type, frequency) VALUES (?, ?, ?, ?, ?)', p
    );
  }

  // ── 7. Feedback Questions ────────────────────────────────────────────────
  const feedbackQs = [
    ['Q0', 'How do you rate our service quality?',
     JSON.stringify(['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']), 1, 1],
    ['Q1', 'Would you recommend us to your friends and family?',
     JSON.stringify(['Yes, Definitely', 'Maybe', 'No']),                   1, 2],
    ['Q2', 'How was the product variety and selection?',
     JSON.stringify(['Excellent', 'Good', 'Average', 'Poor']),              1, 3],
    ['Q3', 'How do you rate the overall in-store experience?',
     JSON.stringify(['Excellent', 'Good', 'Average', 'Poor']),              1, 4]
  ];
  for (const q of feedbackQs) {
    await query(
      'INSERT INTO FeedbackQuestion (qId, qText, options, isMandatory, displayOrder) VALUES (?, ?, ?, ?, ?)', q
    );
  }

  // ── 8. Sample Feedback entries ───────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

  const f1: any = await query(
    `INSERT INTO Feedback
       (date, source, area, yourVoice, custName, custMobile, q0, q1, q2, q3, status)
     VALUES (?, 'staff', 'Ground Floor', ?, 'Amit Kumar', '9876543210',
             'Excellent', 'Yes, Definitely', 'Excellent', 'Excellent', 'new')`,
    [todayStr, 'Outstanding service and great collection — will visit again!']
  );

  const f2: any = await query(
    `INSERT INTO Feedback
       (date, source, area, yourVoice, custName, custMobile, q0, q1, q2, q3, status)
     VALUES (?, 'qr_self', '1st Floor', ?, 'Sunita Deshpande', '9123456789',
             'Poor', 'No', 'Average', 'Poor', 'new')`,
    [todayStr, 'Waited 20 minutes at counter — billing is very slow.']
  );

  const f3: any = await query(
    `INSERT INTO Feedback
       (date, source, area, yourVoice, custName, custMobile, q0, q1, q2, q3, status)
     VALUES (?, 'staff', '2nd Floor', ?, 'Ravi Shankar', '9988776655',
             'Good', 'Yes, Definitely', 'Good', 'Good', 'new')`,
    [todayStr, 'Good experience. More saree options would be great.']
  );

  // ── 9. Call Queue for negative feedback ──────────────────────────────────
  await query(
    `INSERT INTO CallQueue (feedbackId, callType, callAttempts, isDone)
     VALUES (?, 'negative', 0, FALSE)`,
    [f2.insertId]
  );

  // ── 10. Divert Reasons ───────────────────────────────────────────────────
  const reasons = [
    ['R1', 'Fabric out of stock'],
    ['R2', 'Color variant unavailable'],
    ['R3', 'Size variation mismatch'],
    ['R4', 'Price range mismatch'],
    ['R5', 'Design not available']
  ];
  for (const r of reasons) {
    await query('INSERT INTO DivertReason (reasonId, reasonText) VALUES (?, ?)', r);
  }

  // ── 11. Sample Diverts ───────────────────────────────────────────────────
  await query(
    `INSERT INTO Divert
       (divertId, date, sectionId, sectionName, productWanted, qty, priceRange,
        reasonCode, comingBack, custName, custMobile, raisedBy, status)
     VALUES
       ('DIV-1001', ?, 'S1', 'Sarees Division', 'Banarasi Silk Saree Green color',
        2, '₹8,000 - ₹12,000', 'R2', 'Yes', 'Rajesh Patil', '9845012345', 'Admin Manager', 'open'),
       ('DIV-1002', ?, 'S2', 'Mens Suitings', 'Navy Blue Blazer 42 size',
        1, '₹3,500 - ₹6,000', 'R3', 'Maybe', 'Kiran Desai', '9765432100', 'Admin Manager', 'open'),
       ('DIV-1003', ?, 'S3', 'Kids Wear', 'Frock Pink 6-8 years',
        3, '₹500 - ₹1,500', 'R1', 'Yes', 'Meena Kulkarni', '9654321009', 'Admin Manager', 'sourcing')`,
    [todayStr, todayStr, todayStr]
  );

  // ── 12. Today's Footfall slots ───────────────────────────────────────────
  const footfallSlots = [
    [todayStr, 10, 11, 45],
    [todayStr, 11, 12, 78],
    [todayStr, 12, 13, 92],
    [todayStr, 13, 14, 110],
    [todayStr, 14, 15, 88],
    [todayStr, 15, 16, 65]
  ];
  for (const slot of footfallSlots) {
    await query(
      `INSERT INTO FootfallEntry (date, slotStart, slotEnd, count, submittedBy)
       VALUES (?, ?, ?, ?, 'Admin Manager')`,
      slot
    );
  }

  // ── 13. Daily Bills Summary ──────────────────────────────────────────────
  await query(
    'INSERT INTO DailySummary (date, billsCount) VALUES (?, ?)',
    [todayStr, 184]
  );

  console.log('✅ Sample data seeded successfully!');
  console.log('   🔑 Login: admin@store.com  |  Password: password123');
  console.log('   🔑 Login: crm@store.com    |  Password: crm123');
}
