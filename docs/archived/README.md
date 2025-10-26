# 📦 Módulos Archivados - Al Chile FB

Esta carpeta contiene módulos y código que fueron desarrollados o planeados pero que **NO están en uso actualmente**.

Se mantienen archivados para referencia futura o posible implementación en fases posteriores.

---

## 📂 Contenido

### 1. `whatsapp-verification/` - Verificación por WhatsApp

**Estado**: ❌ Archivado (No en uso)
**Fecha de archivo**: 2025-10-26
**Razón**: Se decidió usar verificación simple (código visual) en su lugar

**Descripción**:
- Sistema de verificación de teléfono usando WhatsApp Business API
- Proveedor: Twilio
- Envío de códigos OTP via WhatsApp
- Documentación completa de implementación

**¿Cuándo usar?**:
- Si en el futuro se decide implementar verificación externa
- Si se requiere mayor seguridad (2FA real)
- Para escala grande (>1000 usuarios/día)

**Archivos**:
- `docs/archived/whatsapp-verification/` - Documentación completa
- `backend/archived/whatsapp/` - Código backend (Twilio client, OTP service)
- `backend/archived/auth.js` - Rutas de autenticación

---

## 🔄 Cómo Recuperar un Módulo Archivado

Si decides implementar alguno de estos módulos en el futuro:

1. **Revisar documentación** en la carpeta correspondiente
2. **Copiar archivos** de `archived/` a la ubicación activa:
   ```bash
   # Ejemplo: Recuperar WhatsApp
   cp -r docs/archived/whatsapp-verification docs/03-modules/
   cp -r backend/archived/whatsapp backend/
   ```
3. **Instalar dependencias** necesarias (ver README del módulo)
4. **Ejecutar tests** para verificar funcionamiento
5. **Actualizar** según cambios en el proyecto

---

## ⚠️ Importante

- **NO eliminar** estos archivos sin consultar al equipo
- Contienen **trabajo valioso** que puede ser útil en el futuro
- Mantener **documentación actualizada** si se agregan nuevos módulos archivados

---

**Última actualización**: 2025-10-26
