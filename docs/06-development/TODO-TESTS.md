# Backend Tests

- [x] Fix critical failure in the entire backend test suite.
- [x] **Feature: Manual Featured Products** - Add tests for backend endpoints (`/api/productos-venta/latest` and `/api/control/productos-venta/:id/toggle-featured`).
- [x] **Fix pedidos.test.js** - ✅ Arreglado (2025-11-02): Agregados mocks de `cart`, `repartidores`, `verification`, `fcm` y colección `users` con `phoneVerified: true`
- [x] **Fix pedidos-control.test.js** - ✅ Arreglado (2025-11-02): Agregado `mockGet` para obtener documento después de transacción en tests de asignación de repartidor

---

# Frontend Tests

- [ ] **URGENT: Fix Systemic Failures** - Multiple test suites are failing due to missing global mocks for `useUser` and `useRouter`. A global mock should be added to `jest.setup.js`.
- [ ] **Feature: Manual Featured Products** - Add tests for the new `FeaturedProducts` component to verify loading, success, and empty states.
- [ ] **Feature: Manual Featured Products** - Add tests to `productos-venta/page.test.tsx` to verify the new `Switch` control for featuring products works correctly.
- [x] Add tests for `src/app/control/page.tsx`
- [x] Add tests for `src/app/control/productos/page.tsx`
- [x] Add tests for `src/app/control/productos-venta/page.tsx`
- [x] Add tests for `src/app/ingresar/page.tsx`
- [x] Add tests for `src/app/perfil/page.tsx`
- [x] Add tests for `src/app/recuperar-clave/page.tsx`
- [x] Add tests for `src/app/registro/page.tsx`
- [x] Add tests for `src/components/AddEditAddressDialog.tsx`
- [x] Add tests for `src/components/GooglePlacesAutocomplete.tsx`
- [ ] Add tests for `src/components/GooglePlacesAutocompleteWithMap.tsx`
- [ ] Add tests for `src/components/orders/AssignDriverDialog.tsx`
- [ ] Add tests for `src/components/control/DriversTable.tsx`
- [ ] Add tests for `src/components/control/AddEditDriverDialog.tsx`
- [ ] Add tests for `src/app/control/repartidores/page.tsx`
- [ ] Add tests for `src/components/control/add-edit-product-dialog.tsx`
- [ ] Add tests for `src/components/control/products-table.tsx`
- [ ] Add tests for `src/components/layout/footer.tsx`
- [x] Add tests for `src/components/layout/header.tsx` - ✅ Tests arreglados (2025-11-02): Agregado mock de `useLogoUrl` para evitar error de FirebaseContext
