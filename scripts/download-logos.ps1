$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path "$PSScriptRoot/../public/logos" | Out-Null
$outDir = Join-Path $PSScriptRoot "../public/logos" | Resolve-Path
# v14+ 移除了部分品牌；11.15.0 含本页所需的 10 个 slug
$ver = "11.15.0"
$pairs = @(
  @{ slug = "github"; file = "github.svg" },
  @{ slug = "youtube"; file = "youtube.svg" },
  @{ slug = "linkedin"; file = "linkedin.svg" },
  @{ slug = "gmail"; file = "gmail.svg" },
  @{ slug = "wikipedia"; file = "wikipedia.svg" },
  @{ slug = "spotify"; file = "spotify.svg" },
  @{ slug = "amazon"; file = "amazon.svg" },
  @{ slug = "cloudflare"; file = "cloudflare.svg" },
  @{ slug = "mdnwebdocs"; file = "mdn.svg" },
  @{ slug = "nextdotjs"; file = "nextjs.svg" }
)

foreach ($item in $pairs) {
  $url = "https://cdn.jsdelivr.net/npm/simple-icons@$ver/icons/$($item.slug).svg"
  $dest = Join-Path $outDir $item.file
  Write-Host "GET $url -> $dest"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

Get-ChildItem $outDir | Format-Table Name, Length
