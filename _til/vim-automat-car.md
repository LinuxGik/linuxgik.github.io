---
title: Автоматическое смещение каретки в Vim
date: 05.11.2026
---

Когда пишу на Free Pascal, ```.end``` автоматически не выравнивается. 

Было:
```fps
program hello;
begin
    writeln('Hello!')
    end. /* пробелы */
```
Настроил vim так, что теперь когда дописываю ```.end```, пробелы в этой строке убираются:
```fps
program hello;
begin
    writeln('Hello!')
end. /* пробелы убираются, после того как ввожу последний символ "точку" */
```

## Решение

1. Создать файл ```~/.vim/after/indent/pascal.vim```:
    Добавить в него
    ```vim
    setlocal indentkeys+=0=end.
   ```
2. В свой ```.vimrc``` добавить строчку: ```filetype plugin indent on```