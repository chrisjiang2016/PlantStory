# 添加测试数据到 fluttertest 账号

$baseUrl = "http://localhost:3000/api/v1"
$username = "fluttertest2"
$password = "test123456"

Write-Host "=== 植の物语测试数据插入 ===" -ForegroundColor Green
Write-Host ""

# 1. 登录获取 token
Write-Host "1. 登录账号 $username..." -ForegroundColor Cyan
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "✓ 登录成功，Token: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "✗ 登录失败: $_" -ForegroundColor Red
    Write-Host "请先注册账号: POST $baseUrl/auth/register { username: '$username', password: '$password' }" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""

# 2. 添加植物
Write-Host "2. 添加测试植物..." -ForegroundColor Cyan

$plants = @(
    @{ speciesId = 1; nickname = "客厅的小绿"; location = "客厅窗台" },
    @{ speciesId = 2; nickname = "阳台多肉"; location = "阳台" },
    @{ speciesId = 3; nickname = "书房的发财树"; location = "书房" }
)

$plantIds = @()

foreach ($plant in $plants) {
    try {
        $body = $plant | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$baseUrl/garden" -Method POST -Headers $headers -Body $body
        $plantIds += $response.id
        Write-Host "✓ 植物: $($plant.nickname) (ID: $($response.id))" -ForegroundColor Green
    } catch {
        Write-Host "✗ 添加植物失败: $($plant.nickname) - $_" -ForegroundColor Red
    }
}

Write-Host ""

# 3. 添加提醒
Write-Host "3. 添加测试提醒..." -ForegroundColor Cyan

if ($plantIds.Count -eq 0) {
    Write-Host "⚠ 没有可用的植物ID，跳过提醒创建" -ForegroundColor Yellow
} else {
    $now = Get-Date
    $reminders = @(
        @{
            myPlantId = $plantIds[0]
            title = "浇水提醒"
            careType = "water"
            remindAt = $now.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        },
        @{
            myPlantId = $plantIds[1]
            title = "施肥提醒"
            careType = "fertilize"
            remindAt = $now.AddDays(2).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            repeatRule = "weekly"
        },
        @{
            myPlantId = $plantIds[2]
            title = "修剪提醒"
            careType = "prune"
            remindAt = $now.AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
    )

    foreach ($reminder in $reminders) {
        try {
            $body = $reminder | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "$baseUrl/reminders" -Method POST -Headers $headers -Body $body
            Write-Host "✓ 提醒: $($reminder.title) (ID: $($response.id))" -ForegroundColor Green
        } catch {
            Write-Host "✗ 添加提醒失败: $($reminder.title) - $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
Write-Host "账号: $username" -ForegroundColor White
Write-Host "密码: $password" -ForegroundColor White
Write-Host "植物数: $($plantIds.Count)" -ForegroundColor White
