# PATH VALIDATION CHECKLIST

Este documento lista TODOS los paths de mapeo usados en `aseguradora-configs.ts`.
Úsalo para validar que los paths coinciden con la estructura JSON real de Gemini.

## Cómo Validar

1. Procesa un documento real de cada aseguradora
2. Obtén el JSON crudo que devuelve Gemini
3. Compara los paths listados aquí con la estructura real
4. Ajusta `config/aseguradora-configs.ts` si hay discrepancias

---

## GNP - Paths de Mapeo

### Paciente
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| paciente.nombre | `paciente.nombres` | [ ] |
| paciente.apellido_paterno | `paciente.apellido_paterno` | [ ] |
| paciente.apellido_materno | `paciente.apellido_materno` | [ ] |
| paciente.edad | `paciente.edad` | [ ] |
| paciente.sexo | `paciente.sexo` | [ ] |

### Póliza
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| poliza.numero | `poliza.numero` | [ ] |

### Médico Tratante
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| medico_tratante.nombre | `medico.nombres` | [ ] |
| medico_tratante.apellido_paterno | `medico.apellido_paterno` | [ ] |
| medico_tratante.apellido_materno | `medico.apellido_materno` | [ ] |
| medico_tratante.cedula_profesional | `medico.cedula` | [ ] |
| medico_tratante.especialidad | `medico.especialidad` | [ ] |
| medico_tratante.telefono | `medico.telefono` | [ ] |
| medico_tratante.correo | `medico.email` | [ ] |

### Fechas
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| fecha.ingreso | `hospitalizacion.fecha_ingreso` | [ ] |
| fecha.egreso | `hospitalizacion.fecha_egreso` | [ ] |
| fecha.diagnostico | `diagnostico.fecha` | [ ] |
| fecha.cirugia | `cirugia.fecha_cirugia` | [ ] |

### Diagnóstico
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| diagnostico.codigo_cie | `diagnostico.codigo_cie10` | [ ] |
| diagnostico.descripcion | `diagnostico.descripcion_texto` | [ ] |

### Intervención Quirúrgica
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| intervencion_qx.hubo_cirugia | `cirugia.realizada` | [ ] |
| intervencion_qx.tipo_anestesia | `cirugia.tipo_anestesia` | [ ] |
| intervencion_qx.descripcion | `cirugia.descripcion_procedimiento` | [ ] |

### Signos Vitales
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| signos_vitales.temperatura | `signos_vitales.temperatura` | [ ] |
| signos_vitales.frecuencia_cardiaca | `signos_vitales.pulso` | [ ] |
| signos_vitales.presion_sistolica | `signos_vitales.presion_sistolica_calculada` | [ ] |

### Documentación
| Campo Estándar | Path en JSON GNP | Validar |
|----------------|------------------|---------|
| firma_medico | `medico.firma_presente` | [ ] |

---

## METLIFE - Paths de Mapeo

### Paciente
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| paciente.nombre | `identificacion.nombre_completo` | [ ] |
| paciente.apellido_paterno | `identificacion.apellido_paterno` | [ ] |
| paciente.apellido_materno | `identificacion.apellido_materno` | [ ] |
| paciente.edad | `identificacion.edad` | [ ] |
| paciente.sexo | `identificacion.sexo` | [ ] |

### Póliza
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| poliza.numero | `poliza.numero_poliza` | [ ] |

### Médico Tratante
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| medico_tratante.nombre | `medico.nombre_completo` | [ ] |
| medico_tratante.apellido_paterno | `medico.apellido_paterno` | [ ] |
| medico_tratante.cedula_profesional | `medico.cedula_profesional` | [ ] |
| medico_tratante.especialidad | `medico.especialidad_medica` | [ ] |
| medico_tratante.telefono | `medico.telefono_consultorio` | [ ] |
| medico_tratante.correo | `medico.correo_electronico` | [ ] |

### Fechas
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| fecha.ingreso | `hospitalizacion.fecha_entrada_hospital` | [ ] |
| fecha.egreso | `hospitalizacion.fecha_salida_hospital` | [ ] |
| fecha.diagnostico | `diagnostico.fecha_diagnostico` | [ ] |
| fecha.cirugia | `procedimiento_quirurgico.fecha_procedimiento` | [ ] |

### Diagnóstico
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| diagnostico.codigo_cie | `diagnostico.cie10_principal` | [ ] |
| diagnostico.descripcion | `diagnostico.descripcion_diagnostico` | [ ] |

### Intervención Quirúrgica
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| intervencion_qx.hubo_cirugia | `procedimiento_quirurgico.realizado` | [ ] |
| intervencion_qx.tipo_anestesia | `procedimiento_quirurgico.tipo_anestesia_aplicada` | [ ] |
| intervencion_qx.descripcion | `procedimiento_quirurgico.descripcion_procedimiento` | [ ] |

### Signos Vitales
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| signos_vitales.temperatura | `exploracion_fisica.temperatura_corporal` | [ ] |
| signos_vitales.frecuencia_cardiaca | `exploracion_fisica.frecuencia_cardiaca` | [ ] |
| signos_vitales.presion_sistolica | `exploracion_fisica.presion_arterial_sistolica` | [ ] |

### Documentación
| Campo Estándar | Path en JSON MetLife | Validar |
|----------------|----------------------|---------|
| firma_medico | `documentacion.firma_medico_presente` | [ ] |

---

## Instrucciones para Corrección

Si un path no coincide:

1. Abre `config/aseguradora-configs.ts`
2. Busca el campo estándar (ej: `'paciente.nombre'`)
3. Cambia el `path` al valor correcto del JSON real
4. Ejemplo:
   ```typescript
   // Antes (incorrecto)
   'paciente.nombre': { path: 'paciente.nombres', ... }
   
   // Después (correcto según JSON real)
   'paciente.nombre': { path: 'datos_paciente.nombre_completo', ... }
   ```

## Notas Importantes

- Los parsers y validadores probablemente NO necesitan cambios
- Solo ajusta los `path` si no coinciden
- Mantén los campos opcionales (`opcional: true`) según corresponda
- Ejecuta `npx tsc --noEmit` después de cada cambio para verificar
