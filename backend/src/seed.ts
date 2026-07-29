import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clear existing records to avoid unique constraint violations
  await prisma.divertUpdate.deleteMany();
  await prisma.divert.deleteMany();
  await prisma.divertReason.deleteMany();
  await prisma.callQueue.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.feedbackQuestion.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.footfallEntry.deleteMany();
  await prisma.section.deleteMany();
  await prisma.vMSubmissionEntry.deleteMany();
  await prisma.vMSubmission.deleteMany();
  await prisma.vMChecklistPoint.deleteMany();
  await prisma.vMUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  // 2. Seed Store Settings
  const settings = await prisma.settings.create({
    data: {
      companyName: "BSC Textiles Belagavi",
      companyLogoUrl: "https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg",
      operatingStart: "10:00",
      operatingEnd: "22:00",
      footfallGraceMin: 30,
      footfallEditCutoff: "10:30",
      derEmail: "manager@bsctextiles.com",
      derWhatsappNote: "Day summary details are compiled.",
      setupComplete: true
    }
  });
  console.log('✅ Settings seeded');

  // 3. Seed Default Super Admin User
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: {
      name: "Admin Manager",
      email: "admin@store.com",
      password: adminPasswordHash,
      role: "super_admin",
      sectionsAssigned: "ALL",
      isActive: true
    }
  });
  console.log('✅ Default Admin User created (admin@store.com / password123)');

  // 4. Seed Sections
  const sec1 = await prisma.section.create({ data: { sectionId: "S1", sectionName: "Sarees Division", type: "sales", managerName: "Nitin Manager", managerEmail: "nitin@store.com" } });
  const sec2 = await prisma.section.create({ data: { sectionId: "S2", sectionName: "Mens Suitings", type: "sales", managerName: "Sachin PM", managerEmail: "sachin@store.com" } });
  const sec3 = await prisma.section.create({ data: { sectionId: "S3", sectionName: "Kids Wear", type: "sales", managerName: "Anil PM", managerEmail: "anil@store.com" } });
  const sec4 = await prisma.section.create({ data: { sectionId: "S4", sectionName: "Billing Counter", type: "non_sales" } });
  console.log('✅ Department Sections seeded');

  // 5. Seed VM Users
  await prisma.vMUser.createMany({
    data: [
      { name: "DURGAPPA", pin: "1111", role: "staff", isActive: true },
      { name: "PRASHANT", pin: "2222", role: "staff", isActive: true },
      { name: "NITIN", pin: "3333", role: "staff", isActive: true },
      { name: "VM_MANAGER", pin: "9999", role: "admin", isActive: true }
    ]
  });
  console.log('✅ VM Users seeded');

  // 6. Seed VM Checklist points
  await prisma.vMChecklistPoint.createMany({
    data: [
      { pointNo: 1, aspect: "Mannequin Styling", point: "Check if mannequins are styled according to current theme.", type: "Overall", frequency: "Daily" },
      { pointNo: 2, aspect: "Display Alignment", point: "Verify that hanger displays are aligned neatly.", type: "Overall", frequency: "Daily" },
      { pointNo: 3, aspect: "Ironing & Pressing", point: "Ensure displayed dresses are ironed properly without wrinkles.", type: "Floor", frequency: "Daily" },
      { pointNo: 4, aspect: "Lighting Check", point: "Verify spot lights focus on lead designs.", type: "Floor", frequency: "Weekly" }
    ]
  });
  console.log('✅ VM Checklist Points seeded');

  // 7. Seed feedback questions
  await prisma.feedbackQuestion.createMany({
    data: [
      { qId: "Q0", qText: "How do you rate our service quality?", options: JSON.stringify(["Excellent", "Good", "Average", "Poor", "Very Poor"]), isMandatory: true, displayOrder: 1 },
      { qId: "Q1", qText: "Would you recommend us to friends?", options: JSON.stringify(["Yes, Definitely", "Maybe", "No"]), isMandatory: true, displayOrder: 2 }
    ]
  });
  console.log('✅ Feedback Questions seeded');

  // 8. Seed Customer Feedback and Call Queue
  const f1 = await prisma.feedback.create({
    data: {
      date: new Date().toLocaleDateString('en-GB'),
      source: "staff",
      area: "Ground Floor",
      yourVoice: "Outstanding service, great collections!",
      custName: "Amit Kumar",
      custMobile: "9876543210",
      q0: "Excellent",
      q1: "Yes, Definitely",
      status: "new"
    }
  });

  const f2 = await prisma.feedback.create({
    data: {
      date: new Date().toLocaleDateString('en-GB'),
      source: "qr_self",
      area: "1st Floor",
      yourVoice: "Waited 20 minutes at counter, billing is very slow.",
      custName: "Sunita Deshpande",
      custMobile: "9123456789",
      q0: "Poor",
      q1: "No",
      status: "new"
    }
  });

  // Negative feedback adds entry to telecaller Call Queue
  await prisma.callQueue.create({
    data: {
      feedbackId: f2.id,
      callType: "negative",
      callAttempts: 0,
      isDone: false
    }
  });
  console.log('✅ Customer Feedbacks & Call Queue seeded');

  // 9. Seed Sourcing Diverts
  await prisma.divertReason.createMany({
    data: [
      { reasonId: "R1", reasonText: "Fabric out of stock" },
      { reasonId: "R2", reasonText: "Color variant unavailable" },
      { reasonId: "R3", reasonText: "Size variation mismatch" }
    ]
  });

  await prisma.divert.create({
    data: {
      divertId: "DIV-1001",
      date: new Date().toLocaleDateString('en-GB'),
      sectionId: "S1",
      sectionName: "Sarees Division",
      productWanted: "Banarasi Silk Saree Green color",
      qty: 2,
      priceRange: "₹8,000 - ₹12,000",
      reasonCode: "R2",
      comingBack: "Yes",
      custName: "Rajesh Patil",
      custMobile: "9845012345",
      raisedBy: "Admin Manager",
      status: "open"
    }
  });
  console.log('✅ Sourcing Divert items seeded');

  console.log('🌱 Seeding process complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
