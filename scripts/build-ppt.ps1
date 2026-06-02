# Build strategic commercial presentation (10 slides, 16:9)
param(
    [Parameter(Mandatory=$true)] [string]$Output
)

# Constants
$ppLayoutBlank = 12
$msoShapeRectangle = 1
$msoShapeRightArrow = 13
$msoShapeChevron = 52
$msoFalse = 0
$msoTrue = -1
$ppAlignLeft = 1
$ppAlignCenter = 2
$ppAlignRight = 3
$msoTextOrientationHorizontal = 1
$ppSaveAsOpenXMLPresentation = 24

function To-Rgb($r, $g, $b) { return ($r + $g * 256 + $b * 65536) }

# Palette
$navy       = To-Rgb 26 54 93
$navyDark   = To-Rgb 13 30 56
$navySoft   = To-Rgb 43 85 130
$gold       = To-Rgb 199 161 81
$goldSoft   = To-Rgb 220 195 140
$cream      = To-Rgb 250 248 243
$creamSoft  = To-Rgb 244 240 232
$darkText   = To-Rgb 45 55 72
$grayText   = To-Rgb 113 128 150
$lightGray  = To-Rgb 226 232 240
$white      = To-Rgb 255 255 255

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $msoTrue
$pres = $ppt.Presentations.Add($msoTrue)
$pres.PageSetup.SlideWidth = 960
$pres.PageSetup.SlideHeight = 540

function Add-Text {
    param($slide, [double]$left, [double]$top, [double]$width, [double]$height,
          [string]$text, [double]$size, $bold, $color,
          [int]$align = $ppAlignLeft, [string]$font = "Segoe UI", $italic = $msoFalse,
          [double]$lineSpacing = 1.0)
    $tb = $slide.Shapes.AddTextbox($msoTextOrientationHorizontal, $left, $top, $width, $height)
    $tb.TextFrame.WordWrap = $msoTrue
    $tb.TextFrame.MarginLeft = 0
    $tb.TextFrame.MarginRight = 0
    $tb.TextFrame.MarginTop = 0
    $tb.TextFrame.MarginBottom = 0
    $tr = $tb.TextFrame.TextRange
    $tr.Text = $text
    $tr.Font.Name = $font
    $tr.Font.Size = $size
    $tr.Font.Bold = $bold
    $tr.Font.Italic = $italic
    $tr.Font.Color.RGB = $color
    $tr.ParagraphFormat.Alignment = $align
    if ($lineSpacing -ne 1.0) {
        $tr.ParagraphFormat.LineRuleWithin = $msoTrue
        $tr.ParagraphFormat.SpaceWithin = $lineSpacing
    }
    return $tb
}

function Add-Rect {
    param($slide, [double]$left, [double]$top, [double]$width, [double]$height, $color)
    $r = $slide.Shapes.AddShape($msoShapeRectangle, $left, $top, $width, $height)
    $r.Fill.ForeColor.RGB = $color
    $r.Fill.Solid()
    $r.Line.Visible = $msoFalse
    return $r
}

function Add-RectBorder {
    param($slide, [double]$left, [double]$top, [double]$width, [double]$height, $fill, $borderColor, [double]$borderWeight = 1.0)
    $r = $slide.Shapes.AddShape($msoShapeRectangle, $left, $top, $width, $height)
    $r.Fill.ForeColor.RGB = $fill
    $r.Fill.Solid()
    $r.Line.Visible = $msoTrue
    $r.Line.ForeColor.RGB = $borderColor
    $r.Line.Weight = $borderWeight
    return $r
}

function Add-Footer {
    param($slide, [int]$pageNum, [int]$total = 10)
    # Bottom-left brand
    Add-Text $slide 60 510 400 20 "SISTEMA DE ADMINISTRACION PARA IGLESIAS" 8 $msoTrue $grayText $ppAlignLeft | Out-Null
    # Bottom-right page number
    Add-Text $slide 500 510 400 20 ("{0:D2}  /  {1:D2}" -f $pageNum, $total) 8 $msoTrue $navy $ppAlignRight | Out-Null
    # Thin top accent
    Add-Rect $slide 60 60 80 3 $gold | Out-Null
}

