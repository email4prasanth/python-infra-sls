# z-combined_pycode.ps1
# Combines all .py files recursively into z-combined.py

$outputFile = "z-combined.py"

# Delete output file if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
    Write-Output "$outputFile already existed and was deleted."
}

# Get all .py files recursively
$allPyFiles = Get-ChildItem -Path . -Filter "*.py" -Recurse

# Process each file
$allPyFiles | ForEach-Object {
    # Get relative file path
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    
    # Add file header with relative path
    Add-Content -Path $outputFile -Value "# ------ File: $relativePath ------"
    
    # Add file contents
    Get-Content $_.FullName | Add-Content $outputFile
    
    # Add separation newlines
    Add-Content -Path $outputFile -Value "`n`n"
}

$fileCount = ($allPyFiles | Measure-Object).Count
Write-Output "Combined $fileCount .py files into $outputFile"