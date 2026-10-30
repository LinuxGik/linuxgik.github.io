---
layout: post
title: "Настройка и запуск веб-сервера: AlmaLinux 8 и Debian"
date: 2026-10-30
tags: [server, ssh, firewall, apache, nginx, certbot, almalinux, debian]
description: "Пошаговая настройка нового VPS: DNS, пользователь с sudo, SSH по ключам на нестандартном порту, firewall, Apache или Nginx, сертификат Let's Encrypt. Для AlmaLinux 8 и Debian."
---

Пост описывает полный путь от чистого VPS до сайта по HTTPS. Каждый шаг даётся в двух вариантах: **AlmaLinux 8** (семейство RHEL) и **Debian**.

> **Внимание:** блоки для Debian собраны по документации и на моём сервере не проверялись. Блоки для AlmaLinux 8 основаны на моей рабочей настройке. Для Nginx не проверен шаг получения сертификата (`certbot --nginx`).

## Исходные данные и обозначения

- Чистый сервер с AlmaLinux 8 или Debian 12/13.
- Доступ под `root` через консоль (VNC) на сайте хостера.
- Зарегистрированный домен.
- Локальная машина с клиентом OpenSSH (Linux, macOS или Windows 11).

| Обозначение | Что подставить |
|---|---|
| `your_domain.com` | ваш домен |
| `your_username` | имя нового пользователя |
| `host` | IP-адрес сервера или домен |
| `2222` | новый порт SSH |

### Порядок работ и почему он важен

1. DNS.
2. Пользователь с `sudo`.
3. SSH: ключи → конфигурация → SELinux (только Alma) → firewall → **только потом** применение → проверка → закрытие порта 22.
4. Веб-сервер.
5. Сертификат.

Главная ловушка шага 3: если применить новую конфигурацию SSH раньше, чем порт открыт в firewall (и разрешён в SELinux), вы потеряете доступ к серверу. Поэтому применение настроек стоит **после** firewall.

### Различия между дистрибутивами

| | AlmaLinux 8 | Debian |
|---|---|---|
| Менеджер пакетов | `dnf` | `apt` |
| Группа администраторов | `wheel` | `sudo` |
| Служба SSH | `sshd` | `ssh` |
| Firewall | `firewalld` | `ufw` (ставится отдельно) |
| MAC-система | SELinux | AppArmor, для sshd ничего делать не нужно |
| Пакет и служба Apache | `httpd` | `apache2` |
| Конфиги виртуальных хостов Apache | `/etc/httpd/conf.d/` | `/etc/apache2/sites-available/` |
| Конфиги Nginx | `/etc/nginx/conf.d/` | `/etc/nginx/sites-available/` |
| Корень сайта по умолчанию | `/var/www/html` | `/var/www/html` |

## 1. Настройка записей DNS

В личном кабинете регистратора домена (или у провайдера DNS) добавьте:

| Тип | Имя | Значение |
|---|---|---|
| A | `your_domain.com` | IPv4-адрес сервера |
| A | `www.your_domain.com` | IPv4-адрес сервера |
| AAAA | оба имени | IPv6-адрес сервера, если он есть |

Проверка (команда `dig` из пакета `bind-utils` на Alma или `dnsutils` на Debian):

```bash
dig +short your_domain.com
dig +short www.your_domain.com
```

Обе команды должны вернуть IP вашего сервера. Распространение записей может занять от минут до нескольких часов.

> **Важно:** DNS должен работать **до** получения сертификата. Let's Encrypt проверяет право на домен, обращаясь к нему по HTTP на порт 80.

## 2. Пользователь с правами sudo

Работать под `root` постоянно нельзя. Создаём обычного пользователя. Пока вы в консоли хостера под `root`, `sudo` в командах не нужен.

**AlmaLinux 8**

```bash
useradd your_username
passwd your_username
usermod -aG wheel your_username
```

Группа `wheel` в AlmaLinux уже имеет права `sudo`.

**Debian**

```bash
apt install sudo                      # если sudo ещё не установлен
adduser your_username                 # создаёт домашний каталог и спрашивает пароль
usermod -aG sudo your_username
```

