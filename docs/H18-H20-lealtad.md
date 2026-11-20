# H18–H20 · Lealtad

El frontend usa `API_URL` con el prefijo `/api/v1` y el cliente autenticado del proyecto. La cuenta que se muestra en el cupón corresponde al correo de la sesión actual.

| Rol | Ruta | Función |
| --- | --- | --- |
| CLIENTE | `/perfil/beneficios` | Consulta de puntos, movimientos, catálogo y compra de cupones |
| MESERO | `/mesero/canjes` | Verificación y confirmación de uso |
| GERENTE y GERENTE_GENERAL | `/admin/beneficios` | Administración del catálogo y la regla de puntos |
| GERENTE y GERENTE_GENERAL | `/admin/beneficios/canjes` | Verificación y confirmación de uso |

En el cobro MESA, el correo de lealtad es opcional. Si se completa, forma parte de la misma solicitud H16 y se conserva al reintentar ese pago con su clave original. El formulario de pagos LLEVAR sigue usando al cliente autenticado.

## Cupones y alcance del historial

La API permite consultar puntos y movimientos, adquirir un cupón, verificarlo y registrar su uso. Las pestañas «Beneficios pendientes» y «Beneficios consumidos» quedan pendientes de un endpoint de historial de cupones por cliente. Un movimiento de puntos indica que hubo un canje, pero carece de los datos necesarios para recuperar el estado y el código del cupón.

«Mis beneficios» abre el cupón al adquirirlo y permite volver a ver el último mientras la vista está montada. Al recargar o salir de la vista, el frontend pierde esa referencia. El contador usa `expiraEn` y el servidor decide si el cupón sigue válido cuando un empleado lo verifica o confirma.

La administración muestra y permite seleccionar fechas en hora de El Salvador. El inicio se envía a las 00:00:00.000 y el fin a las 23:59:59.999 con el desplazamiento `-06:00`. Elegir la misma fecha en ambos campos da un día completo de vigencia.

## Validación local

Con el backend H16–H20 disponible, inicia sesión con cada rol e ingresa por los enlaces del menú. Para probar una compra, configura una regla, crea un beneficio vigente y usa un cliente con saldo disponible. Un pago nuevo aparecerá inicialmente como puntos pendientes durante 24 horas.

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

