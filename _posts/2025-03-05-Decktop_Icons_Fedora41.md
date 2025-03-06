---
layout: post
author: linuxgik
title: Gnome. Добавление значка приложения.
viewBlog: Создание иконки запуска на примере RubyMine в Fedora 41
---

# Создание иконки запуска на примере RubyMine в Fedora 41

## sudo dnf install menuliber

Можно воспользоваться графическим приложением для добавления значка приложения. Оно само создаст файл.desktop 
в нужном месте.

## Создать файл .local/share/applications/menulibre-rubymine.desktop

```.local/share/applications/menulibre-rubymine.desktop
[Desktop Entry]
Version=1.1
Type=Application
Name=RubyMine
Icon=/home/user/.bin/RubyMine-2024.3.4/bin/rubymine.png
Exec=/home/user/.bin/RubyMine-2024.3.4/bin/rubymine.sh
Path=/home/user/.users_dir
StartupWMClass=jetbrains-rubymine
Actions=
Categories=Development;
```

---

### **Как узнать `StartupWMClass`?**

Параметр `StartupWMClass` помогает окружению рабочего стола правильно связать окно приложения с иконкой в док-панели.

Чтобы узнать значение `WM_CLASS` для вашего приложения, выполните следующие шаги:

1. **Запустите приложение** (в вашем случае RubyMine).

2. **Откройте терминал** и выполните команду:
   ```bash
   xprop | grep WM_CLASS
   ```
3. **Нажмите на окно приложения** (RubyMine), чтобы выбрать его.

4. **В терминале появится вывод**, например:
   ```
   WM_CLASS(STRING) = "jetbrains-rubymine", "jetbrains-rubymine"
   ```
   Здесь `"jetbrains-rubymine"` — это значение `WM_CLASS`, которое нужно использовать для `StartupWMClass`.

---


