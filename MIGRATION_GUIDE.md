# GUÍA DE MIGRACIÓN - Fase 1 a Fase 2+

## Estado Actual (Fase 1)
- Código existente: 100% funcional
- Datos normalizados: Disponibles en `_normalized`
- Dashboard: Sin cambios, usa `data` original
- Reglas: Usar `data._normalized.datos` si existen

## Timeline de Migración

### Semana 1-2: Validación
1. Crear Fase 1 (este código)
2. Ejecutar en ambiente de testing
3. Comparar scores: reglas antiguas vs nuevas
4. Validar con 50 documentos de GNP + 50 de MetLife

### Semana 3-4: Migración Gradual
1. Crear `scoring-engine-v2.ts` que usa campos normalizados
2. Ejecutar AMBAS en paralelo (v1 y v2)
3. Reportar ambos scores al Dashboard
4. QA compara resultados

### Semana 5-6: Cutover
1. Dashboard muestra ambos scores (legacy + nuevo)
2. Después de 2 semanas, si todo OK:
3. Eliminar scoring-v1
4. Cambiar Dashboard a usar solo scoring-v2

## Checklist de Validación

- [ ] Fase 1 compila sin errores
- [ ] FieldNormalizer funciona con datos reales GNP
- [ ] FieldNormalizer funciona con datos reales MetLife
- [ ] JSON.stringify(normalized) funciona (sin Map)
- [ ] _metadata.campos_mapeados es Record
- [ ] raw data se preserva en _normalized.raw
- [ ] Dashboard NO se rompió
- [ ] Tests: 50 docs GNP, 50 docs MetLife

## Próximos Pasos

Cuando Fase 1 esté validada:
1. Crear scoring-engine-v2.ts (usa campos estándar)
2. Crear reglas duales (v1 + v2)
3. Actualizar Dashboard para mostrar ambos scores
4. Deprecate v1 después de 2 semanas

## Preguntas de Auditoría

**¿Qué pasa si falla la normalización?**
→ Retorna _normalized.exito = false, usa datos raw

**¿Qué pasa si aseguradora nueva no está en config?**
→ Falla limpiamente con error: "Aseguradora no configurada"

**¿Cómo agrego una aseguradora nueva?**
→ Agregar 1 entry en ASEGURADORAS_CONFIG

**¿Puedo usar Fase 1 en producción?**
→ SÍ, pero solo como "información adicional", no decisión