# ============================================================
# SLIDE 1 — COVER
# ============================================================
$s1 = $pres.Slides.Add(1, $ppLayoutBlank)
# Full background cream
Add-Rect $s1 0 0 960 540 $cream | Out-Null
# Left navy panel
Add-Rect $s1 0 0 320 540 $navy | Out-Null
# Gold vertical accent on panel edge
Add-Rect $s1 320 0 6 540 $gold | Out-Null

# Cover label on navy panel
Add-Text $s1 40 80 240 24 "DOCUMENTO COMERCIAL" 9 $msoTrue $goldSoft $ppAlignLeft | Out-Null
Add-Text $s1 40 100 240 24 "ESTRATEGICO" 9 $msoTrue $goldSoft $ppAlignLeft | Out-Null

# Big stacked label vertical-ish
Add-Text $s1 40 200 240 100 "Sistema de`nAdministracion`npara Iglesias" 26 $msoTrue $white $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

# Tagline on panel bottom
Add-Text $s1 40 460 240 24 "ORDEN  ·  TRANSPARENCIA" 8 $msoTrue $goldSoft $ppAlignLeft | Out-Null
Add-Text $s1 40 478 240 24 "GENEROSIDAD" 8 $msoTrue $goldSoft $ppAlignLeft | Out-Null

# Main area (right of panel)
Add-Text $s1 380 90 540 30 "PROPUESTA COMERCIAL  ·  2026" 9 $msoTrue $navySoft $ppAlignLeft | Out-Null

# Big main title
Add-Text $s1 380 140 540 200 "Administra tu`niglesia con orden,`ntransparencia y`nfacilidad." 40 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.05 | Out-Null

# Gold divider
Add-Rect $s1 380 360 80 4 $gold | Out-Null

# Subtitle below divider
Add-Text $s1 380 380 540 60 "Personas. Donaciones. Campanas. Recibos. Reportes." 13 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.3 | Out-Null
Add-Text $s1 380 405 540 30 "Una sola plataforma, pensada para iglesias." 13 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.3 | Out-Null

# Bottom footer brand
Add-Text $s1 380 490 540 20 "PARA IGLESIAS HISPANAS Y BILINGUES EN ESTADOS UNIDOS" 8 $msoTrue $grayText $ppAlignLeft | Out-Null

# ============================================================
# SLIDE 2 — EL PROBLEMA
# ============================================================
$s2 = $pres.Slides.Add(2, $ppLayoutBlank)
Add-Rect $s2 0 0 960 540 $white | Out-Null
Add-Footer $s2 2

# Eyebrow
Add-Text $s2 60 90 800 24 "EL PROBLEMA" 10 $msoTrue $gold $ppAlignLeft | Out-Null

# Big title
Add-Text $s2 60 120 800 90 "La generosidad no es el problema." 34 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s2 60 175 800 50 "Administrarla, si." 30 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# 5 chip cards horizontally
$cardY = 270
$cardW = 158
$cardH = 80
$gap = 12
$startX = 60
$cards = @(
    @{ title = "Excel"; sub = "disperso" },
    @{ title = "Libretas"; sub = "sueltas" },
    @{ title = "WhatsApp"; sub = "con apuntes" },
    @{ title = "Recibos"; sub = "manuales" },
    @{ title = "Reportes"; sub = "a mano" }
)
for ($i = 0; $i -lt $cards.Count; $i++) {
    $x = $startX + ($i * ($cardW + $gap))
    Add-RectBorder $s2 $x $cardY $cardW $cardH $cream $lightGray 0.75 | Out-Null
    Add-Text $s2 ($x+12) ($cardY+18) ($cardW-24) 30 $cards[$i].title 16 $msoTrue $navy $ppAlignLeft | Out-Null
    Add-Text $s2 ($x+12) ($cardY+45) ($cardW-24) 24 $cards[$i].sub 11 $msoFalse $grayText $ppAlignLeft | Out-Null
}

