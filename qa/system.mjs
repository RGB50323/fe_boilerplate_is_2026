import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const root=resolve('../be_boilerplate_is_2026/qa');
const fixtures=JSON.parse(readFileSync(root+'/evidencias/lote-0/fixtures-ui.json','utf8'));
const frontend='http://127.0.0.1:3001';
const api='http://127.0.0.1:3000/api/v1';
if(fixtures.qaMarker){
  const probe=await fetch(api);
  assert.equal(probe.headers.get('x-los-burle-qa'),fixtures.qaMarker,'La API no coincide con la instancia de QA que generó los fixtures.');
}
const general='gerente.general@example.com', gerente='gerente@example.com', client='demo@example.com', cook='cocina@example.com';
const run=randomUUID().slice(0,8);
const browser=await chromium.launch({ executablePath:process.env.QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-first-run','--disable-gpu'] });
const state=new Map(), tokens=new Map(), results=[];
let dir, context, sequence;
function note(operation, data) {
  appendFileSync(dir+'/operaciones.jsonl',JSON.stringify({at:new Date().toISOString(),operation,data})+'\n');
}
async function http(method,path,email,body) {
  const auth=path==='/auth/login';
  if(email && !auth && !tokens.has(email)) await http('POST','/auth/login',email,{email,password:process.env.QA_PASSWORD});
  note('HTTP request',{method,path,email,body:auth?{email}:body});
  const response=await fetch(api+path,{method,headers:{'content-type':'application/json',...(tokens.has(email)?{authorization:'Bearer '+tokens.get(email)}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();
  if(auth && data.accessToken) tokens.set(email,data.accessToken);
  note('HTTP response',{method,path,status:response.status,data:auth?{authenticated:!!data.accessToken}:data});
  return {status:response.status,data};
}
async function session(email) {
  if(state.has(email)) return state.get(email);
  const temporary=await browser.newContext();
  try{
    const login=await temporary.newPage();
    note('Playwright login',{email,url:frontend+'/login'});
    await login.goto(frontend+'/login',{timeout:120000});
    await login.locator('[name=email]').fill(email);
    await login.locator('[name=password]').fill(process.env.QA_PASSWORD);
    await login.getByRole('button',{name:'Iniciar sesión'}).click();
    await expect(login).not.toHaveURL(/\/login(?:\?|$)/,{timeout:90000});
    const authenticated=await temporary.storageState();
    state.set(email,authenticated);
    return authenticated;
  } finally {await temporary.close();}
}
async function pageFor(email,path) {
  const ctx=context ?? await browser.newContext({
    storageState:await session(email), timezoneId:'America/El_Salvador',
    viewport:{width:1440,height:1000}, recordVideo:{dir:dir+'/videos'},
  });
  if(!context){
    context=ctx;
    await ctx.tracing.start({screenshots:true,snapshots:false,sources:false});
  }
  const page=await ctx.newPage();
  note('Playwright goto',{path});
  await page.goto(frontend+path,{timeout:90000});
  return page;
}
async function extraPage(email,path){
  const other=await browser.newContext({storageState:await session(email),timezoneId:'America/El_Salvador',viewport:{width:1440,height:1000}});
  const page=await other.newPage();
  await page.goto(frontend+path,{timeout:90000});
  return page;
}
async function capture(page,label){
  const file=String(++sequence).padStart(2,'0')+'-'+label+'.png';
  await page.screenshot({path:dir+'/'+file,fullPage:true,timeout:15000});
  note('captura',{file,url:page.url()});
}
async function scenario(id,expected,fn){
  if (process.env.QA_UI_CASES && !process.env.QA_UI_CASES.split(',').includes(id)) return;
  dir=root+'/evidencias/'+id+'/'+run;
  mkdirSync(dir,{recursive:true});
  context=undefined; sequence=0;
  let status='PASS', observed='Aserciones satisfechas.';
  try{
    const partial=await fn();
    if(partial){status=partial.status;observed=partial.reason;}
  }catch(error){
    status=error instanceof assert.AssertionError || error.message.startsWith('expect(') ? 'FAIL' : 'BLOCKED';
    observed=error.message.split('\n').slice(0,12).join('\n');
    note('error',{name:error.name,message:observed});
    const page=context?.pages().at(-1);
    if(page && !page.isClosed()) await capture(page,'error').catch(()=>{});
  }finally{
    if(context){
      const pages=context.pages();
      await context.tracing.stop({path:dir+'/trace.zip'});
      execFileSync('powershell.exe',['-NoProfile','-File','qa/sanitize-trace.ps1',dir+'/trace.zip']);
      await context.close();
      if(status==='PASS') for(const page of pages) await page.video()?.delete();
    }
  }
  results.push({id,status,expected,observed,folder:'qa/evidencias/'+id+'/'+run});
  writeFileSync(dir+'/resultado.md','# '+id+'\n\n'+status+'\n\n**Esperado** '+expected+'\n\n**Observado** '+observed+'\n');
  writeFileSync(root+'/reportes/'+(process.env.QA_UI_LABEL || 'sistema')+'.json',JSON.stringify(results,null,2));
  console.log(id,status,observed);
}
const table = p=>p.getByRole('table',{name:'Ventas por sucursal'});
const ranking = p=>p.getByRole('table',{name:'Platillos más vendidos'});
async function dashboard(){
  const page=await pageFor(general,'/dashboard');
  await expect(table(page)).toBeVisible({timeout:50000});
  return page;
}
async function custom(page,from,to,label='rango'){
  note('Playwright aplicar rango',{from,to});
  await page.getByRole('button',{name:'Personalizado'}).click();
  await page.getByLabel('Desde',{exact:true}).fill(from);
  await page.getByLabel('Hasta',{exact:true}).fill(to);
  await capture(page,label+'-entrada');
  await page.getByRole('button',{name:'Aplicar',exact:true}).click();
}
async function select(page,label,value){
  note('Playwright seleccionar filtro',{label,value});
  const select=page.getByLabel(label,{exact:true});
  if(await select.evaluate(el=>el.tagName==='SELECT').catch(()=>false)) await select.selectOption({label:value});
  else {
    const trigger=page.locator(label==='Sucursal'?'#sucursal':'#dia');
    if(label!=='Sucursal') {
      await page.setViewportSize({width:1440,height:2500});
      await trigger.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    const option=page.getByRole('option',{name:value,exact:true});
    if(label==='Sucursal') await option.click();
    else await option.click({force:true});
  }
}
async function bell(page){
 await page.getByRole('button',{name:/^Notificaciones,/}).first().click();
 await expect(page.getByRole('heading',{name:'Notificaciones',exact:true}).first()).toBeVisible();
}
await scenario('CP-095','Paginación de 10, Confirmar exige motivo, ocultación auditada y promedio sin reseña oculta.',async()=>{
  const p=await pageFor(gerente,'/admin/resenas');
  await p.getByRole('button',{name:'Visibles',exact:true}).click();
  const target=p.getByText(fixtures.reviewTag+' 11',{exact:true});
  await expect(target).toBeVisible();
  await capture(p,'visibles-pagina-1');
  const first=await p.getByRole('button',{name:/Ocultar reseña de/}).count();
  assert.equal(first,10);
  await p.getByRole('button',{name:'Página siguiente'}).click();
  await expect(p.getByText(fixtures.reviewTag+' 0',{exact:true})).toBeVisible();
  await capture(p,'visibles-pagina-2');
  await p.getByRole('button',{name:'Página anterior'}).click();
  await expect(target).toBeVisible();
  const before=await http('GET','/platillos/'+fixtures.platillo+'/resenas');
  await target.locator('xpath=ancestor::li[1]').getByRole('button',{name:/Ocultar reseña de/}).click();
  const confirm=p.getByRole('button',{name:'Confirmar',exact:true});
  await expect(confirm).toBeDisabled();
  await capture(p,'confirmar-sin-motivo');
  await p.getByText('Spam',{exact:true}).click();
  await expect(confirm).toBeEnabled();
  await capture(p,'motivo-spam');
  await confirm.click();
  await expect(p.getByText(/Reseña ocultada/i).first()).toBeVisible();
  await capture(p,'ocultacion-confirmada');
  await p.getByRole('button',{name:'Ocultas',exact:true}).click();
  await expect(target).toBeVisible();
  await expect(target.locator('xpath=ancestor::li[1]')).toContainText(/Ocultada por .* Motivo: Spam/);
  await capture(p,'auditoria-oculta');
  const after=await http('GET','/platillos/'+fixtures.platillo+'/resenas');
  assert.equal(after.data.total,before.data.total-1);
  assert.ok(after.data.promedio>before.data.promedio);
});
await scenario('CP-099','Aviso con pedido y sucursal en campana e historial antes de 60 s y recepción en buzón.',async()=>{
  const customer=await pageFor(client,'/menu');
  await bell(customer);
  await capture(customer,'campana-inicial');
  const kitchen=await extraPage(cook,'/cocina');
  try{
    const ticket=kitchen.getByRole('article',{name:new RegExp(fixtures.kitchenNumber)});
    await expect(ticket).toBeVisible({timeout:30000});
    await capture(kitchen,'comanda-inicial');
    await ticket.getByRole('button',{name:/como listo/}).first().click();
    await expect(ticket.getByRole('button',{name:/como listo/})).toHaveCount(1);
    await capture(kitchen,'primer-platillo-listo');
    const since=Date.now();
    await ticket.getByRole('button',{name:/como listo/}).click();
    await expect(ticket).toHaveCount(0);
    await capture(kitchen,'comanda-completada');
    const notice=customer.getByRole('button',{name:new RegExp(fixtures.kitchenNumber)});
    await expect(notice).toBeVisible({timeout:60000});
    note('latencia visual ms',{elapsed:Date.now()-since});
    assert.ok(Date.now()-since<60000);
    await expect(notice).toContainText('Centro');
    await capture(customer,'aviso-campana');
    const r=await http('GET','/notificaciones',client);
    assert.ok(r.data.datos.find(n=>n.referencia?.id===String(fixtures.kitchenId)&&n.creadaEn));
    return {status:'BLOCKED',reason:'Evento, persistencia y campana comprobados. El backend usa proveedor de log. No hay recepción verificable en buzón.'};
  }finally{await kitchen.context().close();}
});
await scenario('CP-103','Confirmación y cambio en ambos canales en menos de 60 s y recordatorio relativo a nueva hora.',async()=>{
  const p=await pageFor(client,'/perfil/reservaciones');
  await bell(p);
  await capture(p,'campana-inicial');
  const day=new Date(Date.now()+86400000*3).toISOString().slice(0,10);
  const before=Date.now();
  const options=await http('GET','/sucursales/'+fixtures.centro+'/mesas-disponibles?fecha='+day+'&hora=15%3A00&personas=2');
  const available=Array.isArray(options.data)?options.data:options.data.mesas;
  assert.ok(available?.length,'Hay una mesa disponible en el día seleccionado.');
  const r=await http('POST','/reservaciones',client,{mesaId:available[0].id??available[0].mesaId,fecha:day,hora:'15:00',personas:2,nombre:'Cliente QA',telefono:'7000-0000',correo:client});
  assert.equal(r.status,201);
  const id=r.data.reservacionId??r.data.id;
  await expect(p.getByText(/Reservación confirmada/i).first()).toBeVisible({timeout:60000});
  note('confirmacion latencia visual ms',{elapsed:Date.now()-before});
  await capture(p,'confirmacion-visible');
  const detail=await http('GET','/reservaciones/'+id,client);
  await p.goto(frontend+'/perfil/reservaciones/'+id+'/editar');
  await expect(p.locator('#hora')).toBeVisible();
  const times=await p.locator('#hora option').evaluateAll(opts=>opts.map(x=>x.value));
  note('Horas de edición disponibles',{times,target:'15:10'});
  await capture(p,'horas-disponibles');
  const edit=await http('PATCH','/reservaciones/'+id,client,{fecha:day,hora:'15:10',personas:2,mesaId:available[0].id??available[0].mesaId,version:detail.data.version});
  assert.equal(edit.status,400,'La implementación rechaza el desplazamiento de 10 minutos documentado.');
  return {status:'BLOCKED',reason:'Confirmación visible. El procedimiento de +10 min del Excel no es representable: el selector y la API requieren :00 o :30. El PATCH devuelve 400. Buzón sin proveedor de entrega; recordatorio sobre la hora modificada no ejecutado.'};
});
await scenario('CP-107','El gerente recibe alerta no leída con metadatos; cliente no la ve.',async()=>{
  const p=await pageFor(gerente,'/admin/inventario');
  const name='Insumo QA '+run;
  const created=await http('POST','/inventario/insumos',gerente,{nombre:name,unidad:'kg',minimo:5});
  assert.equal(created.status,201);
  const initial=await http('POST','/inventario/insumos/'+created.data.id+'/movimientos',gerente,{tipo:'ENTRADA',cantidad:10,motivo:'Fixture QA'});
  assert.equal(initial.status,201);
  await p.reload();
  const row=p.getByRole('row').filter({hasText:name});
  await expect(row).toBeVisible({timeout:30000});
  await capture(p,'insumo-inicial');
  await row.getByRole('button',{name:/registrar movimiento|entrada\/salida/i}).click();
  await p.getByText('Salida',{exact:true}).click();
  await p.locator('#cantidad-movimiento').fill('6');
  await p.locator('#motivo-movimiento').fill('QA alerta umbral');
  await capture(p,'salida-preparada');
  await p.getByRole('button',{name:'Registrar',exact:true}).click();
  await expect(p.getByRole('dialog')).toHaveCount(0);
  await capture(p,'movimiento-registrado');
  await bell(p);
  const notice=p.getByRole('button',{name:new RegExp('Insumo por agotarse: '+name)});
  await expect(notice).toBeVisible({timeout:45000});
  await expect(notice).toContainText(/Inventario/i);
  await capture(p,'campana-gerente');
  const notification=(await http('GET','/notificaciones',gerente)).data.datos.find(n=>n.mensaje.includes(name));
  assert.ok(notification?.creadaEn && notification.leida===false && notification.moduloOrigen==='INVENTARIO');
  const other=await extraPage(client,'/menu');
  try{
    await bell(other);
    await expect(other.getByText(/No tienes notificaciones|Notificaciones/i).first()).toBeVisible();
    await expect(other.getByText(name,{exact:false})).toHaveCount(0);
    assert.ok(!(await http('GET','/notificaciones',client)).data.datos.some(n=>n.id===notification.id));
    await capture(other,'campana-cliente');
  }finally{await other.context().close();}
});
await scenario('CP-116','Indicadores, total general, sucursales y Santa Tecla con ticket cero.',async()=>{
 const p=await dashboard(); await capture(p,'dashboard-inicial');
 await custom(p,'2026-11-01','2026-11-21','periodo-excel');
 await expect(p).toHaveURL(/hasta=2026-11-21/);
 const data=(await http('GET','/dashboard/ventas?desde=2026-11-01&hasta=2026-11-21',general)).data;
 for(const branch of data.sucursales) await expect(table(p).getByRole('row',{name:new RegExp(branch.nombre)})).toContainText(branch.pedidos.toString());
 await expect(table(p).getByRole('row',{name:/Santa Tecla/})).toContainText('$0.00');
 await expect(table(p).getByRole('row',{name:/Total general/})).toContainText(data.totalGeneral.pedidos.toString());
 await capture(p,'tabla-e-indicadores');
});
await scenario('CP-117','Hoy, Semana y personalizado actualizan URL y resultados.',async()=>{
 const p=await dashboard(); await capture(p,'mes-inicial');
 let previous=await table(p).innerText();
 for(const [name,key] of [['Hoy','hoy'],['Semana','semana']]){
  await p.getByRole('button',{name,exact:true}).click(); await expect(p).toHaveURL(new RegExp('periodo='+key));
  await expect.poll(()=>table(p).innerText()).not.toBe(previous);
  previous=await table(p).innerText();
  await capture(p,key);
 }
 await custom(p,'2026-11-20','2026-11-20');
 await expect(p).toHaveURL(/desde=2026-11-20/);
 await expect.poll(()=>table(p).innerText()).not.toBe(previous);
 await expect(ranking(p)).toBeVisible();
 await expect(p.getByRole('heading',{name:/Horarios pico/})).toBeVisible();
 await capture(p,'personalizado-resultado');
});
await scenario('CP-118','Escalón filtra indicadores, tabla, ranking y franjas.',async()=>{
 const p=await dashboard(); await capture(p,'todas-sucursales');
 await select(p,'Sucursal','Escalón');
 await expect(p).toHaveURL(new RegExp('sucursal='+fixtures.escalon));
 await expect(table(p).getByRole('row',{name:/Escalón/})).toBeVisible();
 await expect(table(p).getByRole('row',{name:/Centro|Santa Tecla/})).toHaveCount(0);
 await expect(ranking(p)).toBeVisible();
 await expect(p.getByRole('heading',{name:'Escalón',exact:true})).toBeVisible();
 await capture(p,'escalon-filtrado');
});
await scenario('CP-119','Rango invertido muestra mensaje y conserva URL y datos.',async()=>{
 const p=await dashboard(); const original=p.url(), content=await table(p).innerText();
 await capture(p,'datos-originales');
 await custom(p,'2026-11-21','2026-11-01','rango-invertido');
 await expect(p.getByText('Rango no válido: la fecha final no puede ser anterior a la inicial.',{exact:true})).toBeVisible();
 assert.equal(p.url(),original); assert.equal(await table(p).innerText(),content);
 await capture(p,'error-y-datos-conservados');
});
await scenario('CP-120','Ranking y empate por monto, 10 filas iniciales y 12 al expandir.',async()=>{
 const p=await dashboard(); await capture(p,'dashboard-inicial');
 await custom(p,'2026-11-20','2026-11-20','dia-con-ventas');
 await expect(p).toHaveURL(/desde=2026-11-20/);
 const data=(await http('GET','/dashboard/ventas?desde=2026-11-20&hasta=2026-11-20',general)).data;
 assert.ok(data.platillos.some((x,i,a)=>i>0&&a[i-1].cantidad===x.cantidad&&a[i-1].monto>x.monto),'Fixture con empate de cantidad.');
 await expect(ranking(p).locator('tbody tr').first()).toContainText(data.platillos[0].nombre);
 await capture(p,'ranking-un-dia');
 await custom(p,'2026-10-01','2026-10-31','octubre');
 await expect(p).toHaveURL(/desde=2026-10-01/);
 const all=p.getByRole('button',{name:'Ver todos (12)',exact:true});
 await expect(all).toBeVisible();
 await expect(ranking(p).locator('tbody tr')).toHaveCount(10);
 await capture(p,'top-diez');
 await all.click();
 await expect(ranking(p).locator('tbody tr')).toHaveCount(12);
 await capture(p,'doce-platillos');
});
await scenario('CP-121','Tres franjas principales numeradas y filtro viernes; empate favorece hora temprana.',async()=>{
 const p=await dashboard(); await capture(p,'dashboard-inicial');
 await select(p,'Sucursal','Escalón');
 await custom(p,'2026-10-02','2026-10-02','viernes-con-empate');
 await expect(p).toHaveURL(/desde=2026-10-02/);
 const graph=p.locator('[aria-label="Ventas por franja horaria en Escalón"]');
 await expect(graph).toBeVisible();
 await expect(graph.locator('[aria-label*="franja pico número"]')).toHaveCount(3);
 await expect(graph.locator('[aria-label*="franja pico número 1"]')).toHaveAttribute('aria-label',/^12:00.*40/);
 await expect(graph.locator('[aria-label*="franja pico número 2"]')).toHaveAttribute('aria-label',/^13:00.*40/);
 await capture(p,'tres-franjas');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/El_Salvador'}).format(new Date());
 await custom(p,'2026-10-01',today,'rango-octubre-a-hoy');
 await expect(p).toHaveURL(/desde=2026-10-01/);
 await expect(p.getByRole('region',{name:'Indicadores de ventas'})).toHaveAttribute('aria-busy','false');
 await expect(graph).toBeVisible();
 await capture(p,'resultado-rango-sin-filtro');
 await select(p,'Día de la semana','Viernes');
 await expect(p).toHaveURL(/dia=5/);
 const data=(await http('GET','/dashboard/ventas?desde=2026-10-01&hasta='+today+'&sucursalId='+fixtures.escalon+'&diaSemana=5',general)).data;
 const friday=data.horariosPico.find(x=>x.sucursalId===fixtures.escalon).franjas;
 assert.ok(friday.some(f=>f.ventas>0));
 for(const f of friday){
   const start=String(f.hora).padStart(2,'0')+':00';
   const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(f.ventas);
   const label=graph.locator('[aria-label^='+JSON.stringify(start)+']');
   await expect.poll(()=>label.getAttribute('aria-label')).toContain(amount);
 }
 await expect(graph).toBeVisible();
 await capture(p,'solo-viernes');
});
await browser.close();





