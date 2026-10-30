---
layout: post
title: "О сертификатах Let's Encrypt: получение через certbot на AlmaLinux 8"
date: 2026-10-30
tags: [letsencrypt, certbot, apache, ssl, almalinux]
description: "Что такое Let's Encrypt, как работает проверка домена, как получить сертификат через certbot с плагином Apache на AlmaLinux 8, какие ошибки встретились и как настроить автопродление."
---

Пост описывает, что такое сертификаты Let's Encrypt, и мой путь получения сертификата на AlmaLinux 8 с Apache, включая две ошибки, которые я получил по дороге. Общую настройку сервера см. в посте [Настройка и запуск веб-сервера]({% post_url 2026-10-30-server-setup %}).

## Что такое Let's Encrypt

Let's Encrypt — некоммерческий центр сертификации, который выдаёт **бесплатные TLS-сертификаты** (их по традиции называют SSL). Основные факты:

- Сертификаты признаются всеми основными браузерами и обеспечивают то же шифрование, что и платные.
- Это сертификаты **с подтверждением домена** (DV). Они доказывают, что вы управляете доменом, но ничего не говорят об организации.
- Выдача автоматизирована по протоколу ACME. Для этого нужен клиент, в моём случае это **certbot**.
- Срок действия короткий, поэтому продление должно быть автоматическим.

### Срок действия сертификатов меняется

На момент написания (октябрь 2026) сертификат действует **90 дней**. Let's Encrypt объявил переход на более короткие сроки:

| Когда | Срок по умолчанию |
|---|---|
| сейчас | 90 дней |
| с 10 февраля 2027 | 64 дня |
| в 2028 году | 45 дней |

