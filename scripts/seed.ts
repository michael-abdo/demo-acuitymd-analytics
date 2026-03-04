/**
 * Seed script for AcuityMD MedTech Analytics Demo
 *
 * Usage: npm run seed
 *
 * Seeds the database with realistic MedTech product data and FDA approval timelines.
 * Requires DATABASE_URL in .env pointing to a MySQL database.
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
const FDA_STATUSES = ['Approved', 'Under Review', 'Submitted'];
const STAGE_NAMES = ['Pre-Submission', '510(k) Submission', 'PMA Application', 'FDA Review', 'Clearance Granted'];
const RESPONSIBLE = ['Dr. Sarah Chen', 'Dr. James Patel', 'Regulatory Team A', 'Regulatory Team B', 'FDA CDRH', 'Compliance'];

const PRODUCT_PREFIXES = [
  'CardioFlow', 'NeuroGuide', 'OrthoFlex', 'VascuPatch', 'OptiScan',
  'BioMesh', 'PulseTrack', 'SpineAlign', 'DermaSeal', 'AirWay',
  'GlucoSense', 'RoboAssist', 'ThermoGuard', 'ArthroView', 'CeraCoat',
  'NanoStent', 'UltraSound', 'BioValve', 'LaserCut', 'SmartDrain',
];

const PRODUCT_SUFFIXES = [
  'Pro', 'Elite', 'X1', 'V3', 'HD', 'Plus', 'Ultra', 'Max', 'System', 'Monitor',
];

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);

  console.log('Clearing existing data...');
  await conn.query('DELETE FROM approval_processes');
  await conn.query('DELETE FROM medtech_products');

  console.log('Generating MedTech products...');
  const products: Array<{ id: number; name: string }> = [];

  for (let i = 0; i < 50; i++) {
    const name = `${randomItem(PRODUCT_PREFIXES)} ${randomItem(PRODUCT_SUFFIXES)} ${i + 1}`;
    const approvalDate = randomDate(new Date('2023-01-01'), new Date('2025-03-01'));
    const region = randomItem(REGIONS);
    // Higher sales in NA and Europe
    const baseUnits = region === 'North America' ? 5000 : region === 'Europe' ? 4000 : region === 'Asia Pacific' ? 2500 : 1000;
    const unitsSold = Math.floor(baseUnits + Math.random() * 10000);
    const fdaStatus = randomItem(FDA_STATUSES);

    const [result] = await conn.query(
      'INSERT INTO medtech_products (product_name, approval_date, market_region, units_sold, fda_status) VALUES (?, ?, ?, ?, ?)',
      [name, approvalDate.toISOString().split('T')[0], region, unitsSold, fdaStatus]
    );
    products.push({ id: (result as mysql.ResultSetHeader).insertId, name });
  }

  console.log(`Inserted ${products.length} products`);

  console.log('Generating approval processes...');
  let approvalCount = 0;

  for (const product of products) {
    const numStages = 2 + Math.floor(Math.random() * 3);
    let currentDate = randomDate(new Date('2023-01-01'), new Date('2024-06-01'));

    for (let j = 0; j < numStages; j++) {
      const stageName = STAGE_NAMES[j % STAGE_NAMES.length];
      const durationDays = 30 + Math.floor(Math.random() * 150);
      const endDate = new Date(currentDate.getTime() + durationDays * 86400000);
      const status = j < numStages - 1 ? 'Completed' : randomItem(['Completed', 'In Progress', 'Delayed']);

      await conn.query(
        'INSERT INTO approval_processes (stage_name, start_date, end_date, status, responsible_person) VALUES (?, ?, ?, ?, ?)',
        [
          stageName,
          currentDate.toISOString().split('T')[0],
          status === 'In Progress' ? null : endDate.toISOString().split('T')[0],
          status,
          randomItem(RESPONSIBLE),
        ]
      );

      currentDate = endDate;
      approvalCount++;
    }
  }

  console.log(`Inserted ${approvalCount} approval process stages`);
  await conn.end();
  console.log('Seeded!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
