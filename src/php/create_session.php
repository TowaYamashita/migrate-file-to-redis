<?php
// 生成するダミーセッションファイルの総サイズ[MB]
$totalSessionSize = (int) $argv[1];

try {
  $directory = session_save_path();
  if (!file_exists($directory) || !is_dir($directory)) {
    throw new Exception("ディレクトリが存在しないか、読み込めません。\n");
  }

  function getSessionDirectorySize() {
    $path = session_save_path();
    if (!is_dir($path)) {
      throw new Exception("指定されたパスがディレクトリではありません。\n");
    }
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path));
    $size = 0;
    foreach ($files as $file) {
      if ($file->isFile()) {
        $size += $file->getSize();
      }
    }
    return $size;
  }

  function addSessionData() {
    // a-z の中から適当な1文字を選びそれを1KB分セッション情報として記録する
    $_SESSION['data'] = str_repeat(chr(rand(97, 122)), 1024);
  }

  if (!session_start()) {
    throw new Exception("セッションを開始できませんでした。\n");
  }

  while (true) {
    addSessionData();
    $currentSize = getSessionDirectorySize();
    if ($currentSize >= $totalSessionSize * 1024 * 1024) {
      break;
    }
    session_write_close();
    session_id(uniqid());
    if (!session_start()) {
      throw new Exception("新しいセッションを開始できませんでした。\n");
    }
  }
} catch (Exception $e) {
  echo "エラーが発生しました: " . $e->getMessage();
}
