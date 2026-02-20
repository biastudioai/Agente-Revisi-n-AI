import prisma from '../config/database';

async function migrateAxa2018Forms(): Promise<void> {
  console.log('=== Migración de formularios AXA históricos ===\n');

  // Phase 1: Analysis (dry run)
  console.log('--- Fase 1: Análisis ---\n');

  const totalAxa: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms WHERE insurance_company = 'AXA'
  `;
  const total = Number(totalAxa[0].count);
  console.log(`Total formularios con insurance_company = 'AXA': ${total}`);

  if (total === 0) {
    console.log('\nNo hay formularios AXA para analizar. Nada que hacer.');
    return;
  }

  const toMigrate: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms
    WHERE insurance_company = 'AXA'
      AND jsonb_exists(form_data, 'transferencia_datos')
      AND NOT jsonb_exists(form_data, 'plan_terapeutico')
  `;
  const migrateCount = Number(toMigrate[0].count);

  const stayAxa2025: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms
    WHERE insurance_company = 'AXA'
      AND jsonb_exists(form_data, 'plan_terapeutico')
  `;
  const axa2025Count = Number(stayAxa2025[0].count);

  const ambiguous: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms
    WHERE insurance_company = 'AXA'
      AND NOT jsonb_exists(form_data, 'transferencia_datos')
      AND NOT jsonb_exists(form_data, 'plan_terapeutico')
  `;
  const ambiguousCount = Number(ambiguous[0].count);

  console.log(`  → A migrar a AXA_2018: ${migrateCount}`);
  console.log(`  → Se quedan como AXA (2025): ${axa2025Count}`);
  console.log(`  → Ambiguos (sin ninguna key): ${ambiguousCount}`);

  const sum = migrateCount + axa2025Count + ambiguousCount;
  if (sum !== total) {
    console.error(`\n¡ERROR! La suma no cuadra: ${migrateCount} + ${axa2025Count} + ${ambiguousCount} = ${sum} ≠ ${total}`);
    throw new Error('Conteo inconsistente, abortando migración');
  }
  console.log(`  ✓ Suma verificada: ${sum} = ${total}`);

  if (ambiguousCount > 0) {
    console.warn(`\n⚠ WARNING: ${ambiguousCount} formularios ambiguos NO serán migrados (no tienen transferencia_datos ni plan_terapeutico)`);
  }

  if (migrateCount === 0) {
    console.log('\n0 formularios para migrar. Nada que hacer.');
    return;
  }

  // Phase 2: Migration (single atomic UPDATE)
  console.log('\n--- Fase 2: Migración ---\n');

  const result: { count: bigint }[] = await prisma.$queryRaw`
    WITH updated AS (
      UPDATE medical_forms
      SET
        insurance_company = 'AXA_2018',
        form_data = jsonb_set(form_data, '{provider}', '"AXA_2018"')
      WHERE insurance_company = 'AXA'
        AND jsonb_exists(form_data, 'transferencia_datos')
        AND NOT jsonb_exists(form_data, 'plan_terapeutico')
      RETURNING id
    )
    SELECT COUNT(*) as count FROM updated
  `;
  const updatedCount = Number(result[0].count);
  console.log(`Formularios actualizados: ${updatedCount}`);

  if (updatedCount !== migrateCount) {
    console.error(`\n¡ERROR! Se esperaban ${migrateCount} actualizaciones pero se hicieron ${updatedCount}`);
    throw new Error('Conteo de actualización inesperado');
  }
  console.log(`  ✓ Coincide con el conteo esperado: ${migrateCount}`);

  // Phase 3: Verification
  console.log('\n--- Fase 3: Verificación ---\n');

  const postAxa2018: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms WHERE insurance_company = 'AXA_2018'
  `;
  console.log(`Formularios AXA_2018 después de migración: ${Number(postAxa2018[0].count)}`);

  const postAxa: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms WHERE insurance_company = 'AXA'
  `;
  console.log(`Formularios AXA restantes: ${Number(postAxa[0].count)}`);

  const missed: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms
    WHERE insurance_company = 'AXA'
      AND jsonb_exists(form_data, 'transferencia_datos')
      AND NOT jsonb_exists(form_data, 'plan_terapeutico')
  `;
  const missedCount = Number(missed[0].count);
  if (missedCount > 0) {
    console.error(`\n¡ERROR! ${missedCount} formularios cumplen el criterio pero NO fueron migrados`);
    throw new Error('Formularios sin migrar detectados');
  }
  console.log('  ✓ 0 formularios "missed" (todos los que cumplían el criterio fueron migrados)');

  const mismatches: { count: bigint }[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM medical_forms
    WHERE insurance_company = 'AXA_2018'
      AND (form_data->>'provider') IS DISTINCT FROM 'AXA_2018'
  `;
  const mismatchCount = Number(mismatches[0].count);
  if (mismatchCount > 0) {
    console.warn(`\n⚠ WARNING: ${mismatchCount} formularios AXA_2018 tienen mismatch en form_data.provider`);
  } else {
    console.log('  ✓ 0 mismatches entre insurance_company y form_data.provider');
  }

  // Sample records for spot-check
  const samples: { id: string; insurance_company: string; provider: string; created_at: Date }[] = await prisma.$queryRaw`
    SELECT id, insurance_company, form_data->>'provider' as provider, created_at
    FROM medical_forms
    WHERE insurance_company = 'AXA_2018'
    ORDER BY created_at DESC
    LIMIT 5
  `;
  if (samples.length > 0) {
    console.log('\nEjemplos de registros migrados (para verificación manual):');
    for (const s of samples) {
      console.log(`  id=${s.id}  insurance_company=${s.insurance_company}  provider=${s.provider}  created_at=${s.created_at}`);
    }
  }

  console.log('\n=== Migración completada exitosamente ===');
}

if (require.main === module) {
  migrateAxa2018Forms()
    .then(() => {
      console.log('\nScript de migración finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migración fallida:', error);
      process.exit(1);
    });
}

export { migrateAxa2018Forms };