# Closing phrase block
Add-Rect $s2 60 400 6 80 $gold | Out-Null
Add-Text $s2 80 405 820 60 "El problema no es la generosidad de la congregacion;" 14 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoTrue 1.3 | Out-Null
Add-Text $s2 80 430 820 60 "el problema es no tener un sistema claro para administrarla." 14 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoTrue 1.3 | Out-Null

# ============================================================
# SLIDE 3 — LA SOLUCION
# ============================================================
$s3 = $pres.Slides.Add(3, $ppLayoutBlank)
Add-Rect $s3 0 0 960 540 $white | Out-Null
Add-Footer $s3 3

Add-Text $s3 60 90 800 24 "LA SOLUCION" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s3 60 120 800 90 "Una plataforma simple," 32 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s3 60 165 800 50 "pensada para iglesias." 28 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# 3x2 grid of modules
$modules = @(
    @{ t="Personas";       d="Miembros, visitantes,`ndonantes, servidores." },
    @{ t="Donaciones";     d="Registradas, clasificadas,`ny respaldadas." },
    @{ t="Campanas";       d="Metas claras con`nprogreso real." },
    @{ t="Recibos";        d="Comprobantes oficiales`nreenviados sin duplicar." },
    @{ t="Reportes";       d="Graficos y`nexportaciones." },
    @{ t="Portal publico"; d="Una pagina propia`npor iglesia." }
)
$gW = 280; $gH = 95; $gGap = 14
$gX0 = 60; $gY0 = 250
for ($i = 0; $i -lt 6; $i++) {
    $col = $i % 3
    $row = [math]::Floor($i / 3)
    $x = $gX0 + $col * ($gW + $gGap)
    $y = $gY0 + $row * ($gH + $gGap)
    Add-RectBorder $s3 $x $y $gW $gH $white $lightGray 0.75 | Out-Null
    # Gold corner accent
    Add-Rect $s3 $x $y 4 $gH $gold | Out-Null
    Add-Text $s3 ($x+18) ($y+12) ($gW-30) 28 $modules[$i].t 16 $msoTrue $navy $ppAlignLeft | Out-Null
    Add-Text $s3 ($x+18) ($y+40) ($gW-30) 50 $modules[$i].d 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.25 | Out-Null
}

# ============================================================
# SLIDE 4 — DONACIONES (CORAZON)
# ============================================================
$s4 = $pres.Slides.Add(4, $ppLayoutBlank)
Add-Rect $s4 0 0 960 540 $white | Out-Null
Add-Footer $s4 4

Add-Text $s4 60 90 800 24 "EL CORAZON DEL SISTEMA" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s4 60 120 800 90 "Donaciones." 42 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s4 60 180 800 30 "Tres etapas, una sola verdad." 16 $msoFalse $grayText $ppAlignLeft "Segoe UI" $msoTrue 1.2 | Out-Null

# Flow: 3 boxes connected
$fY = 250
$fH = 110
$fW = 240
$fGap = 30
$fX0 = 60

# Box 1
Add-Rect $s4 $fX0 $fY $fW $fH $creamSoft | Out-Null
Add-Rect $s4 $fX0 $fY $fW 4 $gold | Out-Null
Add-Text $s4 ($fX0+18) ($fY+18) ($fW-36) 24 "01" 11 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s4 ($fX0+18) ($fY+34) ($fW-36) 30 "Intencion" 18 $msoTrue $navy $ppAlignLeft | Out-Null
Add-Text $s4 ($fX0+18) ($fY+62) ($fW-36) 42 "Visitante o donante`ndeja registrada su`nvoluntad de aportar." 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.2 | Out-Null

# Arrow 1
$arr1 = $s4.Shapes.AddShape($msoShapeRightArrow, ($fX0+$fW+2), ($fY+45), 26, 20)
$arr1.Fill.ForeColor.RGB = $gold
$arr1.Fill.Solid()
$arr1.Line.Visible = $msoFalse

