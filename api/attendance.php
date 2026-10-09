<?php
/**
 * Attendance Records API Endpoint
 */
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $dateRange = $_GET['dateRange'] ?? '30days';
        $startDate = $_GET['startDate'] ?? null;
        $endDate   = $_GET['endDate'] ?? null;
        $siteId    = $_GET['siteId'] ?? 'all';
        $staffId   = $_GET['staffId'] ?? 'all';
        $status    = $_GET['status'] ?? 'all';
        $page      = max(1, (int)($_GET['page'] ?? 1));
        $pageSize  = max(1, (int)($_GET['pageSize'] ?? 15));

        $where = [];
        $params = [];

        // Date Range
        $today = date('Y-m-d');
        if ($dateRange === 'today') {
            $where[] = "`date` = ?";
            $params[] = $today;
        } elseif ($dateRange === '7days') {
            $cutoff = date('Y-m-d', strtotime('-7 days'));
            $where[] = "`date` >= ?";
            $params[] = $cutoff;
        } elseif ($dateRange === '30days') {
            $cutoff = date('Y-m-d', strtotime('-30 days'));
            $where[] = "`date` >= ?";
            $params[] = $cutoff;
        } elseif ($dateRange === 'custom' && $startDate && $endDate) {
            $where[] = "`date` BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }

        // Site Filter
        if ($siteId && $siteId !== 'all') {
            $where[] = "`site_id` = ?";
            $params[] = $siteId;
        }

        // Staff Filter
        if ($staffId && $staffId !== 'all') {
            $where[] = "`staff_id` = ?";
            $params[] = $staffId;
        }

        // Status Filter
        if ($status && $status !== 'all') {
            if ($status === 'Present') {
                $where[] = "(`status` LIKE '%Present%' OR `status` LIKE '%Overtime%')";
            } elseif ($status === 'Late') {
                $where[] = "`status` LIKE '%Late%'";
            } elseif ($status === 'Flagged') {
                $where[] = "(`geofence_flag` LIKE '%Flagged%' OR `check_in_geofence_verified` = 0)";
            } elseif ($status === 'Active') {
                $where[] = "`check_out_time` IS NULL";
            }
        }

        $whereSql = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

        // Total count
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `attendance` {$whereSql}");
        $countStmt->execute($params);
        $totalRecords = (int)$countStmt->fetchColumn();

        // Summary KPI Stats
        $statsStmt = $pdo->prepare("
            SELECT 
                COUNT(*) as totalShifts,
                COALESCE(SUM(total_hours_decimal), 0) as totalHours,
                COALESCE(SUM(CASE WHEN check_in_geofence_verified = 1 THEN 1 ELSE 0 END), 0) as onSiteCount,
                COALESCE(SUM(CASE WHEN status LIKE '%Late%' THEN 1 ELSE 0 END), 0) as lateCount,
                COALESCE(SUM(CASE WHEN check_out_time IS NULL THEN 1 ELSE 0 END), 0) as activeShifts
            FROM `attendance` {$whereSql}
        ");
        $statsStmt->execute($params);
        $kpi = $statsStmt->fetch();

        $complianceRate = $totalRecords > 0 ? round(($kpi['onSiteCount'] / $totalRecords) * 100) : 100;

        // Pagination query
        $totalPages = max(1, (int)ceil($totalRecords / $pageSize));
        $offset = ($page - 1) * $pageSize;

        // Fetch records
        $sql = "SELECT * FROM `attendance` {$whereSql} ORDER BY `check_in_timestamp` DESC LIMIT {$pageSize} OFFSET {$offset}";
        $dataStmt = $pdo->prepare($sql);
        $dataStmt->execute($params);
        $rows = $dataStmt->fetchAll();

        // Format rows for frontend compatibility
        $records = [];
        foreach ($rows as $r) {
            $records[] = [
                'id' => $r['id'],
                'staffId' => $r['staff_id'],
                'staffName' => $r['staff_name'],
                'role' => $r['role'],
                'siteId' => $r['site_id'],
                'siteName' => $r['site_name'],
                'siteCode' => $r['site_code'],
                'date' => $r['date'],
                'checkIn' => [
                    'timestamp' => $r['check_in_timestamp'],
                    'timeFormatted' => $r['check_in_time'],
                    'latitude' => (float)$r['check_in_lat'],
                    'longitude' => (float)$r['check_in_lng'],
                    'accuracy' => (int)$r['check_in_accuracy'],
                    'geofenceDistanceMeters' => (int)$r['check_in_distance'],
                    'geofenceVerified' => (bool)$r['check_in_geofence_verified'],
                    'device' => 'MySQL Field GPS'
                ],
                'checkOut' => $r['check_out_time'] ? [
                    'timestamp' => $r['check_out_timestamp'],
                    'timeFormatted' => $r['check_out_time'],
                    'latitude' => (float)$r['check_out_lat'],
                    'longitude' => (float)$r['check_out_lng'],
                    'accuracy' => (int)$r['check_out_accuracy'],
                    'geofenceDistanceMeters' => (int)$r['check_out_distance'],
                    'geofenceVerified' => (bool)$r['check_out_geofence_verified']
                ] : null,
                'totalDurationSeconds' => $r['total_duration_seconds'] !== null ? (int)$r['total_duration_seconds'] : null,
                'totalDurationFormatted' => $r['total_duration_formatted'],
                'totalHoursDecimal' => (float)$r['total_hours_decimal'],
                'status' => $r['status'],
                'geofenceFlag' => $r['geofence_flag'],
                'verifiedPhoto' => $r['verified_photo'],
                'notes' => $r['notes']
            ];
        }

        echo json_encode([
            'success' => true,
            'records' => $records,
            'totalRecords' => $totalRecords,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'pageSize' => $pageSize,
            'stats' => [
                'totalShifts' => (int)$kpi['totalShifts'],
                'totalHours' => number_format((float)$kpi['totalHours'], 1, '.', ''),
                'complianceRate' => $complianceRate,
                'lateCount' => (int)$kpi['lateCount'],
                'activeShifts' => (int)$kpi['activeShifts']
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
        exit();
    }

    $action = $input['action'] ?? 'checkin';

    try {
        if ($action === 'checkin') {
            $record = $input['record'];
            $stmt = $pdo->prepare("
                INSERT INTO `attendance` (
                    `id`, `staff_id`, `staff_name`, `role`, `site_id`, `site_name`, `site_code`,
                    `date`, `check_in_time`, `check_in_timestamp`, `check_in_lat`, `check_in_lng`,
                    `check_in_accuracy`, `check_in_distance`, `check_in_geofence_verified`,
                    `total_duration_formatted`, `status`, `geofence_flag`, `verified_photo`, `notes`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $record['id'],
                $record['staffId'],
                $record['staffName'],
                $record['role'] ?? '',
                $record['siteId'],
                $record['siteName'],
                $record['siteCode'] ?? '',
                $record['date'],
                $record['checkIn']['timeFormatted'],
                date('Y-m-d H:i:s', strtotime($record['checkIn']['timestamp'])),
                $record['checkIn']['latitude'],
                $record['checkIn']['longitude'],
                $record['checkIn']['accuracy'] ?? 5,
                $record['checkIn']['geofenceDistanceMeters'] ?? 0,
                $record['checkIn']['geofenceVerified'] ? 1 : 0,
                'In Progress',
                $record['status'] ?? 'Present',
                $record['geofenceFlag'] ?? 'Verified (On-Site)',
                $record['verifiedPhoto'] ?? null,
                $record['notes'] ?? ''
            ]);

            echo json_encode(['success' => true, 'data' => $record]);
        } elseif ($action === 'checkout') {
            $id = $input['id'];
            $updates = $input['updates'];

            $stmt = $pdo->prepare("
                UPDATE `attendance` SET
                    `check_out_time` = ?,
                    `check_out_timestamp` = ?,
                    `check_out_lat` = ?,
                    `check_out_lng` = ?,
                    `check_out_accuracy` = ?,
                    `check_out_distance` = ?,
                    `check_out_geofence_verified` = ?,
                    `total_duration_seconds` = ?,
                    `total_duration_formatted` = ?,
                    `total_hours_decimal` = ?,
                    `status` = ?
                WHERE `id` = ?
            ");
            $stmt->execute([
                $updates['checkOut']['timeFormatted'],
                date('Y-m-d H:i:s', strtotime($updates['checkOut']['timestamp'])),
                $updates['checkOut']['latitude'],
                $updates['checkOut']['longitude'],
                $updates['checkOut']['accuracy'] ?? 5,
                $updates['checkOut']['geofenceDistanceMeters'] ?? 0,
                $updates['checkOut']['geofenceVerified'] ? 1 : 0,
                $updates['totalDurationSeconds'],
                $updates['totalDurationFormatted'],
                $updates['totalHoursDecimal'],
                $updates['status'],
                $id
            ]);

            echo json_encode(['success' => true, 'message' => 'Checked out successfully']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    try {
        $pdo->exec("TRUNCATE TABLE `attendance`");
        echo json_encode(['success' => true, 'message' => 'Attendance logs truncated']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
