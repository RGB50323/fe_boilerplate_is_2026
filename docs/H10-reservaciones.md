# H10: reservación de mesa y perfil del cliente

## Recorrido

1. Entrar a `/reservas` desde el menú y buscar disponibilidad.
2. Pulsar **Reservar**. La selección viaja a `/reservas/nueva` mediante query params.
3. Si falta sesión, iniciar sesión. El login conserva el destino y la selección; solo admite rutas internas autorizadas.
4. Completar nombre, teléfono, correo, fecha, hora y personas. Se reutilizan Input, Select, Button y FieldError.
5. Confirmar. Se envía el token desde la cookie HTTP-only mediante una Server Action; nunca se envía clienteId.
6. Ver el identificador y resumen confirmado. Consultar `/perfil/reservaciones` desde el menú, la pantalla de búsqueda o la confirmación.

La página de selección vuelve a consultar disponibilidad al abrirse. El backend vuelve a validar al confirmar, pues la consulta previa no bloquea la mesa. Si la mesa se ocupa, **Elegir otra mesa** conserva los criterios de búsqueda.

## Contrato

- `POST /api/v1/reservaciones`: campos mesaId, fecha, hora, personas, nombre, telefono, correo.
- `GET /api/v1/reservaciones/mias?pagina=1`: datos, pagina, totalPaginas, total.
- 400: errores bajo los campos. 401: enlace de login con retorno. 404/409: buscar otra mesa.
- Las horas son de El Salvador, las reservas duran dos horas y los inicios son cada 30 minutos, como H09.
- API_URL conserva el mismo valor del proyecto, incluyendo `/api/v1`. No requiere variables nuevas.

El listado reutiliza Paginacion, Badge, PageLoading y el resumen de confirmación. Incluye estados de carga, vacío, error y reintento. El servidor obtiene la cuenta del token; no hay un selector de usuario ni vistas de administración.

## Verificación

```powershell
npm test
npm run lint
npm run build
```

Prueba manual sugerida: seleccionar una mesa sin sesión, iniciar sesión, confirmar; luego comprobarla en el perfil. Repetir con dos cuentas para el mismo horario: solo una debe confirmar. La protección real de concurrencia tiene pruebas con PostgreSQL en el backend.

Los tests de componentes cubren errores, carga, doble envío, éxito, 401, 409 y fallos de transporte de Server Actions. Los tests de acciones verifican el token y que no se envíe el propietario.

Alcance: confirmación y listado personal. No se agregan registro de cuentas, cancelación, modificación de reservas ni administración.
