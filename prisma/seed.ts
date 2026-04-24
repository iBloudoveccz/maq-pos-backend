/**
 * Seed inicial del sistema POS
 * Crea el usuario administrador, métodos de pago y configuración base.
 *
 * Ejecutar con: npx prisma db seed
 *
 * Nota: PaymentMethod.name no es @unique en el schema, por eso se usa
 * "count() === 0 -> createMany" en vez de upsert. Si quieres idempotencia
 * más fina, agrega @unique a PaymentMethod.name en schema.prisma y migra.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Usuario Admin por defecto ───────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pos.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`⚠️  El usuario admin ya existe: ${adminEmail}`);
  } else {
    const hashed = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        passwordHash: hashed,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Admin creado: ${admin.email}`);
    console.log(`   Password:     ${adminPassword}`);
    console.log(`   ⚠️  Cambia la contraseña después del primer login!`);
  }

  // ─── Métodos de pago base ─────────────────────────────────────────────────
  // PaymentMethod.name no es @unique, así que solo poblamos si la tabla está vacía.
  const pmCount = await prisma.paymentMethod.count();
  if (pmCount === 0) {
    const paymentMethods = [
      { name: 'Efectivo',           type: 'cash',     isActive: true,  displayOrder: 1 },
      { name: 'Yape',               type: 'digital',  isActive: true,  displayOrder: 2 },
      { name: 'Plin',               type: 'digital',  isActive: true,  displayOrder: 3 },
      { name: 'Tarjeta de débito',  type: 'card',     isActive: true,  displayOrder: 4 },
      { name: 'Tarjeta de crédito', type: 'card',     isActive: true,  displayOrder: 5 },
      { name: 'Transferencia',      type: 'transfer', isActive: true,  displayOrder: 6 },
      { name: 'Contra entrega',     type: 'cash',     isActive: false, displayOrder: 7 },
    ];
    await prisma.paymentMethod.createMany({ data: paymentMethods });
    console.log(`✅ Métodos de pago: ${paymentMethods.length} registros creados`);
  } else {
    console.log(`⚠️  PaymentMethod ya tiene ${pmCount} registros — saltando`);
  }

  // ─── Configuración del sistema ────────────────────────────────────────────
  // SystemConfig.key SÍ es @id, así que upsert funciona perfectamente.
  const configs = [
    { key: 'company_name',           value: 'Mi Empresa SAC',       description: 'Nombre de la empresa' },
    { key: 'company_ruc',            value: '20000000000',          description: 'RUC de la empresa' },
    { key: 'company_address',        value: 'Tarapoto, San Martín', description: 'Dirección fiscal' },
    { key: 'igv_rate',               value: '0.18',                 description: 'Tasa IGV (18%)' },
    { key: 'currency',               value: 'PEN',                  description: 'Moneda: PEN = Soles' },
    { key: 'invoice_series_boleta',  value: 'B001',                 description: 'Serie para boletas' },
    { key: 'invoice_series_factura', value: 'F001',                 description: 'Serie para facturas' },
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
  .finally(async () => {
    await prisma.$disconnect();
  });
