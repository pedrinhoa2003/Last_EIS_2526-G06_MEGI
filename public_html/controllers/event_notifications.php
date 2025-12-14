<?php
require_once __DIR__ . "/../partials/bootstrap.php";
header("Content-Type: application/json; charset=utf-8");

// precisa de login
if (!isset($_SESSION["id_user"])) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "not_logged"]);
  exit;
}

$id_user = (int)$_SESSION["id_user"];

// days opcional (default 365)
$days = isset($_GET["days"]) ? (int)$_GET["days"] : 365;
if ($days <= 0) $days = 365;

$db = DB::conn();
$db->set_charset("utf8mb4");

$sql = "
  SELECT DISTINCT
    e.id_event,
    e.name,
    e.event_date,
    e.location,
    DATEDIFF(DATE(e.event_date), CURDATE()) AS days_left
  FROM user_event_participation uep
  INNER JOIN events e ON e.id_event = uep.id_event
  WHERE uep.id_user = ?
    AND DATE(e.event_date) >= CURDATE()
    AND DATE(e.event_date) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
  ORDER BY e.event_date ASC
";

$stmt = $db->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok"=>false,"error"=>"prepare_failed","detail"=>$db->error]);
  exit;
}

$stmt->bind_param("ii", $id_user, $days);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok"=>false,"error"=>"execute_failed","detail"=>$stmt->error]);
  exit;
}

$res  = $stmt->get_result();
$rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

echo json_encode($rows);
