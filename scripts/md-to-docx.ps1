# Convert markdown to DOCX using Word COM
param(
    [Parameter(Mandatory=$true)] [string]$InputMd,
    [Parameter(Mandatory=$true)] [string]$OutputDocx
)

function Convert-InlineMarkdown {
    param([string]$text)
    # Escape HTML special chars first
    $text = $text -replace '&', '&amp;'
    $text = $text -replace '<', '&lt;'
    $text = $text -replace '>', '&gt;'
    # Bold **text**
    $text = [regex]::Replace($text, '\*\*([^\*]+)\*\*', '<strong>$1</strong>')
    # Italic *text*
    $text = [regex]::Replace($text, '(?<!\*)\*([^\*]+)\*(?!\*)', '<em>$1</em>')
    # Inline code `text`
    $text = [regex]::Replace($text, '`([^`]+)`', '<code>$1</code>')
    return $text
}

$md = Get-Content -Path $InputMd -Encoding UTF8
$html = New-Object System.Text.StringBuilder
[void]$html.Append('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Documento</title>')
[void]$html.Append('<style>')
[void]$html.Append('body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }')
[void]$html.Append('h1 { font-size: 24pt; color: #1a365d; margin-top: 24pt; margin-bottom: 12pt; }')
[void]$html.Append('h2 { font-size: 18pt; color: #2b5582; margin-top: 18pt; margin-bottom: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }')
[void]$html.Append('h3 { font-size: 14pt; color: #2b5582; margin-top: 14pt; margin-bottom: 8pt; }')
[void]$html.Append('h4 { font-size: 12pt; color: #444; margin-top: 12pt; margin-bottom: 6pt; }')
[void]$html.Append('p { margin: 6pt 0; }')
[void]$html.Append('ul, ol { margin: 6pt 0 6pt 24pt; }')
[void]$html.Append('li { margin: 3pt 0; }')
[void]$html.Append('table { border-collapse: collapse; margin: 10pt 0; }')
[void]$html.Append('th, td { border: 1px solid #999; padding: 6pt 10pt; text-align: left; }')
[void]$html.Append('th { background-color: #e8eef5; font-weight: bold; }')
[void]$html.Append('pre { background-color: #f4f4f4; border: 1px solid #ddd; padding: 10pt; font-family: Consolas, monospace; font-size: 10pt; white-space: pre-wrap; }')
[void]$html.Append('code { background-color: #f4f4f4; padding: 1pt 4pt; font-family: Consolas, monospace; font-size: 10pt; }')
[void]$html.Append('hr { border: none; border-top: 1px solid #ccc; margin: 18pt 0; }')
[void]$html.Append('blockquote { border-left: 3px solid #2b5582; margin: 10pt 0; padding-left: 12pt; color: #555; font-style: italic; }')
[void]$html.Append('</style></head><body>')

$inList = $false
$listType = $null
$inCode = $false
$inTable = $false
$tableHeaderDone = $false

foreach ($rawLine in $md) {
    $line = $rawLine.TrimEnd()

    if ($line -match '^```') {
        if ($inCode) {
            [void]$html.Append('</pre>')
            $inCode = $false
        } else {
            if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
            [void]$html.Append('<pre>')
            $inCode = $true
        }
        continue
    }

    if ($inCode) {
        $escaped = $line -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
        [void]$html.Append($escaped + "`n")
        continue
    }

    if ($line -match '^\s*$') {
        if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
        if ($inTable) { [void]$html.Append('</table>'); $inTable = $false; $tableHeaderDone = $false }
        continue
    }

    if ($line -match '^\|(.+)\|\s*$') {
        $cells = $line.Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        # Separator row?
        $isSep = $true
        foreach ($c in $cells) { if ($c -notmatch '^:?-+:?$') { $isSep = $false; break } }
        if ($isSep) {
            continue
        }
        if (-not $inTable) {
            if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
            [void]$html.Append('<table>')
            $inTable = $true
            $tableHeaderDone = $false
        }
        if (-not $tableHeaderDone) {
            [void]$html.Append('<tr>')
            foreach ($c in $cells) {
                [void]$html.Append('<th>' + (Convert-InlineMarkdown $c) + '</th>')
            }
            [void]$html.Append('</tr>')
            $tableHeaderDone = $true
        } else {
            [void]$html.Append('<tr>')
            foreach ($c in $cells) {
                [void]$html.Append('<td>' + (Convert-InlineMarkdown $c) + '</td>')
            }
            [void]$html.Append('</tr>')
        }
        continue
    } elseif ($inTable) {
        [void]$html.Append('</table>')
        $inTable = $false
        $tableHeaderDone = $false
    }

    if ($line -match '^#{1,6}\s+(.+)') {
        if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
        $level = ($line -replace '^(#+).*','$1').Length
        $content = $line -replace '^#+\s+',''
        [void]$html.Append("<h$level>" + (Convert-InlineMarkdown $content) + "</h$level>")
        continue
    }

    if ($line -match '^---+\s*$' -or $line -match '^\*\*\*+\s*$') {
        if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
        [void]$html.Append('<hr>')
        continue
    }

    if ($line -match '^>\s?(.*)') {
        if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
        [void]$html.Append('<blockquote>' + (Convert-InlineMarkdown $matches[1]) + '</blockquote>')
        continue
    }

    if ($line -match '^\s*[-\*\+]\s+(.+)') {
        if (-not $inList -or $listType -ne 'ul') {
            if ($inList) { [void]$html.Append("</$listType>") }
            [void]$html.Append('<ul>')
            $inList = $true
            $listType = 'ul'
        }
        [void]$html.Append('<li>' + (Convert-InlineMarkdown $matches[1]) + '</li>')
        continue
    }

    if ($line -match '^\s*\d+\.\s+(.+)') {
        if (-not $inList -or $listType -ne 'ol') {
            if ($inList) { [void]$html.Append("</$listType>") }
            [void]$html.Append('<ol>')
            $inList = $true
            $listType = 'ol'
        }
        [void]$html.Append('<li>' + (Convert-InlineMarkdown $matches[1]) + '</li>')
        continue
    }

    if ($inList) { [void]$html.Append("</$listType>"); $inList = $false }
    [void]$html.Append('<p>' + (Convert-InlineMarkdown $line) + '</p>')
}

if ($inList) { [void]$html.Append("</$listType>") }
if ($inTable) { [void]$html.Append('</table>') }
if ($inCode) { [void]$html.Append('</pre>') }

[void]$html.Append('</body></html>')

$tempHtml = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.IO.Path]::GetRandomFileName() + '.html')
[System.IO.File]::WriteAllText($tempHtml, $html.ToString(), [System.Text.UTF8Encoding]::new($true))

Write-Output "HTML written to: $tempHtml"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0  # wdAlertsNone

try {
    $doc = $word.Documents.Open($tempHtml, $false, $true)  # ReadOnly = true
    # wdFormatDocumentDefault = 16 (.docx)
    $doc.SaveAs([ref]$OutputDocx, [ref]16)
    $doc.Close([ref]$false)
    Write-Output "DOCX written to: $OutputDocx"
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
}
