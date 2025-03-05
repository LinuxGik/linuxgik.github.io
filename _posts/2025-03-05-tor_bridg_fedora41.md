---
layout: post
author: linuxgik
title: Tor.Bridge.Fedora41
---

# Настройка Tor через мосты на Fedora Linux

В этом руководстве мы настроим Tor для использования мостов, полученных через Telegram-бота [GetBridgesBot](https://t.me/GetBridgesBot). Мы также создадим отдельный конфигурационный файл для мостов, чтобы упростить управление настройками.

---

### 1. Установите Tor и obfs4
Для начала установите Tor и плагин `obfs4`, который необходим для работы с мостами:

```bash
sudo dnf install tor obfs4
```

---

### 2. Получите мосты через Telegram-бота
1. Перейдите в Telegram-бота [GetBridgesBot](https://t.me/GetBridgesBot).
2. Следуйте инструкциям бота, чтобы получить мосты. Обычно бот предоставляет мосты в формате `obfs4`.
3. Сохраните полученные мосты, они понадобятся для настройки.

---

### 3. Настройка Tor
1. Откройте файл конфигурации Tor:

   ```bash
   sudo nano /etc/tor/torrc
   ```

2. Найдите строку `%include /etc/torrc.d/*.conf` и **раскомментируйте** ее (уберите символ `#` в начале строки). Это позволит включать дополнительные конфигурационные файлы из папки `/etc/torrc.d/`.

3. Сохраните изменения и закройте файл.

---

### 4. Создайте файл для мостов
1. Создайте папку `/etc/torrc.d/`, если она еще не существует:

   ```bash
   sudo mkdir -p /etc/torrc.d/
   ```

2. Создайте файл `bridge.conf` в этой папке:

   ```bash
   sudo nano /etc/torrc.d/bridge.conf
   ```

3. Вставьте в файл следующие строки, заменив `<ваши_мосты>` на данные, полученные от бота:

   ```bash
   UseBridges 1
   ClientTransportPlugin obfs4 exec /usr/bin/obfs4proxy

   Bridge <ваши_мосты>
   ```

   Пример (не используйте этот мост, вставьте свои данные):

   ```bash
   UseBridges 1
   ClientTransportPlugin obfs4 exec /usr/bin/obfs4proxy

   Bridge obfs4 141.94.213.29:34975 3CCF6211A6115BA32224E939C179AC2F8269E186 cert=xFW3DRM458PUIuWgi74qRg8IG7JElyFJIYgy9+V+flBQuvfKKonuPJb373QooLLR+eIqMg iat-mode=0
   Bridge obfs4 57.128.35.251:17275 3411026D454DF9F94BB263BCED2CFBECEBBAAF4C cert=nDA6sKSsjz28b1XZVZwZcx2dBbRSdYFZR5yvenhtFKQA7zYY6N2otTaa562gZViSNSW9Kg iat-mode=0
   ```

4. Сохраните файл и закройте редактор.

---

### 5. Запустите Tor
1. Перезапустите Tor, чтобы применить новые настройки:

   ```bash
   sudo systemctl restart tor
   ```

2. Если вы хотите, чтобы Tor запускался автоматически при загрузке системы, выполните:

   ```bash
   sudo systemctl enable tor
   ```

---

### 6. Проверка работы Tor
Убедитесь, что Tor работает корректно и использует мосты. Вы можете проверить свой IP-адрес через Tor с помощью команды:

```bash
torsocks curl https://check.torproject.org
```

Если все настроено правильно, вы увидите сообщение о том, что вы используете Tor.

---

### 7. (Опционально) Настройка браузера
Если вы хотите использовать Tor через браузер, настройте его на использование локального прокси-сервера Tor (`localhost:9050` как SOCKS5-прокси). Tor Browser уже настроен для этого, но если вы используете другой браузер, вам нужно будет настроить его вручную.

---

### 8. Обновление мостов (опционально)
Если мосты перестанут работать, вы всегда можете получить новые через [GetBridgesBot](https://t.me/GetBridgesBot) и обновить файл `/etc/torrc.d/bridge.conf`.

---

Теперь у вас настроен Tor с использованием мостов `obfs4` на Fedora Linux. Вы можете легко обновлять мосты, редактируя файл `bridge.conf`, не затрагивая основной конфигурационный файл.