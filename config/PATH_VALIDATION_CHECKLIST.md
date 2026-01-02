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

## NY LIFE MONTERREY - Paths de Mapeo (Estructura Híbrida v2)

> **NOTA**: NY Life usa estructura híbrida con arrays para captura raw + campos individuales para validación granular.

### Paciente (con arrays para ambigüedades)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| paciente.nombre | `identificacion.nombres` | STRING | [ ] |
| paciente.apellido_paterno | `identificacion.apellido_paterno` | STRING | [ ] |
| paciente.apellido_materno | `identificacion.apellido_materno` | STRING | [ ] |
| paciente.edad | `identificacion.edad` | STRING | [ ] |
| paciente.sexo | `identificacion.sexo` | **ARRAY** | [ ] |
| paciente.tipo_evento | `identificacion.tipo_evento` | **ARRAY** | [ ] |

### Médico Tratante
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| medico_tratante.nombre_completo | `medico_tratante.nombre_completo` | STRING | [ ] |
| medico_tratante.nombre | `medico_tratante.nombres` | STRING | [ ] |
| medico_tratante.apellido_paterno | `medico_tratante.apellido_paterno` | STRING | [ ] |
| medico_tratante.apellido_materno | `medico_tratante.apellido_materno` | STRING | [ ] |
| medico_tratante.cedula_profesional | `medico_tratante.cedula_profesional` | STRING | [ ] |
| medico_tratante.cedula_especialidad | `medico_tratante.cedula_especialidad` | STRING | [ ] |
| medico_tratante.especialidad | `medico_tratante.especialidad` | STRING | [ ] |
| medico_tratante.numero_proveedor | `medico_tratante.numero_proveedor` | STRING | [ ] |
| medico_tratante.convenio_red | `medico_tratante.convenio_red` | **ARRAY** | [ ] |
| medico_tratante.acepta_tabulador | `medico_tratante.acepta_tabulador` | **ARRAY** | [ ] |

### Fechas (Estructura Robusta día/mes/año)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| fecha.primeros_sintomas | `padecimiento_actual.fecha_primeros_sintomas.formatted` | OBJECT→STRING | [ ] |
| fecha.primera_consulta | `padecimiento_actual.fecha_primera_consulta.formatted` | OBJECT→STRING | [ ] |
| fecha.diagnostico | `padecimiento_actual.fecha_diagnostico.formatted` | OBJECT→STRING | [ ] |
| fecha.ingreso | `tratamiento_y_hospital.hospital.ingreso.formatted` | OBJECT→STRING | [ ] |
| fecha.egreso | `tratamiento_y_hospital.hospital.egreso.formatted` | OBJECT→STRING | [ ] |
| fecha.firma | `firma_cierre.fecha.formatted` | OBJECT→STRING | [ ] |

### Diagnóstico (Array de diagnósticos)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| diagnostico.descripcion | `padecimiento_actual.diagnosticos[0]` | ARRAY[0] | [ ] |
| diagnostico.descripcion_2 | `padecimiento_actual.diagnosticos[1]` | ARRAY[1] | [ ] |
| diagnostico.descripcion_3 | `padecimiento_actual.diagnosticos[2]` | ARRAY[2] | [ ] |
| diagnostico.tipo_padecimiento | `padecimiento_actual.tipo_padecimiento` | **ARRAY** | [ ] |

### Tratamiento y Hospital
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| tratamiento.modalidad | `tratamiento_y_hospital.modalidad` | **ARRAY** | [ ] |
| tratamiento.detalle | `tratamiento_y_hospital.detalle_tratamiento` | STRING | [ ] |
| tratamiento.estatus | `tratamiento_y_hospital.estatus_tratamiento` | **ARRAY** | [ ] |
| tratamiento.complicaciones | `tratamiento_y_hospital.complicaciones.marcada` | **ARRAY** | [ ] |
| tratamiento.complicaciones_detalle | `tratamiento_y_hospital.complicaciones.detalle` | STRING | [ ] |
| hospital.nombre | `tratamiento_y_hospital.hospital.nombre` | STRING | [ ] |
| hospital.ciudad | `tratamiento_y_hospital.hospital.ciudad` | STRING | [ ] |
| hospital.tipo_estancia | `tratamiento_y_hospital.hospital.tipo_estancia` | **ARRAY** | [ ] |

### Exploración Física
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| exploracion_fisica.talla | `exploracion_fisica.talla` | STRING | [ ] |
| exploracion_fisica.peso | `exploracion_fisica.peso` | STRING | [ ] |
| exploracion_fisica.resultados | `exploracion_fisica.resultados` | STRING | [ ] |

### Antecedentes Patológicos (MODELO HÍBRIDO: Raw + Granular)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| **captura_raw** | `antecedentes_patologicos.captura_raw_marcas` | **ARRAY** | [ ] |
| cardiacos | `antecedentes_patologicos.cardiacos` | STRING ("Sí"/"") | [ ] |
| hipertensivos | `antecedentes_patologicos.hipertensivos` | STRING ("Sí"/"") | [ ] |
| diabetes | `antecedentes_patologicos.diabetes_mellitus` | STRING ("Sí"/"") | [ ] |
| vih_sida | `antecedentes_patologicos.vih_sida` | STRING ("Sí"/"") | [ ] |
| cancer | `antecedentes_patologicos.cancer` | STRING ("Sí"/"") | [ ] |
| hepaticos | `antecedentes_patologicos.hepaticos` | STRING ("Sí"/"") | [ ] |
| convulsivos | `antecedentes_patologicos.convulsivos` | STRING ("Sí"/"") | [ ] |
| cirugias | `antecedentes_patologicos.cirugias` | STRING ("Sí"/"") | [ ] |
| detalle_narrativo | `antecedentes_patologicos.detalle_narrativo` | STRING | [ ] |

### Antecedentes No Patológicos (MODELO HÍBRIDO)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| **captura_raw** | `antecedentes_no_patologicos.captura_raw_marcas` | **ARRAY** | [ ] |
| fuma | `antecedentes_no_patologicos.fuma` | STRING | [ ] |
| alcohol | `antecedentes_no_patologicos.alcohol` | STRING | [ ] |
| drogas | `antecedentes_no_patologicos.drogas` | STRING | [ ] |
| perdida_peso | `antecedentes_no_patologicos.perdida_peso` | STRING | [ ] |
| perinatales | `antecedentes_no_patologicos.perinatales` | STRING | [ ] |
| gineco_obstetricos | `antecedentes_no_patologicos.gineco_obstetricos` | STRING | [ ] |

### Discapacidad
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| discapacidad.tiene | `padecimiento_actual.discapacidad.marcada` | **ARRAY** | [ ] |
| discapacidad.tipo | `padecimiento_actual.discapacidad.tipo` | **ARRAY** | [ ] |
| discapacidad.desde | `padecimiento_actual.discapacidad.desde` | STRING | [ ] |
| discapacidad.hasta | `padecimiento_actual.discapacidad.hasta` | STRING | [ ] |

### Equipo Quirúrgico (ARRAY de objetos)
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| equipo_quirurgico | `equipo_quirurgico` | **ARRAY[{rol, nombre, especialidad, presupuesto}]** | [ ] |

### Firma
| Campo Estándar | Path en JSON NY Life | Tipo | Validar |
|----------------|----------------------|------|---------|
| firma.lugar | `firma_cierre.lugar` | STRING | [ ] |
| firma.nombre | `firma_cierre.nombre_firma` | STRING | [ ] |
| firma_medico | `firma_cierre.firma_autografa_detectada` | STRING ("Detectada"/"No detectada") | [ ] |

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
