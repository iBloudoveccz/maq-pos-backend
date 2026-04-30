import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Base de datos
import { PrismaModule } from './prisma/prisma.module';

// Autenticación
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Módulos del negocio
import { UsersModule }     from './users/users.module';
import { ProductsModule }  from './products/products.module';
import { StockModule }     from './stock/stock.module';
import { CustomersModule } from './customers/customers.module';
import { QuotesModule }    from './quotes/quotes.module';
import { PaymentsModule }  from './payments/payments.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { BillingModule }   from './billing/billing.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    // Config global — disponible en todos los módulos sin importar
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Base de datos — @Global() en PrismaModule, disponible en todos
    PrismaModule,

    // Auth — exporta JwtModule y PassportModule para los demás módulos
    AuthModule,

    // Módulos del negocio
    UsersModule,
    ProductsModule,
    StockModule,
    CustomersModule,
    QuotesModule,
    PaymentsModule,
    PurchasesModule,
    ShipmentsModule,
    BillingModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Guards globales — se aplican a TODOS los endpoints automáticamente
    // Las rutas públicas se marcan con @Public() en el controller
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
