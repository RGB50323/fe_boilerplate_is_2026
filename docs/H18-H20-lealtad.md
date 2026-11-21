# H18–H20 · Lealtad

El frontend usa `API_URL` con el prefijo `/api/v1` y el cliente autenticado del proyecto. La cuenta que se muestra en el cupón corresponde al correo de la sesión actual.

| Rol | Ruta | Función |
| --- | --- | --- |
| CLIENTE | `/perfil/beneficios` | Consulta de puntos, movimientos, catálogo, canje con resumen y Mis cupones |
| MESERO | `/mesero/canjes` | Verificación y confirmación de uso |
| GERENTE | `/admin/beneficios` | Administración del catálogo y de la regla de puntos (cambiarla o deshabilitarla) |
| GERENTE y GERENTE_GENERAL | `/admin/beneficios/canjes` | Verificación y confirmación de uso |

En el cobro MESA, el correo de lealtad es opcional. Si se completa, forma parte de la misma solicitud H16 y se conserva al reintentar ese pago con su clave original. El formulario de pagos LLEVAR sigue usando al cliente autenticado.

## Canje y Mis cupones

Al elegir un beneficio se muestra un resumen con el costo, el saldo actual y el saldo después del canje; los puntos se descuentan solo al presionar **Confirmar**. Un doble clic o un reintento usan la misma clave de idempotencia, así que se hace un solo canje.

La sección **Mis cupones** (`GET /lealtad/mis-cupones`) lista los cupones del cliente con su estado: Por usar, Utilizado o Expirado. Un cupón por usar se puede volver a abrir con **Ver código** aunque se recargue la página. El cupón vale hasta que se usa o hasta el fin de la vigencia del beneficio; el servidor decide si sigue válido cuando un empleado lo verifica o confirma.

La administración muestra y permite seleccionar fechas en hora de El Salvador. El inicio se envía a las 00:00:00.000 y el fin a las 23:59:59.999 con el desplazamiento `-06:00`. Elegir la misma fecha en ambos campos da un día completo de vigencia.

## Validación local

Con el backend H16–H20 disponible, inicia sesión con cada rol e ingresa por los enlaces del menú. Para probar una compra, configura una regla, crea un beneficio vigente y usa un cliente con saldo disponible. Un pago nuevo aparecerá inicialmente como puntos pendientes durante 24 horas.

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