# Box 2
$bx2 = $fX0 + $fW + $fGap
Add-Rect $s4 $bx2 $fY $fW $fH $creamSoft | Out-Null
Add-Rect $s4 $bx2 $fY $fW 4 $gold | Out-Null
Add-Text $s4 ($bx2+18) ($fY+18) ($fW-36) 24 "02" 11 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s4 ($bx2+18) ($fY+34) ($fW-36) 30 "Donacion" 18 $msoTrue $navy $ppAlignLeft | Out-Null
Add-Text $s4 ($bx2+18) ($fY+62) ($fW-36) 42 "La iglesia confirma`nque el aporte`nentro de verdad." 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.2 | Out-Null

# Arrow 2
$arr2 = $s4.Shapes.AddShape($msoShapeRightArrow, ($bx2+$fW+2), ($fY+45), 26, 20)
$arr2.Fill.ForeColor.RGB = $gold
$arr2.Fill.Solid()
$arr2.Line.Visible = $msoFalse

# Box 3
$bx3 = $bx2 + $fW + $fGap
Add-Rect $s4 $bx3 $fY $fW $fH $navy | Out-Null
Add-Rect $s4 $bx3 $fY $fW 4 $gold | Out-Null
Add-Text $s4 ($bx3+18) ($fY+18) ($fW-36) 24 "03" 11 $msoTrue $goldSoft $ppAlignLeft | Out-Null
Add-Text $s4 ($bx3+18) ($fY+34) ($fW-36) 30 "Recibo oficial" 18 $msoTrue $white $ppAlignLeft | Out-Null
Add-Text $s4 ($bx3+18) ($fY+62) ($fW-36) 42 "Comprobante con`nnumero oficial,`nreenviable sin duplicar." 10 $msoFalse $cream $ppAlignLeft "Segoe UI" $msoFalse 1.2 | Out-Null

# Rule callout
Add-Rect $s4 60 410 6 80 $gold | Out-Null
Add-Text $s4 80 415 820 60 "Solo la donacion confirmada genera comprobante" 14 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoTrue 1.3 | Out-Null
Add-Text $s4 80 440 820 60 "y cuenta en los reportes. Cero ruido. Cero duplicados." 14 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoTrue 1.3 | Out-Null

# ============================================================
# SLIDE 5 — CAMPANAS + RECIBOS
# ============================================================
$s5 = $pres.Slides.Add(5, $ppLayoutBlank)
Add-Rect $s5 0 0 960 540 $white | Out-Null
Add-Footer $s5 5

Add-Text $s5 60 90 800 24 "PROYECTOS Y COMPROBANTES" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s5 60 120 800 90 "Metas claras." 34 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s5 60 165 800 50 "Comprobantes seguros." 30 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# Left column: Campanas
Add-Rect $s5 60 250 410 240 $cream | Out-Null
Add-Rect $s5 60 250 410 4 $gold | Out-Null
Add-Text $s5 80 270 370 24 "CAMPANAS" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s5 80 295 370 40 "Convierte proyectos en metas." 20 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

$bullets1 = @(
    "Misiones, construccion, retiros,",
    "ayuda comunitaria.",
    "",
    "Meta, recaudado y progreso visible",
    "desde el portal publico.",
    "",
    "El progreso solo cuenta donaciones",
    "confirmadas. Cero inflacion."
)
$by = 345
foreach ($b in $bullets1) {
    Add-Text $s5 80 $by 370 16 $b 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $by += 16
}

# Right column: Recibos
Add-Rect $s5 490 250 410 240 $cream | Out-Null
Add-Rect $s5 490 250 410 4 $gold | Out-Null
Add-Text $s5 510 270 370 24 "RECIBOS" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s5 510 295 370 40 "Comprobantes que si se encuentran." 20 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

$bullets2 = @(
    "Numero oficial y consecutivo.",
    "",
    "Historial completo de envios",
    "por cada comprobante.",
    "",
    "Reenvia el recibo sin duplicar",
    "la donacion. Reportes intactos."
)
$by = 345
foreach ($b in $bullets2) {
    Add-Text $s5 510 $by 370 16 $b 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $by += 16
}

