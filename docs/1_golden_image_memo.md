# ゴールデンイメージ作成にあたって実行したコマンド一覧

```shell
sudo dnf -y update
sudo dnf -y install php-fpm php-mysqli php-json php php-devel php-pear git
sudo pecl install redis
echo 'extension=redis.so' | sudo tee -a /etc/php.ini
```
