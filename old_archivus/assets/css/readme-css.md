

## Порядок подключения

В &lt;head&gt; подключен `reset.css`, за ним `main.css`.

### В `main.css` подключены:
```
@import "colorVar/linuxgik-color-variable.css";
@import "font/font.css";
```

### В `linuxgik-color-variable.css` подключен:
```
@import "color-tail.css";
```

## Содержание файлов 
>Список в порядке подключения.
- `reset.css` - сбрасывает браузерные стили, и имеет те стили которые применяются всегда и везде.
- `color-tail.css` - переменные цветов из tailwindcss.
- `linuxgik-color-variable.css` - мои переменные с цветами.
- `fonts.css`- подключает шрифты.
- `main.css` - основной файл. Через него импортируются все остальные файлы с css. Содержит самое основное.

## Структура каталога `css`
- `colorVar/` - хранит файлы с переменными. Сейчас там только переменная с цветом.
- `fonts/` - каталог для шрифтов.