# ============================================================
# SLIDE 6 — PERSONAS + PORTAL
# ============================================================
$s6 = $pres.Slides.Add(6, $ppLayoutBlank)
Add-Rect $s6 0 0 960 540 $white | Out-Null
Add-Footer $s6 6

Add-Text $s6 60 90 800 24 "CONGREGACION Y PRESENCIA" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s6 60 120 800 90 "Tu gente organizada." 34 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s6 60 165 800 50 "Tu iglesia visible." 30 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# Left: Personas
Add-Rect $s6 60 250 410 240 $creamSoft | Out-Null
Add-Rect $s6 60 250 410 4 $gold | Out-Null
Add-Text $s6 80 270 370 24 "PERSONAS" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s6 80 295 370 40 "Una sola base de tu congregacion." 18 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

$bp1 = @(
    "Miembros activos.",
    "Visitantes nuevos.",
    "Donantes regulares.",
    "Servidores y lideres.",
    "Inactivos identificados.",
    "",
    "Una sola base. Sin Excel.",
    "Sin libretas. Sin perdidas."
)
$by = 345
foreach ($b in $bp1) {
    Add-Text $s6 80 $by 370 16 $b 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $by += 16
}

# Right: Portal publico
Add-Rect $s6 490 250 410 240 $navy | Out-Null
Add-Rect $s6 490 250 410 4 $gold | Out-Null
Add-Text $s6 510 270 370 24 "PORTAL PUBLICO" 10 $msoTrue $goldSoft $ppAlignLeft | Out-Null
Add-Text $s6 510 295 370 40 "Una pagina propia por iglesia." 18 $msoTrue $white $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

$bp2 = @(
    "Informacion oficial de la iglesia.",
    "Horarios y servicios.",
    "Campanas activas con progreso.",
    "Intencion de donacion publica.",
    "",
    "Imagen profesional.",
    "Captacion ampliada.",
    "Lista para donaciones online."
)
$by = 345
foreach ($b in $bp2) {
    Add-Text $s6 510 $by 370 16 $b 10 $msoFalse $cream $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $by += 16
}

# ============================================================
# SLIDE 7 — REPORTES
# ============================================================
$s7 = $pres.Slides.Add(7, $ppLayoutBlank)
Add-Rect $s7 0 0 960 540 $white | Out-Null
Add-Footer $s7 7

Add-Text $s7 60 90 800 24 "DECISIONES INFORMADAS" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s7 60 120 800 90 "Cuando el liderazgo pregunta," 30 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s7 60 162 800 50 "el sistema responde." 30 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# 4 horizontal cards
$rCards = @(
    @{ t="Por periodo";  d="Semana, mes, trimestre, ano." },
    @{ t="Por fondo";    d="General, misiones, construccion." },
    @{ t="Por campana";  d="Recaudado real vs. meta." },
    @{ t="Por donante";  d="Historial completo y exportable." }
)
$rW = 200; $rH = 130; $rGap = 14
$rX0 = 60; $rY0 = 250
for ($i = 0; $i -lt 4; $i++) {
    $x = $rX0 + $i * ($rW + $rGap)
    Add-RectBorder $s7 $x $rY0 $rW $rH $cream $lightGray 0.5 | Out-Null
    Add-Rect $s7 $x $rY0 $rW 3 $gold | Out-Null
    Add-Text $s7 ($x+16) ($rY0+18) ($rW-32) 24 ("0{0}" -f ($i+1)) 9 $msoTrue $gold $ppAlignLeft | Out-Null
    Add-Text $s7 ($x+16) ($rY0+38) ($rW-32) 30 $rCards[$i].t 16 $msoTrue $navy $ppAlignLeft | Out-Null
    Add-Text $s7 ($x+16) ($rY0+72) ($rW-32) 50 $rCards[$i].d 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.3 | Out-Null
}

