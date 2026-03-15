param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [string]$Secret = ""
)

$url = "$BaseUrl/api/refresh?trigger=manual"
$headers = @{}

if ($Secret -ne "") {
  $headers["x-cron-secret"] = $Secret
}

Write-Host "POST $url"
$response = Invoke-RestMethod -Method Post -Uri $url -Headers $headers
$response | ConvertTo-Json -Depth 5
