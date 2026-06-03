$c = Get-Content C:\Users\kidist\pas-frontend\build_output7.txt -Raw
$c = $c -replace '\x1b\[[0-9;]*m', ''
$l = $c -split "`n"
$files = @{}
foreach ($line in $l) {
    if ($line -match 'X \[ERROR\]') {
        # Try to find a file path in the line or nearby lines
        if ($line -match 'src/app/[^\s:''"]+') {
            $f = $Matches[0]
            $files[$f] = ($files[$f] ?? 0) + 1
        } elseif ($line -match "'([^']+\.ts)'") {
            $f = $Matches[1]
            $f = $f -replace '.*src/app/', 'src/app/'
            $files[$f] = ($files[$f] ?? 0) + 1
        }
    }
}
$files.GetEnumerator() | Sort-Object Value -Descending | Select-Object @{N='Count';E={$_.Value}}, @{N='File';E={$_.Key}} | Format-Table -AutoSize
