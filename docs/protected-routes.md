# Protected Routes

This document outlines the protected routes in the application and the required authorization levels.

## Authentication

Authentication is handled via Firebase Authentication. A valid `idToken` must be sent in the `Authorization` header as a Bearer token for all protected routes.

## Authorization

Authorization is based on custom claims in the Firebase `idToken`. The following roles are used:

*   `admin`: Administrator role.
*   `super_admin`: Super administrator role with elevated privileges.

## Protected Routes

| Method   | Route                                                                                             | Authentication | Authorization        |
| :------- | :------------------------------------------------------------------------------------------------ | :------------- | :------------------- |
| `POST`   | `/api/control/productos-venta/upload-image`                                                       | Required       | `admin`              |
| `GET`    | `/api/control/unidades-de-negocio`                                                                | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/unidades-de-negocio/:id`                                                            | Required       | `admin` or `super_admin` |
| `POST`   | `/api/control/unidades-de-negocio`                                                                | Required       | `super_admin`        |
| `DELETE` | `/api/control/unidades-de-negocio/:unidadId`                                                      | Required       | `super_admin`        |
| `POST`   | `/api/control/unidades-de-negocio/:unidadId/departamentos`                                        | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/unidades-de-negocio/:unidadId/departamentos`                                        | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/departamentos/:id`                                                                  | Required       | `admin` or `super_admin` |
| `DELETE` | `/api/control/departamentos/:deptoId`                                                             | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos`                        | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/grupos/:id`                                                                         | Required       | `admin` or `super_admin` |
| `POST`   | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos`                        | Required       | `admin` or `super_admin` |
| `DELETE` | `/api/control/grupos/:grupoId`                                                                    | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos`     | Required       | `admin` or `super_admin` |
| `POST`   | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos`     | Required       | `admin` or `super_admin` |
| `PUT`    | `/api/control/unidades-de-negocio/:unidadId`                                                      | Required       | `admin` or `super_admin` |
| `PUT`    | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId`                               | Required       | `admin` or `super_admin` |
| `PUT`    | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId`               | Required       | `admin` or `super_admin` |
| `PUT`    | `/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos/:conceptoId` | Required       | `admin` or `super_admin` |
| `DELETE` | `/api/control/conceptos/:conceptoId`                                                              | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/proveedores`                                                                        | Required       | `admin` or `super_admin` |
| `POST`   | `/api/control/proveedores`                                                                        | Required       | `admin` or `super_admin` |
| `PUT`    | `/api/control/proveedores/:proveedorId`                                                           | Required       | `admin` or `super_admin` |
| `DELETE` | `/api/control/proveedores/:proveedorId`                                                           | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/conceptos/:conceptoId/proveedores`                                                  | Required       | `admin` or `super_admin` |
| `POST`   | `/api/control/conceptos/:conceptoId/proveedores`                                                  | Required       | `admin` or `super_admin` |
| `DELETE` | `/api/control/conceptos/:conceptoId/proveedores/:proveedorId`                                     | Required       | `admin` or `super_admin` |
| `GET`    | `/api/control/drivers`                                                                            | Required       | `admin`              |
| `POST`   | `/api/control/drivers`                                                                            | Required       | `admin`              |
| `POST`   | `/api/control/catalogo/categorias-venta`                                                          | Required       | `admin`              |
| `GET`    | `/api/control/catalogo/categorias-venta`                                                          | Required       | `admin`              |
| `GET`    | `/api/control/departamentos/:deptoId/categorias-venta`                                            | Required       | `admin`              |
| `PUT`    | `/api/control/catalogo/categorias-venta/:id`                                                      | Required       | `admin`              |
| `DELETE` | `/api/control/catalogo/categorias-venta/:id`                                                      | Required       | `admin`              |
| `POST`   | `/api/control/productos-venta`                                                                    | Required       | `admin`              |
| `GET`    | `/api/control/productos-venta`                                                                    | Required       | `admin`              |
| `GET`    | `/api/control/productos-venta/:id`                                                                | Required       | `admin`              |
| `PUT`    | `/api/control/productos-venta/:id`                                                                | Required       | `admin`              |
| `DELETE` | `/api/control/productos-venta/:id`                                                                | Required       | `admin`              |
| `GET`    | `/api/me/orders`                                                                                  | Required       | -                    |
| `GET`    | `/api/me/orders/:id`                                                                              | Required       | -                    |
| `GET`    | `/api/me/profile`                                                                                 | Required       | -                    |
| `PUT`    | `/api/me/profile`                                                                                 | Required       | -                    |
| `GET`    | `/api/me/addresses`                                                                               | Required       | -                    |
| `POST`   | `/api/me/addresses`                                                                               | Required       | -                    |
| `PUT`    | `/api/me/addresses/:id`                                                                           | Required       | -                    |
| `DELETE` | `/api/me/addresses/:id`                                                                           | Required       | -                    |
| `PUT`    | `/api/me/addresses/set-default/:id`                                                               | Required       | -                    |
| `USE`    | `/api/cart`                                                                                       | Required       | -                    |
| `USE`    | `/api/pedidos`                                                                                    | Required       | -                    |
| `USE`    | `/api-docs`                                                                                       | Required       | `super_admin`        |

## Public Routes

| Method | Route                      |
| :----- | :------------------------- |
| `GET`  | `/`                        |
| `GET`  | `/api/menu`                |
| `GET`  | `/api/categorias-venta`    |
| `GET`  | `/api/generate-signed-url` |
