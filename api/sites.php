<?php
/**
 * Construction Sites API Endpoint
 */
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `sites` ORDER BY `id` ASC");
        $sites = $stmt->fetchAll();

        // Format numeric coordinates
        foreach ($sites as &$site) {
            $site['latitude'] = (float)$site['latitude'];
            $site['longitude'] = (float)$site['longitude'];
            $site['radius'] = (int)$site['radius'];
            $site['activeWorkers'] = (int)$site['active_workers'];
            $site['supervisorPhone'] = $site['supervisor_phone'];
        }

        echo json_encode(['success' => true, 'data' => $sites]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['name']) || empty($input['code'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required site fields']);
        exit();
    }

    try {
        // Generate Site ID
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `sites`");
        $count = (int)$countStmt->fetchColumn() + 1;
        $id = 'SITE-' . str_pad($count, 2, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("
            INSERT INTO `sites` (`id`, `name`, `code`, `address`, `latitude`, `longitude`, `radius`, `supervisor`, `supervisor_phone`, `active_workers`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $input['name'],
            strtoupper($input['code']),
            $input['address'] ?? '',
            (float)$input['latitude'],
            (float)$input['longitude'],
            (int)($input['radius'] ?? 150),
            $input['supervisor'] ?? 'Supervisor',
            $input['supervisorPhone'] ?? ($input['supervisor_phone'] ?? ''),
            (int)($input['activeWorkers'] ?? 0),
            $input['status'] ?? 'Active'
        ]);

        $input['id'] = $id;
        echo json_encode(['success' => true, 'data' => $input]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $siteId = $_GET['id'] ?? null;
    if (!$siteId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Site ID required']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM `sites` WHERE `id` = ?");
        $stmt->execute([$siteId]);
        echo json_encode(['success' => true, 'message' => 'Site deleted']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