# Bottom tagline
Add-Rect $s7 60 420 6 60 $gold | Out-Null
Add-Text $s7 80 425 820 30 "Menos Excel. Mas claridad." 18 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s7 80 455 820 30 "Exportaciones listas para el contador en segundos." 12 $msoFalse $grayText $ppAlignLeft "Segoe UI" $msoTrue 1.2 | Out-Null

# ============================================================
# SLIDE 8 — PRECIO
# ============================================================
$s8 = $pres.Slides.Add(8, $ppLayoutBlank)
Add-Rect $s8 0 0 960 540 $cream | Out-Null
Add-Footer $s8 8

Add-Text $s8 60 90 800 24 "PRECIO SIMPLE" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s8 60 120 800 60 "Un solo plan. Todo incluido." 28 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

# Hero price box
Add-Rect $s8 60 210 540 230 $navy | Out-Null
Add-Rect $s8 60 210 8 230 $gold | Out-Null

Add-Text $s8 100 230 480 30 "PLAN MINISTERIO" 11 $msoTrue $goldSoft $ppAlignLeft | Out-Null

# Big price
Add-Text $s8 100 260 280 130 "`$25" 100 $msoTrue $white $ppAlignLeft "Segoe UI Light" $msoFalse 1.0 | Out-Null
Add-Text $s8 320 320 200 40 "/ mes" 18 $msoFalse $goldSoft $ppAlignLeft "Segoe UI Light" $msoFalse 1.0 | Out-Null

Add-Text $s8 100 395 480 30 "Sin contrato a largo plazo. Cancela cuando quieras." 11 $msoFalse $cream $ppAlignLeft "Segoe UI" $msoTrue 1.2 | Out-Null

# Right column: features list
Add-Text $s8 630 220 280 24 "INCLUYE" 10 $msoTrue $gold $ppAlignLeft | Out-Null
$features = @(
    "Panel administrativo completo",
    "Portal publico por iglesia",
    "Personas y donaciones",
    "Campanas con metas visibles",
    "Comprobantes oficiales",
    "Reportes y exportaciones",
    "Usuarios y permisos por rol",
    "Soporte inicial"
)
$fy = 250
foreach ($f in $features) {
    Add-Rect $s8 630 ($fy+6) 4 4 $gold | Out-Null
    Add-Text $s8 642 $fy 280 18 $f 10 $msoFalse $darkText $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $fy += 22
}

# Setup option footer band
Add-Rect $s8 60 455 840 30 $white | Out-Null
Add-Text $s8 80 462 800 20 "SETUP OPCIONAL  ·  Desde `$99  ·  Configuracion inicial + capacitacion" 10 $msoTrue $navy $ppAlignLeft | Out-Null

# ============================================================
# SLIDE 9 — ALIANZA + ROADMAP
# ============================================================
$s9 = $pres.Slides.Add(9, $ppLayoutBlank)
Add-Rect $s9 0 0 960 540 $white | Out-Null
Add-Footer $s9 9

Add-Text $s9 60 90 800 24 "OPORTUNIDAD COMERCIAL" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s9 60 120 800 90 "Modelo claro." 32 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null
Add-Text $s9 60 162 800 50 "Crecimiento sostenible." 28 $msoFalse $navySoft $ppAlignLeft "Segoe UI Light" $msoTrue 1.1 | Out-Null

# Left: Alianza
Add-Rect $s9 60 250 410 240 $creamSoft | Out-Null
Add-Rect $s9 60 250 410 4 $gold | Out-Null
Add-Text $s9 80 270 370 24 "ALIANZA COMERCIAL" 10 $msoTrue $gold $ppAlignLeft | Out-Null
Add-Text $s9 80 295 370 40 "Comision por cliente activo." 18 $msoTrue $navy $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

