# CONTEXTO: Próxima Tarea - Tests de Frontend

## 🎯 TAREA INMEDIATA

**Ejecutar y validar TODOS los tests de frontend, corrigiendo cualquier problema encontrado.**

---

## 📋 PROTOCOLO A SEGUIR

### PASO 1: Leer Documentación (OBLIGATORIO)

Antes de hacer CUALQUIER cosa, debes leer estos archivos en este orden:

1. **`/AGENTS.md`** - Protocolo general de trabajo
2. **`/docs/agents/vanguard/README.md`** - Tu documentación como agente Vanguard
3. **`/docs/04-testing/frontend-tests.md`** - Estado actual de tests frontend
4. **`/docs/04-testing/backend-tests.md`** - Referencia de lo ya completado

### PASO 2: Ejecutar Tests de Frontend

```bash
npm run test:frontend
```

### PASO 3: Analizar Resultados

- Si todos pasan (247/247) ✅:
  - Verificar cobertura
  - Actualizar documentación con fecha
  - Reportar éxito

- Si hay fallos ❌:
  - Leer el stack trace COMPLETO
  - Identificar la causa raíz
  - Aplicar correcciones usando patrones documentados
  - Re-ejecutar tests
  - Documentar cambios

### PASO 4: Documentar

Actualizar los siguientes archivos:

1. **`/docs/04-testing/frontend-tests.md`**
   - Fecha de última actualización
   - Números actualizados
   - Sección "Cambios Realizados el [FECHA]" con:
     - Problemas encontrados
     - Análisis de causa
     - Soluciones implementadas
     - Lecciones aprendidas

2. **`/docs/agents/vanguard/README.md`**
   - Agregar nueva sesión en "REGISTRO DE SESIONES DE VANGUARD"
   - Documentar errores y soluciones
   - Incluir métricas finales

3. **`/AGENTS.md`**
   - Actualizar números si hay cambios

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Tests - Estado al 2025-10-25

| Categoría | Tests | Estado |
|-----------|-------|--------|
| **Backend** | 232/232 | ✅ 100% (COMPLETADO) |
| **Frontend** | 247/247 | ⏳ POR VALIDAR |
| **Total** | 479/479 | ⏳ POR VALIDAR |

### Última Sesión Completada

**Fecha:** 2025-10-25
**Agente:** Vanguard
**Tarea:** Tests Backend
**Resultado:** ✅ 232/232 tests pasando (corregidos 16 tests fallidos)

---

## 🔍 INFORMACIÓN IMPORTANTE

### Stack Tecnológico Frontend
- **Framework:** Next.js 15 (App Router)
- **Testing:** Jest + React Testing Library
- **Mocking:** Firebase hooks, Next.js hooks, custom hooks

### Patrones Comunes de Tests Frontend

```javascript
// Mock de Firebase hooks
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

// Mock de Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock de custom hooks
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
```

### Errores Comunes y Soluciones

| Error | Solución |
|-------|----------|
| `Found multiple elements` | Usar `getAllByText()` |
| `Cannot find module '@/...'` | Verificar `moduleNameMapper` en jest.config.js |
| `Element type is invalid` | Agregar mock en jest.setup.js |
| `useX is not a function` | Verificar estructura del mock |

---

## ✅ CHECKLIST ANTES DE REPORTAR

Antes de dar por completada la tarea, asegúrate de:

- [ ] Ejecuté `npm run test:frontend`
- [ ] Leí el output COMPLETO (no solo resumen)
- [ ] Si hubo errores, los corregí TODOS
- [ ] Volví a ejecutar tests después de correcciones
- [ ] Actualicé `/docs/04-testing/frontend-tests.md`
- [ ] Actualicé `/docs/agents/vanguard/README.md`
- [ ] Actualicé `/AGENTS.md` (si hubo cambios en números)
- [ ] Todos los tests están en estado ✅ (0 fallando)
- [ ] Documenté lecciones aprendidas

---

## 🎯 OBJETIVO FINAL

**Meta:** Validar que los 247 tests de frontend están pasando al 100%, o corregir cualquier problema encontrado.

**Criterio de éxito:**
```
Test Suites: 41 passed, 41 total
Tests:       247 passed, 247 total
```

---

## 📞 COMANDOS ÚTILES

```bash
# Ejecutar todos los tests frontend
npm run test:frontend

# Test específico
npm test -- path/to/test.tsx

# Con verbose
npm run test:frontend -- --verbose

# Con coverage
npm run test:frontend -- --coverage

# Watch mode
npm test -- --watch
```

---

**Creado por:** Vanguard
**Fecha:** 2025-10-25
**Versión:** 1.0
**Propósito:** Contexto para continuación después de /clear
