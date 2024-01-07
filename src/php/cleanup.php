<?php
try {
  $redis = new Redis();
	$endpoint = $_ENV['REDIS_ENDPOINT'];
  $port = $_ENV['REDIS_PORT'];
	$username = $_ENV['REDIS_USER'];
	$password = $_ENV['REDIS_PASSWORD'];
	$connected = $redis->connect('tls://' . $endpoint, $port);
	if (!$connected) {
    throw new Exception("Redisサーバーへの接続に失敗しました。\n");
  }
	$authenticated = $redis->auth(['user'=>$username,'pass'=>$password]);
	if(!$authenticated) {
    throw new Exception("Redisサーバーへの認証に失敗しました。\n");
  }

  $directory = session_save_path();
  if (!file_exists($directory) || !is_dir($directory)) {
    throw new Exception("ディレクトリが存在しないか、読み込めません。\n");
  }

  foreach (new DirectoryIterator($directory) as $fileInfo) {
    if ($fileInfo->isDot() || $fileInfo->isDir()) {
      continue;
    }

    $filename = $fileInfo->getFilename();
		if(!str_contains($filename, 'sess_')){
			continue;
		}

    $key = str_replace('sess_', '', $filename);
    if (!$redis->del($key)) {
      throw new Exception("キー {$key} を削除に失敗しました。\n");
    }

    if(!unlink($filename)){
      throw new Exception("ファイル {$filename} の削除に失敗しました。\n");
    }
  }
} catch (Exception $e) {
  echo "エラー: " . $e->getMessage();
}