На Debian используйте именно `adduser`. Команда `useradd` без ключа `-m` не создаёт домашний каталог.

**Проверка** (под `root`):

```bash
su - your_username
sudo whoami          # должно вывести: root
exit
```

Затем выйдите из сессии `root` и подключитесь под новым пользователем:

```bash
ssh your_username@host
```

Консоль хостера дальше нужна только как аварийный вход.

## 3. Настройка SSH

> Настройка ключей в Windows 11: [Настройка OpenSSH в Windows 11](/pages/ssh-keys-windows.html)

### 3.1 Ключи

**На локальной машине** создайте пару ключей:

```bash
ssh-keygen -t ed25519
```

Алгоритм `ed25519` короче и современнее RSA. Ключи окажутся в `~/.ssh/id_ed25519` (закрытый) и `~/.ssh/id_ed25519.pub` (открытый).

Отправьте открытый ключ на сервер (пока SSH на порту 22):

```bash
ssh-copy-id your_username@host
```

Если `ssh-copy-id` недоступен, скопируйте содержимое `~/.ssh/id_ed25519.pub` в файл `~/.ssh/authorized_keys` **на сервере**.

**На сервере** должны быть такие права:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Если ключ отправлен через `ssh-copy-id`, права выставляются автоматически.

**Проверьте вход по ключу в новой сессии**, пока пароль ещё включён:

```bash
ssh your_username@host
```

Пароль спрашивать не должно.

### 3.2 Конфигурация sshd

