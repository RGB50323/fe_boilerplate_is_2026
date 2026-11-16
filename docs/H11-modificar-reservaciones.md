# H11 — Modificar una reservación

Desde Mis reservaciones, las tarjetas confirmadas ofrecen **Modificar reservación**. La ruta es `/perfil/reservaciones/[id]/editar`, con el código R-000045 de H10.

Se reutilizan MarcoReservas, ResumenReserva, Input, Select, Button y las reglas de horarios de H09. El formulario muestra los datos actuales y permite cambiar fecha, hora y personas. No permite modificar contacto, propietario ni sucursal.

Las Server Actions envían el JWT desde la sesión HTTP-only. Se usan los endpoints de detalle, PATCH y alternativas de H11. El PATCH incluye la versión recibida al abrir el detalle para no sobrescribir ediciones concurrentes.

- 400: errores por campo y mensaje general.
- 401: enlace para iniciar sesión y volver a la misma reservación. Los cambios del formulario no se persisten al salir de la página.
- 404: reservación inexistente o no perteneciente a la cuenta.
- 409 por mesa ocupada: carga automática de alternativas con los filtros nuevos, elección explícita y reintento al guardar. Los datos originales siguen visibles.
- 409 por versión desactualizada: bloquea el formulario y ofrece recargar.
- Éxito: muestra el resumen actualizado y enlace a Mis reservaciones, sin revalidar la página y sustituir la confirmación.

El backend registra el aviso interno mediante el servicio común. La integración de correo/recordatorios de H26 no forma parte de esta pantalla.

## Verificación

`npm run build`, `npm run lint`, `npm test`.

Pruebas específicas: `npx vitest run test/edicion-reserva-actions.test.ts test/edicion-reserva-form.test.tsx`.

Prueba manual: entrar con un cliente, abrir una reservación confirmada y cambiar horario/personas. Para provocar conflicto, ocupar ese mismo horario con otro cliente; se deben mostrar alternativas sin perder la reserva original. Abrir el mismo detalle en dos pestañas verifica el control de versión.
