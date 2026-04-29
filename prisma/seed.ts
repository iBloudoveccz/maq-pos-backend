import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Usuario Admin ────────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@pos.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`⚠️  El usuario admin ya existe: ${adminEmail}`);
  } else {
    const hashed = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        code:         'ADMIN',   // FIX: code es @unique y requerido en el schema
        name:         'Administrador',
        email:        adminEmail,
        passwordHash: hashed,
        role:         UserRole.ADMIN,
        isActive:     true,
      },
    });
    console.log(`✅ Admin creado: ${admin.email} (code: ${admin.code})`);
    console.log(`   Password:    ${adminPassword}`);
    console.log(`   ⚠️  Cambia la contraseña después del primer login!`);
  }

  // ─── Métodos de pago ──────────────────────────────────────────────────────
  // FIX: PaymentMethod.code es @unique y requerido
  // Códigos basados en el S12: 01=Efectivo, 02=Tarjeta, D1=Plim, D2=Yape
  const pmCount = await prisma.paymentMethod.count();
  if (pmCount === 0) {
    await prisma.paymentMethod.createMany({
      data: [
        { code: '01', name: 'Efectivo',           type: 'cash',    isActive: true,  displayOrder: 1 },
        { code: 'D2', name: 'Yape',               type: 'digital', isActive: true,  displayOrder: 2 },
        { code: 'D1', name: 'Plin',               type: 'digital', isActive: true,  displayOrder: 3 },
        { code: '02', name: 'Tarjeta de crédito', type: 'card',    isActive: true,  displayOrder: 4 },
        { code: '03', name: 'Transferencia BCP',  type: 'bank',    isActive: true,  displayOrder: 5 },
        { code: '04', name: 'Transferencia BBVA', type: 'bank',    isActive: true,  displayOrder: 6 },
        { code: '05', name: 'Contra entrega',     type: 'cash',    isActive: false, displayOrder: 7 },
      ],
    });
    console.log('✅ Métodos de pago creados');
  } else {
    console.log(`⚠️  PaymentMethod ya tiene ${pmCount} registros — saltando`);
  }

  // ─── Secuencias de comprobantes SUNAT ────────────────────────────────────
  const seqCount = await prisma.invoiceSequence.count();
  if (seqCount === 0) {
    await prisma.invoiceSequence.createMany({
      data: [
        { series: 'B001', invoiceType: 'BOLETA',  lastNumber: 0, isActive: true },
        { series: 'F001', invoiceType: 'FACTURA', lastNumber: 0, isActive: true },
      ],
    });
    console.log('✅ Secuencias de comprobantes creadas');
  }

  // ─── Almacén principal ────────────────────────────────────────────────────
  const warehouseCount = await prisma.warehouse.count();
  if (warehouseCount === 0) {
    const wh = await prisma.warehouse.create({
      data: {
        code:     '01',
        name:     'Almacén Principal',
        isBranch: false,
        isActive: true,
      },
    });
    console.log(`✅ Almacén creado: ${wh.name}`);

    // Terminal POS principal
    await prisma.terminal.create({
      data: {
        code:        '01',
        name:        'POS Principal',
        warehouseId: wh.id,
        isActive:    true,
      },
    });
    console.log('✅ Terminal POS creado');
  }

  // ─── Configuración del sistema ────────────────────────────────────────────
  const configs = [
    { key: 'company_name',           value: 'Mi Empresa SAC',        description: 'Nombre de la empresa' },
    { key: 'company_ruc',            value: '20000000000',            description: 'RUC de la empresa' },
    { key: 'company_address',        value: 'Tarapoto, San Martín',   description: 'Dirección fiscal' },
    { key: 'igv_rate',               value: '0.18',                   description: 'Tasa IGV (18%)' },
    { key: 'currency',               value: 'PEN',                    description: 'Moneda' },
    { key: 'currency_symbol',        value: 'S/.',                    description: 'Símbolo de moneda' },
    { key: 'invoice_series_boleta',  value: 'B001',                   description: 'Serie para boletas' },
    { key: 'invoice_series_factura', value: 'F001',                   description: 'Serie para facturas' },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where:  { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log(`✅ Configuración del sistema: ${configs.length} claves`);

  console.log('\n🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
