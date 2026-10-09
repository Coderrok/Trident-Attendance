<?php
/**
 * Staff Roster API Endpoint
 */
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `staff` ORDER BY `id` ASC");
        $staff = $stmt->fetchAll();

        foreach ($staff as &$worker) {
            $worker['primarySiteId'] = $worker['primary_site_id'];
        }

        echo json_encode(['success' => true, 'data' => $staff]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing staff name']);
        exit();
    }

    try {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `staff`");
        $count = (int)$countStmt->fetchColumn() + 101;
        $id = 'EMP-' . $count;

        $stmt = $pdo->prepare("
            INSERT INTO `staff` (`id`, `name`, `role`, `phone`, `primary_site_id`, `avatar`)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $input['name'],
            $input['role'] ?? 'General Operative',
            $input['phone'] ?? '',
            $input['primarySiteId'] ?? ($input['primary_site_id'] ?? 'SITE-01'),
            $input['avatar'] ?? strtoupper(substr($input['name'], 0, 2))
        ]);

        $input['id'] = $id;
        echo json_encode(['success' => true, 'data' => $input]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $staffId = $_GET['id'] ?? null;
    if (!$staffId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Staff ID required']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM `staff` WHERE `id` = ?");
        $stmt->execute([$staffId]);
        echo json_encode(['success' => true, 'message' => 'Staff member removed']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
