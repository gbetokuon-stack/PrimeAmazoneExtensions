# Generate PNG icons from HTML Canvas
# Run this script to create icon16.png, icon48.png, icon128.png

Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param (
        [int]$Size,
        [string]$OutputPath
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient (red to purple)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 71, 87),
        [System.Drawing.Color]::FromArgb(83, 82, 237),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    
    # Rounded rectangle background
    $radius = [int]($Size * 0.19)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($Size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($Size - $radius * 2, $Size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc(0, $Size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()
    $graphics.FillPath($brush, $path)

    # Target circle
    $cx = [int]($Size * 0.5)
    $cy = [int]($Size * 0.42)
    $cr = [int]($Size * 0.22)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1, [int]($Size * 0.03)))
    $graphics.DrawEllipse($pen, $cx - $cr, $cy - $cr, $cr * 2, $cr * 2)
    
    # Center dot
    $dotR = [int]($Size * 0.06)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($whiteBrush, $cx - $dotR, $cy - $dotR, $dotR * 2, $dotR * 2)

    # Dollar sign
    $fontSize = [Math]::Max(6, [int]($Size * 0.18))
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $dollarRect = New-Object System.Drawing.RectangleF(0, [int]($Size * 0.65), $Size, [int]($Size * 0.3))
    $graphics.DrawString('$', $font, $whiteBrush, $dollarRect, $sf)

    # Save
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $whiteBrush.Dispose()
    $font.Dispose()

    Write-Host "Created: $OutputPath ($Size x $Size)"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconsDir = Join-Path $scriptDir "icons"

Create-Icon -Size 16 -OutputPath (Join-Path $iconsDir "icon16.png")
Create-Icon -Size 48 -OutputPath (Join-Path $iconsDir "icon48.png")
Create-Icon -Size 128 -OutputPath (Join-Path $iconsDir "icon128.png")

Write-Host ""
Write-Host "All icons generated successfully!" -ForegroundColor Green