Источники: [64-Day Certificate Lifetimes Coming Feb 2027](https://letsencrypt.org/2026/10/07/64-day-certs.html) и [Decreasing Certificate Lifetimes to 45 Days](https://letsencrypt.org/2025/12/02/from-90-to-45). Даты могли обновиться, сверяйтесь с блогом Let's Encrypt.

Практический вывод: **без настроенного автоматического продления не обойтись**, и со временем проверять его придётся всё чаще.

## Как проходит проверка домена

Let's Encrypt должен убедиться, что вы управляете доменом. Для этого certbot запрашивает проверку по HTTP (способ HTTP-01):

1. certbot делает так, чтобы по адресу `http://your_domain.com/.well-known/acme-challenge/...` отдавался специальный файл. С плагином Apache он временно настраивает Apache сам.
2. Let's Encrypt обращается к этому адресу **из интернета, по порту 80**.
3. Если файл получен, сертификат выдаётся.

Отсюда три обязательных условия:

- **DNS**: домен указывает на ваш сервер;
- **порт 80** открыт на сервере и у провайдера;
- **виртуальный хост** Apache на порту 80 с этим доменом в `ServerName` или `ServerAlias`.

## Мои шаги

### Первая попытка: `sudo certbot --apache`

Сначала я просто ввёл команду:

```bash
sudo certbot --apache
```

> Я надеялся, что certbot настроит всё автоматически и сам создаст виртуальный хост для Apache. Я ошибся: certbot **не создаёт** виртуальный хост для порта 80. Он ищет уже существующий хост с подходящим доменом. Хост пришлось создавать вручную, но это несложно.

### Ошибка 1: `Error while running apachectl configtest`

```text
[user@host ~]$ sudo certbot --apache
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Error while running apachectl configtest.

AH00526: Syntax error on line 85 of /etc/httpd/conf.d/ssl.conf:
SSLCertificateFile: file '/etc/pki/tls/certs/localhost.crt' does not exist or is empty

Enter email address (used for urgent renewal and security notices)
 (Enter 'c' to cancel):
```

**Разбор:**

- перед работой certbot запускает `apachectl configtest`, чтобы проверить конфигурацию Apache;
- Apache нашёл ошибку в `/etc/httpd/conf.d/ssl.conf`;
- на строке 85 указан сертификат `localhost.crt`, которого нет или он пустой.

**Откуда взялся `ssl.conf`.** Его создаёт пакет `mod_ssl`, который подтянулся как зависимость certbot. В файле прописан самоподписанный сертификат `localhost.crt` для тестов. Этот сертификат генерирует не сам пакет при установке, а служба `httpd-init.service` в момент **запуска** `httpd`. Скорее всего, у меня Apache был запущен ещё до установки `mod_ssl`, и служба не успела отработать. Подробнее: `man httpd.service`, раздел «SSL/TLS certificate generation».

**Два способа исправить:**

```bash
# Способ 1: перезапустить httpd, тестовый сертификат будет создан
sudo systemctl restart httpd

# Способ 2: убрать ssl.conf, если свой хост на 443 настроит certbot
sudo mv /etc/httpd/conf.d/ssl.conf /etc/httpd/conf.d/ssl.conf.bak
```

Я выбрал второй способ: в `ssl.conf` описан стандартный хост на порту 443 с тестовым сертификатом, и для моего сайта он не нужен.

После правки проверьте, что конфигурация исправна:

```bash
sudo apachectl configtest
```

Нужен ответ `Syntax OK`.

> В тот раз certbot, несмотря на ошибку, продолжил работу и предложил ввести e-mail. Я двигался дальше, считая, что для получения сертификата ошибка не важна. Так делать не стоит: после получения сертификата certbot должен прописать его в конфигурацию и перезагрузить Apache, и неисправный конфиг может это сорвать. Исправляйте `configtest` до запуска certbot.

### Ошибка 2: нет виртуального хоста на порту 80

Дальше certbot спрашивает e-mail, согласие с условиями, домены. Я ввёл их и получил:

```text
space separated) (Enter 'c' to cancel): your_domain.com www.your_domain.com
Requesting a certificate for your_domain.com and www.your_domain.com
Unable to find a virtual host listening on port 80 which is currently needed for Certbot to prove to the CA that you control your domain. Please add a virtual host for port 80.
Ask for help or search for solutions at https://community.letsencrypt.org. See the logfile /var/log/letsencrypt/letsencrypt.log or re-run Certbot with -v for more details.
```

**Разбор:** certbot не нашёл виртуальный хост на порту 80, через который он мог бы отдать проверочный файл. Хост создаётся вручную.

#### Создание виртуального хоста

```bash
sudo vim /etc/httpd/conf.d/your_domain.com.conf
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

`-Indexes` не даёт показывать список файлов каталога. `AllowOverride None` отключает `.htaccess`; если он нужен, поставьте `All`.

Проверьте синтаксис, примените и убедитесь, что хост отвечает:

```bash
sudo apachectl configtest
sudo systemctl reload httpd
curl -I http://your_domain.com
```

### Получение сертификата

Теперь, когда `configtest` проходит и хост на порту 80 существует:

```bash
sudo certbot --apache -d your_domain.com -d www.your_domain.com
```

Certbot задаёт вопросы: e-mail для уведомлений, согласие с условиями, согласие на рассылку EFF (необязательно) и **нужно ли перенаправлять HTTP на HTTPS**. Перенаправление обычно стоит включить.

**Что certbot делает с системой:**

- кладёт сертификаты в `/etc/letsencrypt/live/your_domain.com/`: `fullchain.pem` (сертификат с цепочкой) и `privkey.pem` (закрытый ключ) используются веб-сервером, `cert.pem` и `chain.pem` лежат отдельно. Это ссылки на файлы в `/etc/letsencrypt/archive/`;
- создаёт новый файл виртуального хоста на 443, обычно `/etc/httpd/conf.d/your_domain.com-le-ssl.conf`;
- при согласии на перенаправление добавляет в хост на порту 80 примерно такой блок:

```apache
RewriteEngine on
RewriteCond %{SERVER_NAME} =www.your_domain.com [OR]
RewriteCond %{SERVER_NAME} =your_domain.com
RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
```

Порт 443 должен быть открыт в firewall (см. [пост про сервер]({% post_url 2026-10-30-server-setup %})).

### Проверка результата

```bash
# HTTPS работает
curl -I https://your_domain.com

# HTTP перенаправляется на HTTPS
curl -I http://your_domain.com

# срок действия и пути к файлам
sudo certbot certificates
```

Ожидаемый результат: на HTTPS ответ `HTTP/1.1 200 OK`, на HTTP ответ `301 Moved Permanently` с заголовком `Location: https://your_domain.com/`.

## Автоматическое продление

Команда `sudo certbot renew --dry-run` только имитирует продление, ничего не включая. За автоматический запуск отвечает таймер systemd:

```bash
systemctl list-timers | grep certbot
```

На AlmaLinux 8 таймер из пакета EPEL называется `certbot-renew.timer` и может быть выключен. Если список пуст:

```bash
sudo systemctl enable --now certbot-renew.timer
```

Let's Encrypt советует продлевать сертификат примерно через две трети срока его действия. Следите за результатом командой `sudo certbot certificates` и настройте внешний мониторинг срока, если сайт важен.

## Правильный порядок

Что нужно сделать, чтобы с первого раза получить сертификат:

1. Настроить DNS и дождаться его распространения.
2. Открыть порты 80 и 443.
3. Установить certbot и `python3-certbot-apache`.
4. Устранить ошибку с `ssl.conf` и убедиться, что `apachectl configtest` выдаёт `Syntax OK`.
5. Создать виртуальный хост на порту 80 с вашим доменом.
6. Запустить `certbot --apache -d ...`.
7. Проверить HTTPS, редирект и автопродление.

Для Debian порядок такой же, только пакеты и пути другие (см. пост про сервер). Проблема с `ssl.conf` на Debian не возникает.

## Типичные ошибки

| Симптом | Причина и решение |
|---|---|
| `Error while running apachectl configtest` | в конфигурации Apache ошибка, у меня это отсутствующий `localhost.crt` в `ssl.conf` |
| `Unable to find a virtual host listening on port 80` | нет виртуального хоста на порту 80 с вашим доменом в `ServerName` или `ServerAlias` |
| `Timeout during connect` | порт 80 закрыт в firewall или у провайдера |
| `Domain ... unauthorized` / `NXDOMAIN` | DNS не указывает на ваш сервер или ещё не обновился |
| сертификат есть, а сайт открывается без HTTPS | порт 443 закрыт или не выбрано перенаправление |

## Справка

```bash
sudo certbot --help
sudo certbot certificates
```

- [Документация Let's Encrypt](https://letsencrypt.org/ru/docs/)
- [Документация certbot](https://certbot.eff.org/)
- [Блог Let's Encrypt: 64-Day Certificate Lifetimes Coming Feb 2027](https://letsencrypt.org/2026/10/07/64-day-certs.html)
