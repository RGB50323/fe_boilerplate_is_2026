param([string]$ApiUrl='http://127.0.0.1:3000/api/v1')
$ErrorActionPreference='Stop'
if($ApiUrl -ne 'http://127.0.0.1:3000/api/v1'){throw 'El destino debe ser la API local de QA.'}
$stage='qa/.runtime'
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($entry in @('app','components','lib','public','package.json','next.config.ts','postcss.config.mjs','tsconfig.json','proxy.ts','middleware.ts','types')) {
  if(Test-Path -LiteralPath $entry){Copy-Item -LiteralPath $entry -Destination $stage -Recurse -Force}
}
$env:API_URL=$ApiUrl
$env:DASHBOARD_DATOS_PRUEBA='false'
$env:NEXT_TELEMETRY_DISABLED='1'
$env:TZ='America/El_Salvador'
node node_modules/next/dist/bin/next dev $stage --hostname 127.0.0.1 --port 3001
