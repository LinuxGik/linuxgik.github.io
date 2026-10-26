Конечно. Если цель именно "открыть в Lynx во время установки и не думать", то я бы сделал максимально линейный чек-лист без вкладок, CSS, JavaScript и лишних пояснений.

Arch Linux UEFI + GRUB + ext4 (минимальный чек-лист)
1. Проверка загрузки в UEFI
   ls /sys/firmware/efi/efivars


Если каталог существует, значит загрузка выполнена через UEFI.

2. Интернет

Проводная сеть обычно работает автоматически.

Проверка:

ping -c 3 archlinux.org


Для Wi-Fi:

iwctl


Внутри:

device list
station wlan0 scan
station wlan0 get-networks
station wlan0 connect ИМЯ_СЕТИ
exit

3. Синхронизация времени
   timedatectl set-ntp true


Проверка:

timedatectl status

4. Определение диска
   lsblk


Например:

sda
или
nvme0n1


В примерах ниже используется:

/dev/sda

5. Разметка диска

Запускаем:

cfdisk /dev/sda


Создать GPT.

Разделы:

sda1    512M     EFI System
sda2    Остальное Linux filesystem


Записать изменения:

Write
Yes
Quit


Проверка:

lsblk

6. Форматирование

EFI:

mkfs.fat -F32 /dev/sda1


Root:

mkfs.ext4 -L ARCH /dev/sda2

7. Монтирование
   mount /dev/sda2 /mnt

mkdir -p /mnt/efi

mount /dev/sda1 /mnt/efi


Проверка:

mount | grep /mnt

8. Установка системы

Intel:

pacstrap /mnt \
base \
base-devel \
linux \
linux-headers \
linux-firmware \
intel-ucode \
grub \
efibootmgr \
dosfstools \
networkmanager \
nano \
vim


AMD:

pacstrap /mnt \
base \
base-devel \
linux \
linux-headers \
linux-firmware \
amd-ucode \
grub \
efibootmgr \
dosfstools \
networkmanager \
nano \
vim

9. fstab
   genfstab -U /mnt >> /mnt/etc/fstab


Проверка:

cat /mnt/etc/fstab

10. Переход в новую систему
    arch-chroot /mnt

11. Часовой пояс

Москва:

ln -sf /usr/share/zoneinfo/Europe/Moscow /etc/localtime


Синхронизация часов:

hwclock --systohc

12. Локаль

Редактируем:

nano /etc/locale.gen


Раскомментировать:

en_US.UTF-8 UTF-8
ru_RU.UTF-8 UTF-8


Сгенерировать:

locale-gen


Создать:

echo "LANG=ru_RU.UTF-8" > /etc/locale.conf

13. Консольная раскладка
    echo "KEYMAP=ru" > /etc/vconsole.conf

14. Имя компьютера
    echo "myarch" > /etc/hostname


Создать hosts:

cat >> /etc/hosts << EOF
127.0.0.1 localhost
::1 localhost
127.0.1.1 myarch.localdomain myarch
EOF

15. Пароль root
    passwd

16. Включение сети
    systemctl enable NetworkManager

17. Установка GRUB
    grub-install \
    --target=x86_64-efi \
    --efi-directory=/efi \
    --bootloader-id=GRUB


Создать конфигурацию:

grub-mkconfig -o /boot/grub/grub.cfg

18. Создание пользователя
    useradd -m -G wheel -s /bin/bash username


Пароль:

passwd username

19. Настройка sudo

Установить пакет:

pacman -S sudo


Открыть:

EDITOR=nano visudo


Раскомментировать:

%wheel ALL=(ALL:ALL) ALL

20. Выход
    exit

21. Размонтирование
    umount -R /mnt

22. Перезагрузка
    reboot


Извлечь флешку.

После первого входа

Обновление системы:

sudo pacman -Syu


Проверка EFI:

efibootmgr


Проверка дисков:

lsblk -f

Видеодрайверы
Intel
sudo pacman -S mesa

AMD
sudo pacman -S mesa vulkan-radeon

NVIDIA

Обычное ядро:

sudo pacman -S nvidia nvidia-utils


Несколько ядер или кастомное ядро:

sudo pacman -S nvidia-dkms nvidia-utils

Полезные команды

Свободное место:

df -h


Просмотр разделов:

lsblk


Просмотр логов текущей загрузки:

journalctl -b


Проверка сети:

ping archlinux.org


Я бы именно эту версию и использовал в Lynx. Она короче, не содержит декоративных элементов и позволяет пройти установку сверху вниз без прыжков между разделами. Это уже почти формат «распечатал и ставишь систему».