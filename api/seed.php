<?php
/**
 * Database Seed Script for MySQL
 * Populates Default Construction Sites, Staff Roster, and 35 Days of Attendance Punches
 */
require_once __DIR__ . '/db.php';

try {
    // 1. Seed Construction Sites
    $pdo->exec("TRUNCATE TABLE `sites`");
    $siteStmt = $pdo->prepare("
        INSERT INTO `sites` (`id`, `name`, `code`, `address`, `latitude`, `longitude`, `radius`, `supervisor`, `supervisor_phone`, `active_workers`, `status`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $defaultSites = [
        ['SITE-01', 'Skyline Tower - Phase 2', 'SKY-TWR-02', '450 Mission St, Financial District, SF', 37.789850, -122.399550, 150, 'Robert Sterling (Foreman)', '+1 (555) 234-5678', 18, 'Active'],
        ['SITE-02', 'Harbor Logistics Drydock', 'HBR-LOG-05', 'Pier 70, Potrero Point, SF', 37.760120, -122.387450, 200, 'Elena Rostova (Site Lead)', '+1 (555) 345-6789', 24, 'Active'],
        ['SITE-03', 'Bayview Metro Expressway Flyover', 'BYV-EXP-11', 'Hunters Point Expressway & 3rd St', 37.731450, -122.389100, 250, 'Marcus Vance (Civil Lead)', '+1 (555) 456-7890', 14, 'Active'],
        ['SITE-04', 'Solar Grid Substation Beta', 'SLR-GRD-04', 'Oakland Outer Terminal Yard', 37.812200, -122.285400, 300, 'Devon Patel (Electrical Super)', '+1 (555) 567-8901', 12, 'Active']
    ];

    foreach ($defaultSites as $site) {
        $siteStmt->execute($site);
    }

    // 2. Seed Staff Roster
    $pdo->exec("TRUNCATE TABLE `staff`");
    $staffStmt = $pdo->prepare("
        INSERT INTO `staff` (`id`, `name`, `role`, `phone`, `primary_site_id`, `avatar`)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    $defaultStaff = [
        ['EMP-101', 'Marcus Vance', 'Heavy Crane Operator', '+1 (555) 011-2233', 'SITE-01', 'MV'],
        ['EMP-102', 'David Miller', 'Structural Steel Foreman', '+1 (555) 022-3344', 'SITE-01', 'DM'],
        ['EMP-103', 'Elena Rostova', 'Senior Civil Engineer', '+1 (555) 033-4455', 'SITE-02', 'ER'],
        ['EMP-104', 'Carlos Mendez', 'Rebar & Concrete Specialist', '+1 (555) 044-5566', 'SITE-02', 'CM'],
        ['EMP-105', 'Sarah Jenkins', 'Site Safety Officer', '+1 (555) 055-6677', 'SITE-03', 'SJ'],
        ['EMP-106', 'Devon Patel', 'Electrical Grid Technician', '+1 (555) 066-7788', 'SITE-04', 'DP'],
        ['EMP-107', 'Tomasz Kowalski', 'Excavation Lead', '+1 (555) 077-8899', 'SITE-03', 'TK'],
        ['EMP-108', 'Aisha Al-Mansoor', 'Quality & Survey Inspector', '+1 (555) 088-9900', 'SITE-01', 'AA']
    ];

    foreach ($defaultStaff as $worker) {
        $staffStmt->execute($worker);
    }

    // 3. Seed 35 Days of Attendance History
    $pdo->exec("TRUNCATE TABLE `attendance`");
    $attStmt = $pdo->prepare("
        INSERT INTO `attendance` (
            `id`, `staff_id`, `staff_name`, `role`, `site_id`, `site_name`, `site_code`,
            `date`, `check_in_time`, `check_in_timestamp`, `check_in_lat`, `check_in_lng`,
            `check_in_accuracy`, `check_in_distance`, `check_in_geofence_verified`,
            `check_out_time`, `check_out_timestamp`, `check_out_lat`, `check_out_lng`,
            `check_out_accuracy`, `check_out_distance`, `check_out_geofence_verified`,
            `total_duration_seconds`, `total_duration_formatted`, `total_hours_decimal`,
            `status`, `geofence_flag`, `notes`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $countRecords = 0;
    $now = time();

    for ($dayOffset = 35; $dayOffset >= 0; $dayOffset--) {
        $shiftTime = $now - ($dayOffset * 86400);
        $dateStr = date('Y-m-d', $shiftTime);
        $dayOfWeek = (int)date('w', $shiftTime);

        if ($dayOfWeek === 0 && $dayOffset > 2) {
            continue; // Sunday off
        }

        foreach ($defaultStaff as $wIdx => $worker) {
            $rand = mt_rand(1, 100) / 100;
            if ($rand < 0.12 && $dayOffset > 0) {
                continue; // Absent
            }

            $site = $defaultSites[$wIdx % count($defaultSites)];

            // Check-in hour & minute
            $inHour = 7;
            $inMin = mt_rand(0, 25);
            $isLate = $rand > 0.82;
            if ($isLate) {
                $inHour = 8;
                $inMin = mt_rand(15, 50);
            }

            $inSec = mt_rand(0, 59);
            $checkInTs = strtotime("{$dateStr} {$inHour}:{$inMin}:{$inSec}");
            $checkInTimeFormatted = sprintf("%02d:%02d:%02d", $inHour, $inMin, $inSec);

            $isToday = ($dayOffset === 0);
            $isStillPunchedIn = ($isToday && ($wIdx % 2 === 0));

            // GPS coordinates
            $jitterLat = (mt_rand(-200, 200) / 1000000);
            $jitterLng = (mt_rand(-200, 200) / 1000000);
            $punchInLat = round($site[4] + $jitterLat, 6);
            $punchInLng = round($site[5] + $jitterLng, 6);
            $punchInDistance = mt_rand(12, 45);

            $isOffSite = ($rand > 0.94);
            $finalDistance = $isOffSite ? ($site[6] + mt_rand(100, 350)) : $punchInDistance;
            $geofenceVerified = !$isOffSite;

            $checkOutTimeFormatted = null;
            $checkOutTs = null;
            $checkOutLat = null;
            $checkOutLng = null;
            $checkOutAccuracy = null;
            $checkOutDistance = null;
            $checkOutVerified = null;
            $totalDurationSeconds = null;
            $totalDurationFormatted = 'In Progress';
            $totalHoursDecimal = 0.00;
            $status = $isLate ? 'Late' : 'Present';

            if (!$isStillPunchedIn) {
                $shiftSeconds = (int)(8.5 * 3600) + mt_rand(-1800, 3600); // ~8.0h - 9.5h
                $checkOutTs = $checkInTs + $shiftSeconds;
                $checkOutTimeFormatted = date('H:i:s', $checkOutTs);
                $checkOutLat = round($site[4] + (mt_rand(-150, 150) / 1000000), 6);
                $checkOutLng = round($site[5] + (mt_rand(-150, 150) / 1000000), 6);
                $checkOutAccuracy = mt_rand(5, 10);
                $checkOutDistance = mt_rand(10, 40);
                $checkOutVerified = 1;

                $totalDurationSeconds = $shiftSeconds;
                $h = floor($shiftSeconds / 3600);
                $m = floor(($shiftSeconds % 3600) / 60);
                $totalDurationFormatted = "{$h}h {$m}m";
                $totalHoursDecimal = round($shiftSeconds / 3600, 2);

                if ($h >= 9) {
                    $status = $isLate ? 'Late / Overtime' : 'Overtime';
                } elseif ($h < 5) {
                    $status = 'Half-Day';
                }
            }

            $recordId = 'ATT-' . base_convert(time() - ($dayOffset * 86400), 10, 36) . '-' . substr(md5(uniqid()), 0, 4);
            $geofenceFlag = $geofenceVerified ? 'Verified (On-Site)' : 'Flagged (Off-Site Punch)';
            $notes = $isOffSite ? 'Remote punch recorded outside approved geofence perimeter.' : 'Standard field shift logged.';

            $attStmt->execute([
                $recordId,
                $worker[0],
                $worker[1],
                $worker[2],
                $site[0],
                $site[1],
                $site[2],
                $dateStr,
                $checkInTimeFormatted,
                date('Y-m-d H:i:s', $checkInTs),
                $punchInLat,
                $punchInLng,
                mt_rand(4, 9),
                $finalDistance,
                $geofenceVerified ? 1 : 0,
                $checkOutTimeFormatted,
                $checkOutTs ? date('Y-m-d H:i:s', $checkOutTs) : null,
                $checkOutLat,
                $checkOutLng,
                $checkOutAccuracy,
                $checkOutDistance,
                $checkOutVerified,
                $totalDurationSeconds,
                $totalDurationFormatted,
                $totalHoursDecimal,
                $status,
                $geofenceFlag,
                $notes
            ]);

            $countRecords++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Successfully seeded MySQL database 'construction_attendance_db'",
        'sitesCount' => count($defaultSites),
        'staffCount' => count($defaultStaff),
        'attendanceRecordsCount' => $countRecords
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