# Plan rows
$aRows = @(
    @{ tag="A"; t="Referido simple";  v="20%" },
    @{ tag="B"; t="Partner activo";   v="30%" },
    @{ tag="C"; t="Escalonado";       v="25-35%" }
)
$ay = 345
foreach ($r in $aRows) {
    Add-Rect $s9 80 $ay 30 30 $navy | Out-Null
    Add-Text $s9 80 ($ay+4) 30 22 $r.tag 12 $msoTrue $goldSoft $ppAlignCenter | Out-Null
    Add-Text $s9 120 ($ay+5) 200 24 $r.t 13 $msoFalse $darkText $ppAlignLeft | Out-Null
    Add-Text $s9 320 ($ay+4) 130 24 $r.v 16 $msoTrue $gold $ppAlignRight | Out-Null
    $ay += 40
}
Add-Text $s9 80 470 370 16 "+ Setup 40%  ·  Sin cesion de copyright" 9 $msoFalse $grayText $ppAlignLeft "Segoe UI" $msoTrue 1.0 | Out-Null

# Right: Roadmap
Add-Rect $s9 490 250 410 240 $navy | Out-Null
Add-Rect $s9 490 250 410 4 $gold | Out-Null
Add-Text $s9 510 270 370 24 "ROADMAP" 10 $msoTrue $goldSoft $ppAlignLeft | Out-Null
Add-Text $s9 510 295 370 40 "Evolucion en tres etapas." 18 $msoTrue $white $ppAlignLeft "Segoe UI Light" $msoFalse 1.1 | Out-Null

$rmRows = @(
    @{ n="01"; t="Piloto";      d="Lo que vendemos hoy. Funcional." },
    @{ n="02"; t="Stripe";      d="Donaciones online reales." },
    @{ n="03"; t="Automation";  d="Email, PDF, estado anual." }
)
$ry = 345
foreach ($r in $rmRows) {
    Add-Text $s9 510 $ry 50 24 $r.n 11 $msoTrue $goldSoft $ppAlignLeft | Out-Null
    Add-Text $s9 555 ($ry-2) 200 24 $r.t 14 $msoTrue $white $ppAlignLeft | Out-Null
    Add-Text $s9 555 ($ry+18) 320 20 $r.d 10 $msoFalse $cream $ppAlignLeft "Segoe UI" $msoFalse 1.0 | Out-Null
    $ry += 45
}

# ============================================================
# SLIDE 10 — CIERRE / CTA
# ============================================================
$s10 = $pres.Slides.Add(10, $ppLayoutBlank)
Add-Rect $s10 0 0 960 540 $navy | Out-Null
# Gold accent
Add-Rect $s10 0 0 6 540 $gold | Out-Null

# Top label
Add-Text $s10 60 90 840 24 "EL SIGUIENTE PASO" 10 $msoTrue $gold $ppAlignCenter | Out-Null

# Big closing title
Add-Text $s10 60 160 840 100 "Tu iglesia merece" 42 $msoTrue $white $ppAlignCenter "Segoe UI Light" $msoFalse 1.05 | Out-Null
Add-Text $s10 60 215 840 80 "mas orden, mas claridad," 42 $msoTrue $white $ppAlignCenter "Segoe UI Light" $msoFalse 1.05 | Out-Null
Add-Text $s10 60 270 840 80 "mas transparencia." 42 $msoFalse $goldSoft $ppAlignCenter "Segoe UI Light" $msoTrue 1.05 | Out-Null

# Gold divider
Add-Rect $s10 440 360 80 4 $gold | Out-Null

# CTA
Add-Text $s10 60 390 840 30 "Agenda una demo de quince minutos." 16 $msoFalse $cream $ppAlignCenter "Segoe UI" $msoFalse 1.2 | Out-Null

# CTA button-style
Add-Rect $s10 380 430 200 44 $gold | Out-Null
Add-Text $s10 380 442 200 24 "AGENDAR DEMO" 12 $msoTrue $navyDark $ppAlignCenter | Out-Null

# Bottom signature
Add-Text $s10 60 510 840 20 "ORDEN  ·  TRANSPARENCIA  ·  GENEROSIDAD" 9 $msoTrue $goldSoft $ppAlignCenter | Out-Null

# ============================================================
# SAVE & QUIT
# ============================================================
try {
    $pres.SaveAs($Output, $ppSaveAsOpenXMLPresentation)
    $pres.Close()
    Write-Output "PPT saved to: $Output"
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
