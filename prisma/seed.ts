/**
 * Seed inicial del sistema POS
 * Crea el usuario administrador por defecto
 *
 * Ejecutar con: npx prisma db seed
 * O manualmente: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
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
        password: hashed,
        role: 'admin',
        isActive: true,
      },
    });
    console.log(`✅ Admin creado: ${admin.email}`);
    console.log(`   Password:     ${adminPassword}`);
    console.log(`   ⚠️  Cambia la contraseña después del primer login!`);
  }

  // ─── Métodos de pago base ─────────────────────────────────────────────────
  const paymentMethods = [
    { name: 'Efectivo',          code: 'CASH',     isActive: true  },
    { name: 'Yape',              code: 'YAPE',     isActive: true  },
    { name: 'Plin',              code: 'PLIN',     isActive: true  },
    { name: 'Tarjeta de débito', code: 'CARD_DB',  isActive: true  },
    { name: 'Tarjeta de crédito',code: 'CARD_CR',  isActive: true  },
    { name: 'Transferencia',     code: 'TRANSFER', isActive: true  },
    { name: 'Contra entrega',    code: 'COD',      isActive: false },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: {},
      create: pm,
    });
  }
  console.log(`✅ Métodos de pago: ${paymentMethods.length} registros`);

  // ─── Configuración del sistema ────────────────────────────────────────────
  const configs = [
    { key: 'company_name',    value: 'Mi Empresa SAC',         description: 'Nombre de la empresa' },
    { key: 'company_ruc',     value: '20000000000',             description: 'RUC de la empresa' },
    { key: 'company_address', value: 'Tarapoto, San Martín',   description: 'Dirección fiscal' },
    { key: 'igv_rate',        value: '0.18',                   description: 'Tasa IGV (18%)' },
    { key: 'currency',        value: 'PEN',                    description: 'Moneda: PEN = Soles' },
    { key: 'invoice_series_boleta',  value: 'B001',            description: 'Serie para boletas' },
    { key: 'invoice_series_factura', value: 'F001',            description: 'Serie para facturas' },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
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
