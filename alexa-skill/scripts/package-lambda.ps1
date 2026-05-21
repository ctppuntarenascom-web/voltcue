$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$build = Join-Path $root "build\lambda"
$zip = Join-Path $root "build\voltcue-alexa-lambda.zip"

if (Test-Path $build) {
  Remove-Item $build -Recurse -Force
}
New-Item -ItemType Directory -Path $build | Out-Null

Copy-Item (Join-Path $root "lambda\index.js") (Join-Path $build "index.js")
Copy-Item (Join-Path $root "package.json") (Join-Path $build "package.json")
Copy-Item (Join-Path $root "package-lock.json") (Join-Path $build "package-lock.json")

Push-Location $build
npm ci --omit=dev
Pop-Location

if (Test-Path $zip) {
  Remove-Item $zip -Force
}
Compress-Archive -Path (Join-Path $build "*") -DestinationPath $zip

Write-Output $zip