Сделайте резервную копию и откройте файл:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo nano /etc/ssh/sshd_config
```

Задайте параметры:

```text
PasswordAuthentication no
PermitRootLogin no
Port 2222
```

| Параметр | Зачем |
|---|---|
| `PasswordAuthentication no` | вход только по ключу, перебор паролей бесполезен |
| `PermitRootLogin no` | прямой вход под `root` запрещён |
| `Port 2222` | убирает основную массу автоматических попыток входа из логов. Это не защита, а уменьшение шума |

Перед отключением `root` убедитесь, что `sudo` у нового пользователя работает (шаг 2).

**Проверка синтаксиса** и итоговой конфигурации:

```bash
sudo sshd -t
sudo sshd -T | grep -Ei '^(port|passwordauthentication|permitrootlogin) '
```

`sshd -t` ничего не выводит, если ошибок нет. `sshd -T` показывает значения, которые sshd реально применит.

> **Debian:** в начале `sshd_config` есть строка `Include /etc/ssh/sshd_config.d/*.conf`. Для каждой директивы действует **первое** найденное значение, поэтому файл из `sshd_config.d/` может перебить вашу настройку. Если `sshd -T` показывает не то, что вы задали, ищите причину там: `grep -ri passwordauthentication /etc/ssh/`.

> **Не применяйте** конфигурацию сейчас. Сначала шаги 3.3 и 3.4.

### 3.3 SELinux: разрешить новый порт (только AlmaLinux)

SELinux по умолчанию разрешает sshd только порт 22. Проверьте режим:

```bash
sestatus
```

Если `Current mode: disabled`, пропустите шаг. Иначе:

```bash
sudo dnf install -y policycoreutils-python-utils
sudo semanage port -a -t ssh_port_t -p tcp 2222
semanage port -l | grep ssh
```

В выводе последней команды должно быть `ssh_port_t   tcp   2222, 22`.

**Debian:** AppArmor не ограничивает sshd на нестандартных портах. Шаг не нужен.

### 3.4 Firewall: открыть новый порт

**AlmaLinux 8 (firewalld)**

```bash
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

**Debian (ufw)**

```bash
sudo apt install ufw
sudo ufw allow 22/tcp        # пока SSH на 22, иначе включение ufw оборвёт сессию
sudo ufw allow 2222/tcp
sudo ufw enable
sudo ufw status
```

Если сервер в облаке, откройте порт 2222 ещё и в **security group / сетевом экране на стороне провайдера**.

### 3.5 Применение конфигурации и проверка

**AlmaLinux 8**

```bash
sudo systemctl reload sshd
```

**Debian**

```bash
sudo systemctl reload ssh
```

> **Debian и Ubuntu: socket activation.** В некоторых системах (Ubuntu 22.10+, возможны отдельные образы Debian) порт слушает не sshd, а systemd через `ssh.socket`, и параметр `Port` из `sshd_config` игнорируется. Проверьте:
>
> ```bash
> systemctl is-active ssh.socket
> ```
>
> Если вывод `active`, примените так:
>
> ```bash
> sudo systemctl daemon-reload
> sudo systemctl restart ssh.socket
> ```
>
> Описание изменения для Ubuntu: [sshd now uses socket-based activation](https://discourse.ubuntu.com/t/sshd-now-uses-socket-based-activation-ubuntu-22-10-and-later/30189).

Убедитесь, что sshd слушает новый порт:

```bash
sudo ss -tlnp | grep 2222
```

**Не закрывая текущую сессию**, откройте **новое окно терминала** и проверьте:

```bash
ssh -p 2222 your_username@host            # должен пустить без пароля
sudo whoami                               # root
ssh -p 2222 root@host                     # должен получить отказ
ssh -o PubkeyAuthentication=no -p 2222 your_username@host   # Permission denied (publickey)
```

Если что-то не работает, исправляйте в старой сессии: она осталась открытой.

### 3.6 Закрыть порт 22

Только когда вход по порту 2222 проверен.

**AlmaLinux 8** (в firewalld порт 22 открыт как сервис `ssh`):

```bash
sudo firewall-cmd --permanent --remove-service=ssh
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

**Debian**

```bash
sudo ufw delete allow 22/tcp
sudo ufw status
```

Чтобы не вводить порт каждый раз, добавьте на **локальной машине** в `~/.ssh/config`:

```text
Host myserver
    HostName host
    User your_username
    Port 2222
```

После этого достаточно `ssh myserver`.

## 4. Установка и запуск веб-сервера

Выберите один: Apache или Nginx. Для запуска нужно: установить, открыть порты, включить автозапуск.

- [apache.org](https://httpd.apache.org/)
- [nginx.org](https://nginx.org/ru/)

### 4.1 Установка

**Apache**

AlmaLinux 8:

```bash
sudo dnf install -y httpd
sudo systemctl enable --now httpd
```

Debian (служба запускается и включается автоматически при установке):

```bash
sudo apt install -y apache2
systemctl status apache2
```

**Nginx**

AlmaLinux 8:

```bash
sudo dnf module list nginx          # потоки модуля, поток по умолчанию помечен [d]
sudo dnf install -y nginx
sudo systemctl enable --now nginx
systemctl status nginx
```

Debian:

```bash
sudo apt install -y nginx
systemctl status nginx
```

### 4.2 Открыть порты 80 и 443

**AlmaLinux 8**

```bash
sudo firewall-cmd --list-all                                  # проверяем исходное состояние
sudo firewall-cmd --zone=public --permanent --add-service=http
sudo firewall-cmd --zone=public --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --zone=public --list-all
```

Порты 80 и 443 в firewalld называются сервисами `http` и `https`. Подробнее: [Open a Port or Service](https://firewalld.org/documentation/howto/open-a-port-or-service.html).

> **Примечание:** на моём сервере AlmaLinux 8 порты были открыты ещё до моих команд. Насколько мне известно, пакет `httpd` firewalld сам не меняет, скорее всего их открыл образ системы у хостера. Не полагайтесь на это и проверяйте `--list-all`.

**Debian**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

**Проверка доступности. Запускайте с локальной машины, а не с сервера**, иначе firewall вы не проверите:

```bash
curl -I http://your_domain.com
```

Ответ `HTTP/1.1 200 OK` (или страница-заглушка веб-сервера) значит, что порт открыт. Если домен ещё не работает, используйте `http://IP_сервера`.

### 4.3 Виртуальный хост

Виртуальный хост привязывает домен к каталогу сайта. Он нужен и для работы, и для того, чтобы certbot нашёл, какой конфигурации выдавать сертификат.

#### Apache, AlmaLinux 8

Файл `/etc/httpd/conf.d/your_domain.com.conf`:

```bash
sudo nano /etc/httpd/conf.d/your_domain.com.conf
```

```apache
<VirtualHost *:80>
    ServerName your_domain.com
    ServerAlias www.your_domain.com
    DocumentRoot /var/www/html

    ErrorLog /var/log/httpd/your_domain.com-error.log
    CustomLog /var/log/httpd/your_domain.com-access.log combined

    <Directory "/var/www/html">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

Про параметры:

- `-Indexes` запрещает показывать список файлов каталога, если в нём нет `../../../Users/lynxc/Downloads/index.html`;
- `AllowOverride None` отключает `.htaccess`. Если он вам нужен, поставьте `All`.

```bash
sudo apachectl configtest
sudo systemctl reload httpd
```

#### Apache, Debian

Файл `/etc/apache2/sites-available/your_domain.com.conf`:

```bash
sudo nano /etc/apache2/sites-available/your_domain.com.conf
```

```apache
<VirtualHost *:80>
    ServerName your_domain.com
    ServerAlias www.your_domain.com
    DocumentRoot /var/www/html

    ErrorLog ${APACHE_LOG_DIR}/your_domain.com-error.log
    CustomLog ${APACHE_LOG_DIR}/your_domain.com-access.log combined

    <Directory "/var/www/html">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

На Debian конфигурацию нужно включить, а стандартную отключить:

```bash
sudo a2ensite your_domain.com.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

#### Nginx

Содержимое одинаковое, различается место файла.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your_domain.com www.your_domain.com;

    root /var/www/html;
    index index.html;

    access_log /var/log/nginx/your_domain.com.access.log;
    error_log  /var/log/nginx/your_domain.com.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

AlmaLinux 8: сохраните в `/etc/nginx/conf.d/your_domain.com.conf`.

Debian: сохраните в `/etc/nginx/sites-available/your_domain.com.conf`, затем:

```bash
sudo ln -s /etc/nginx/sites-available/your_domain.com.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

Дальше для обоих:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Проверка

Положите в корень сайта тестовую страницу и откройте домен:

```bash
echo '<h1>It works</h1>' | sudo tee /var/www/html/index.html
curl -I http://your_domain.com
```

Как доставлять настоящий сайт на сервер через `rsync`: [Основы rsync]({% post_url 2026-10-30-rsync %}).

> **AlmaLinux с SELinux:** если файлы в `/var/www/html` получены командой `mv` (она переносит старый контекст безопасности), веб-сервер может отвечать `403 Forbidden`. Исправляется командой `sudo restorecon -Rv /var/www/html`.

## 5. Сертификат Let's Encrypt

- [Документация Let's Encrypt](https://letsencrypt.org/ru/docs/)
- [Документация certbot](https://certbot.eff.org/)

Перед началом должны выполняться три условия: DNS указывает на сервер (шаг 1), порт 80 открыт (шаг 4.2), виртуальный хост с вашим `ServerName` / `server_name` работает (шаг 4.3).

Certbot — официальный клиент Let's Encrypt. Он умеет не только получать сертификат, но и сам править конфигурацию веб-сервера, а также продлевать сертификат.

> Разработчики certbot на своём сайте рекомендуют устанавливать его через snap. Пакеты дистрибутива работают, но версия в них может быть старее. Ниже используются пакеты дистрибутива.

### 5.1 Установка certbot

**AlmaLinux 8** (certbot находится в репозитории EPEL):

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-apache mod_ssl    # для Apache
# или
sudo dnf install -y certbot python3-certbot-nginx             # для Nginx
```

**Debian:**

```bash
sudo apt install -y certbot python3-certbot-apache    # для Apache
# или
sudo apt install -y certbot python3-certbot-nginx     # для Nginx
```

### 5.2 Файл ssl.conf на AlmaLinux (только Apache)

Пакет `mod_ssl` создаёт `/etc/httpd/conf.d/ssl.conf`. В нём стандартный виртуальный хост на порту 443 с самоподписанным сертификатом `/etc/pki/tls/certs/localhost.crt`, предназначенным для локальной разработки. Такой хост может мешать certbot выбрать нужную конфигурацию. Уберите его с сохранением копии:

```bash
sudo mv /etc/httpd/conf.d/ssl.conf /etc/httpd/conf.d/ssl.conf.bak
sudo systemctl reload httpd
```

### 5.3 Получение сертификата

```bash
sudo certbot --apache -d your_domain.com -d www.your_domain.com    # Apache
sudo certbot --nginx  -d your_domain.com -d www.your_domain.com    # Nginx
```

Certbot спросит e-mail для уведомлений, согласие с условиями и предложит настроить перенаправление HTTP → HTTPS. Это перенаправление обычно нужно.

> Вариант `--nginx` у меня не проверялся.

Если команда завершилась ошибкой, чаще всего причина в DNS, закрытом порте 80 или в неверном `ServerName`. См. раздел «Типичные проблемы».

Проверка:

```bash
curl -I https://your_domain.com
sudo certbot certificates          # покажет срок действия
```

### 5.4 Автоматическое продление

Сертификаты Let's Encrypt действуют ограниченное время, поэтому продление должно идти автоматически. Проверка самого процесса продления:

```bash
sudo certbot renew --dry-run
```

Эта команда **ничего не включает**. Она лишь имитирует продление. За автоматический запуск отвечает таймер systemd. Проверьте, что он есть:

```bash
systemctl list-timers | grep certbot
```

**Debian:** пакет `certbot` включает таймер сам, он должен быть в списке.

**AlmaLinux 8:** таймер из пакета EPEL называется `certbot-renew.timer`. Он может быть выключен. Если в списке пусто, включите:

```bash
sudo systemctl enable --now certbot-renew.timer
```

## 6. Рекомендации по безопасности и эксплуатации

- **Тестируйте SSH-изменения с одной сессией, которую держите открытой.** Аварийный вход через консоль хостера остаётся запасным вариантом.
- **Проверяйте сетевой экран провайдера.** В облаке порты нужно открывать ещё и в его панели.
- **Резервные копии конфигураций** перед любой правкой:

  ```bash
  sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
  ```

- **Fail2ban** блокирует адреса после серии неудачных входов. Пакет есть в EPEL (Alma) и в основном репозитории Debian. На нестандартном порту его нужно настроить явно, в `/etc/fail2ban/jail.local`:

  ```ini
  [sshd]
  enabled = true
  port = 2222
  ```

  Остальные настройки (способ блокировки, источник логов) зависят от дистрибутива, смотрите документацию fail2ban.
- **Срок сертификата.** Периодически проверяйте `sudo certbot certificates`, и настройте внешний мониторинг, если сайт важен.
- **Обновления:**

  ```bash
  sudo dnf update                           # AlmaLinux 8
  sudo apt update && sudo apt upgrade       # Debian
  ```

  Автоматическую установку обновлений безопасности обеспечивают `dnf-automatic` (Alma) и `unattended-upgrades` (Debian).

## Типичные проблемы

| Симптом | Причина и решение |
|---|---|
| Сессия оборвалась после `reload` | порт не открыт в firewall или не разрешён в SELinux. Зайдите через консоль хостера и исправьте |
| SSH всё ещё на порту 22 после смены `Port` | sshd запускается через `ssh.socket` (см. 3.5) либо значение перебито файлом из `sshd_config.d/` (`sudo sshd -T`) |
| `Permission denied (publickey)` | ключ не добавлен в `authorized_keys`, неверные права на `~/.ssh` и `authorized_keys`, либо вы подключаетесь не тем пользователем |
| `Connection refused` | порт не слушается или закрыт firewall; проверьте `ss -tlnp` и `firewall-cmd --list-all` / `ufw status` |
| `403 Forbidden` на AlmaLinux | неверный контекст SELinux (`restorecon`) или права на файлы сайта |
| Certbot: `Timeout during connect` / `unauthorized` | DNS не указывает на сервер или закрыт порт 80 (в том числе у провайдера) |
| Certbot: `Could not find a matching virtual host` | не совпадает `ServerName` или конфигурация не включена (`a2ensite` на Debian) |

## Справка

```bash
man sshd_config
man firewall-cmd
man ufw
```

- Параметры sshd: [sshd_config(5)](https://man.openbsd.org/sshd_config)
- [Документация Let's Encrypt](https://letsencrypt.org/ru/docs/)
- [Документация certbot](https://certbot.eff.org/)
