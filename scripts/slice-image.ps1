# Slice a tall detail image into OCR-friendly JPEG segments with overlap.
# Usage: powershell -File slice-image.ps1 -Source <path> -OutPrefix <prefix>
# stdout: number of segments created
# NOTE: keep this file ASCII-only; Windows PowerShell 5.1 misreads UTF-8
#       scripts without a BOM and fails to parse non-ASCII comments.
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$OutPrefix,
  [int]$SegmentHeight = 1400,
  [int]$Overlap = 60,
  [int]$Quality = 85
)

Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$src = [System.Drawing.Image]::FromFile($Source)
try {
  $step = $SegmentHeight - $Overlap
  $y = 0; $i = 0
  while ($y -lt $src.Height) {
    $h = [Math]::Min($SegmentHeight, $src.Height - $y)
    $bmp = New-Object System.Drawing.Bitmap($src.Width, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $src.Width, $h)
    $srcRect = New-Object System.Drawing.Rectangle(0, $y, $src.Width, $h)
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $i++
    $bmp.Save(("{0}-{1:D2}.jpg" -f $OutPrefix, $i), $jpegCodec, $encParams)
    $bmp.Dispose()
    if ($y + $h -ge $src.Height) { break }
    $y += $step
  }
  Write-Output $i
}
finally {
  $src.Dispose()
}
